import geopandas as gpd
from pyproj import Geod
from typing import List
from src.pipeline.types import InfrastructureData

def find_nearest_infrastructures(gdf: gpd.GeoDataFrame, spill_lon: float, spill_lat: float, top_k: int = 5) -> List[InfrastructureData]:
    """
    Computes geodesic distance to all features in gdf and returns the top_k nearest.
    """
    if gdf.empty:
        return []
        
    geod = Geod(ellps="WGS84")
    
    distances_km = []
    
    for _, row in gdf.iterrows():
        # Get point coordinates. If geometry is not Point, we can use centroid.
        # But loader already guarantees LATITUDE/LONGITUDE columns are populated
        lon = row["LONGITUDE"]
        lat = row["LATITUDE"]
        
        _, _, dist_m = geod.inv(spill_lon, spill_lat, lon, lat)
        distances_km.append(dist_m / 1000.0)
        
    gdf["DISTANCE_KM"] = distances_km
    nearest = gdf.sort_values("DISTANCE_KM").head(top_k)
    
    results = []
    for _, row in nearest.iterrows():
        results.append(InfrastructureData(
            name=row["FAC_NAME"],
            country=row["COUNTRY"],
            fac_type=row["FAC_TYPE"],
            layer_type=row.get("LAYER_TYPE", "Platform"),
            operator=row["OPERATOR"],
            distance_km=row["DISTANCE_KM"],
            latitude=row["LATITUDE"],
            longitude=row["LONGITUDE"]
        ))
        
    return results