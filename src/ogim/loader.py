import geopandas as gpd
import logging

logger = logging.getLogger(__name__)

def load_infrastructure_in_bbox(gpkg_path: str, bbox: tuple) -> gpd.GeoDataFrame:
    """
    Loads relevant OGIM infrastructure data (Platforms and Wells) within a bounding box.
    bbox: (minx, miny, maxx, maxy) -> (min_lon, min_lat, max_lon, max_lat)
    """
    logger.info(f"Loading OGIM data within bbox: {bbox}")
    
    # Check if the path is the lightweight CSV format
    if gpkg_path.endswith('.csv.gz') or gpkg_path.endswith('.csv'):
        import pandas as pd
        logger.info(f"Loading lightweight text database from {gpkg_path}")
        try:
            df = pd.read_csv(gpkg_path)
            # Filter by bounding box
            df_filtered = df[(df['lon'] >= bbox[0]) & (df['lon'] <= bbox[2]) & 
                             (df['lat'] >= bbox[1]) & (df['lat'] <= bbox[3])]
            
            combined_data = []
            for _, row in df_filtered.iterrows():
                from shapely.geometry import Point
                combined_data.append({
                    "FAC_NAME": "Unknown",
                    "COUNTRY": row.get("COUNTRY", "Unknown"),
                    "FAC_TYPE": row.get("FAC_TYPE", "Unknown"),
                    "LAYER_TYPE": "Platform" if str(row.get("FAC_TYPE")).lower() in ["platform", "facility"] else "Well",
                    "OPERATOR": row.get("OPERATOR", "Unknown"),
                    "LATITUDE": float(row['lat']),
                    "LONGITUDE": float(row['lon']),
                    "geometry": Point(float(row['lon']), float(row['lat']))
                })
            if not combined_data:
                return gpd.GeoDataFrame(columns=["FAC_NAME", "COUNTRY", "FAC_TYPE", "LAYER_TYPE", "OPERATOR", "LATITUDE", "LONGITUDE", "geometry"], crs="EPSG:4326")
            return gpd.GeoDataFrame(combined_data, crs="EPSG:4326")
        except Exception as e:
            logger.warning(f"Failed to load lightweight CSV {gpkg_path}: {e}")
            return gpd.GeoDataFrame(columns=["FAC_NAME", "COUNTRY", "FAC_TYPE", "LAYER_TYPE", "OPERATOR", "LATITUDE", "LONGITUDE", "geometry"], crs="EPSG:4326")

    # Original GPKG logic
    try:
        platforms = gpd.read_file(gpkg_path, layer="Offshore_Platforms", bbox=bbox)
    except Exception as e:
        logger.warning(f"Failed to load Offshore_Platforms: {e}")
        platforms = gpd.GeoDataFrame()
        
    try:
        wells = gpd.read_file(gpkg_path, layer="Oil_and_Natural_Gas_Wells", bbox=bbox)
    except Exception as e:
        logger.warning(f"Failed to load Oil_and_Natural_Gas_Wells: {e}")
        wells = gpd.GeoDataFrame()
        
    try:
        pipelines = gpd.read_file(gpkg_path, layer="Oil_Natural_Gas_Pipelines", bbox=bbox)
    except Exception as e:
        logger.warning(f"Failed to load Oil_Natural_Gas_Pipelines: {e}")
        pipelines = gpd.GeoDataFrame()

    combined_data = []
    
    def extract_rows(gdf, layer_type):
        if gdf.empty: return
        for _, row in gdf.iterrows():
            lat = row.get("LATITUDE") or (row.geometry.y if row.geometry else None)
            lon = row.get("LONGITUDE") or (row.geometry.x if row.geometry else None)
            
            if lat is None or lon is None:
                continue
                
            combined_data.append({
                "FAC_NAME": row.get("FAC_NAME", "Unknown"),
                "COUNTRY": row.get("COUNTRY", "Unknown"),
                "FAC_TYPE": row.get("FAC_TYPE", layer_type),
                "LAYER_TYPE": layer_type,
                "OPERATOR": row.get("OPERATOR", "Unknown"),
                "LATITUDE": lat,
                "LONGITUDE": lon,
                "geometry": row.geometry
            })

    extract_rows(platforms, "Platform")
    extract_rows(wells, "Well")
    
    if not combined_data:
        return gpd.GeoDataFrame(columns=["FAC_NAME", "COUNTRY", "FAC_TYPE", "LAYER_TYPE", "OPERATOR", "LATITUDE", "LONGITUDE", "geometry"], crs="EPSG:4326")
        
    return gpd.GeoDataFrame(combined_data, crs="EPSG:4326")