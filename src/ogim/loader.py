import geopandas as gpd
import logging

logger = logging.getLogger(__name__)

def load_infrastructure_in_bbox(gpkg_path: str, bbox: tuple) -> gpd.GeoDataFrame:
    """
    Loads relevant OGIM infrastructure data (Platforms and Wells) within a bounding box.
    bbox: (minx, miny, maxx, maxy) -> (min_lon, min_lat, max_lon, max_lat)
    """
    logger.info(f"Loading OGIM data within bbox: {bbox}")
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

    # We could merge points (platforms and wells) if needed, 
    # but for simplicity, let's just combine the point data.
    # We will standardize columns we care about: FAC_NAME, COUNTRY, FAC_TYPE, OPERATOR, LATITUDE, LONGITUDE
    
    combined_data = []
    
    def extract_rows(gdf, layer_type):
        if gdf.empty: return
        for _, row in gdf.iterrows():
            # Handle possible missing columns gracefully
            lat = row.get("LATITUDE") or (row.geometry.y if row.geometry else None)
            lon = row.get("LONGITUDE") or (row.geometry.x if row.geometry else None)
            
            if lat is None or lon is None:
                continue
                
            combined_data.append({
                "FAC_NAME": row.get("FAC_NAME", "Unknown"),
                "COUNTRY": row.get("COUNTRY", "Unknown"),
                "FAC_TYPE": row.get("FAC_TYPE", layer_type),
                "LAYER_TYPE": layer_type,  # Categorical: "Platform" or "Well"
                "OPERATOR": row.get("OPERATOR", "Unknown"),
                "LATITUDE": lat,
                "LONGITUDE": lon,
                "geometry": row.geometry
            })

    extract_rows(platforms, "Platform")
    extract_rows(wells, "Well")
    
    # We can also include pipelines but they are LineStrings. We might approximate distance to lines differently
    # For now, let's just stick to points (platforms and wells) to match the notebook.
    
    if not combined_data:
        return gpd.GeoDataFrame(columns=["FAC_NAME", "COUNTRY", "FAC_TYPE", "LAYER_TYPE", "OPERATOR", "LATITUDE", "LONGITUDE", "geometry"], crs="EPSG:4326")
        
    gdf = gpd.GeoDataFrame(combined_data, crs="EPSG:4326")
    return gdf