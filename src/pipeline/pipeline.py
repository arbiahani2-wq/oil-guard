import logging
import os
import matplotlib.pyplot as plt

from src.pipeline.types import PipelineResult, SpillPolygon
from src.inference.patching import load_and_patch_image
from src.inference.predictor import OilSpillPredictor
from src.inference.reconstruct import reconstruct_mask
from src.gis.polygons import extract_polygons_from_mask
from src.gis.coordinates import pixels_to_geo_polygons, pixel_to_geo_point
from src.gis.area import calculate_pixel_area_m2, calculate_geo_polygon_area_km2
from src.gis.geojson import export_spills_to_geojson
from src.ogim.loader import load_infrastructure_in_bbox
from src.ogim.search import find_nearest_infrastructures
from src.risk.scoring import evaluate_risk
from src.reports.json_report import generate_json_report
from src.reports.map_report import generate_map_report
from src.reports.pdf_report import generate_pdf_report
from src.weather.open_meteo import fetch_marine_weather
from src.gis.coastline import get_distance_to_coast

logger = logging.getLogger(__name__)

class OilSpillPipeline:
    def __init__(self, model_path: str, ogim_path: str, device: str = None):
        logger.info("Initializing Pipeline...")
        self.predictor = OilSpillPredictor(model_path=model_path, device=device)
        self.ogim_path = ogim_path

    def run(
        self, 
        image_path: str, 
        output_dir: str = "outputs", 
        confidence: float = 0.85, 
        min_area: float = 0.5,
        infra_critical: float = 2.0,
        infra_high: float = 5.0,
        infra_medium: float = 15.0,
        poll_critical: float = 50.0,
        poll_high: float = 10.0,
        poll_medium: float = 1.0,
        coast_critical: float = 5.0,
        coast_warning: float = 20.0
    ) -> PipelineResult:
        logger.info(f"Starting analysis for {image_path} with confidence={confidence}, min_area={min_area}")
        
        # 1. Patching
        logger.info("1. Patching image...")
        patches, coords, metadata = load_and_patch_image(image_path)
        
        # 2. Inference
        logger.info(f"2. Running inference on {len(patches)} patches...")
        pred_patches = self.predictor.predict_patches(patches, threshold=confidence)
        
        # 3. Reconstruction
        logger.info("3. Reconstructing mask...")
        mask_full = reconstruct_mask(pred_patches, coords, metadata.height, metadata.width)
        
        # Save Mask
        mask_path = os.path.join(output_dir, "masks", "mask.png")
        plt.imsave(mask_path, mask_full, cmap="gray")
        
        oil_pixels = int(mask_full.sum())
        logger.info(f"Detected {oil_pixels} oil pixels.")
        
        result = PipelineResult(
            image_path=image_path,
            oil_pixels=oil_pixels,
            total_area_km2=0.0,
            center_lon=0.0,
            center_lat=0.0,
            mask_path=mask_path
        )
        
        if oil_pixels > 0:
            # 4. GIS Processing
            logger.info("4. Extracting GIS features...")
            pixel_polygons = extract_polygons_from_mask(mask_full)
            geo_polygons = pixels_to_geo_polygons(pixel_polygons, metadata.transform)
            
            spill_polygons = []
            total_area = 0.0
            
            for g_poly in geo_polygons:
                area_km2 = calculate_geo_polygon_area_km2(g_poly)
                
                # Filter out small spills
                if area_km2 < min_area:
                    continue
                    
                # Compute centroid
                c_lon, c_lat = g_poly.centroid.x, g_poly.centroid.y
                
                spill_polygons.append(SpillPolygon(
                    polygon=g_poly,
                    area_km2=area_km2,
                    center_lon=c_lon,
                    center_lat=c_lat
                ))
                total_area += area_km2
                
            result.spill_polygons = spill_polygons
            result.total_area_km2 = total_area
            
            if spill_polygons:
                # Use the largest polygon for the primary center
                result.center_lon = spill_polygons[0].center_lon
                result.center_lat = spill_polygons[0].center_lat
                
            # Export GeoJSON
            geojson_path = os.path.join(output_dir, "geojson", "oil_spill.geojson")
            export_spills_to_geojson(spill_polygons, geojson_path)
            result.geojson_path = geojson_path
            
            # 5. OGIM Analysis
            logger.info("5. Performing OGIM infrastructure analysis...")
            # Bounding box for OGIM query: Add a padding of ~1 degree (approx 100km) around the image bounds
            pad = 1.0
            search_bbox = (
                metadata.bounds.left - pad,
                metadata.bounds.bottom - pad,
                metadata.bounds.right + pad,
                metadata.bounds.top + pad
            )
            
            ogim_gdf = load_infrastructure_in_bbox(self.ogim_path, search_bbox)
            nearest_inf = find_nearest_infrastructures(ogim_gdf, result.center_lon, result.center_lat)
            result.nearest_infrastructures = nearest_inf
            
            # 6. Risk Scoring & Ext Data
            logger.info("6. Fetching weather and calculating Risk Score...")
            
            # Fetch Weather
            weather = fetch_marine_weather(result.center_lat, result.center_lon)
            
            # Calculate Distance to Coast
            dist_coast_km = get_distance_to_coast(result.center_lon, result.center_lat)
            
            risk_report = evaluate_risk(
                total_area_km2=result.total_area_km2, 
                infrastructures=nearest_inf,
                wind_speed_kn=weather["wind_speed_kn"],
                wind_direction_deg=weather["wind_direction_deg"],
                distance_to_coast_km=dist_coast_km,
                infra_critical=infra_critical,
                infra_high=infra_high,
                infra_medium=infra_medium,
                poll_critical=poll_critical,
                poll_high=poll_high,
                poll_medium=poll_medium,
                coast_critical=coast_critical,
                coast_warning=coast_warning
            )
            result.risk_report = risk_report
        else:
            logger.info("No oil spill detected. Skipping GIS and OGIM analysis.")
            
        # 7. Reports Generation
        logger.info("7. Generating Reports...")
        
        # Generate map and PDF first so their paths are set before writing JSON
        map_path = os.path.join(output_dir, "maps", "spill_map.html")
        generate_map_report(result, map_path)
        
        pdf_path = os.path.join(output_dir, "reports", "report.pdf")
        generate_pdf_report(result, pdf_path)
        
        # Write JSON last so it includes the map/pdf paths
        json_path = os.path.join(output_dir, "reports", "report.json")
        generate_json_report(result, json_path)
        
        logger.info("Pipeline Execution Complete.")
        return result