import geopandas as gpd
from typing import List
from src.pipeline.types import SpillPolygon

def export_spills_to_geojson(spill_polygons: List[SpillPolygon], output_path: str):
    """
    Exports a list of SpillPolygon objects to a GeoJSON file.
    """
    if not spill_polygons:
        # Create empty GeoDataFrame if no spills
        gdf = gpd.GeoDataFrame(columns=["area_km2", "center_lon", "center_lat", "geometry"], crs="EPSG:4326")
    else:
        data = []
        geometries = []
        
        for sp in spill_polygons:
            data.append({
                "area_km2": sp.area_km2,
                "center_lon": sp.center_lon,
                "center_lat": sp.center_lat
            })
            geometries.append(sp.polygon)
            
        gdf = gpd.GeoDataFrame(data, geometry=geometries, crs="EPSG:4326")
        
    gdf.to_file(output_path, driver="GeoJSON")