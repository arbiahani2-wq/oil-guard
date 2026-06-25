import rasterio
from shapely.geometry import Polygon
from typing import List, Tuple

def pixels_to_geo_polygons(pixel_polygons: List[Polygon], transform) -> List[Polygon]:
    """
    Converts a list of shapely Polygons in pixel coordinates (x, y) 
    to geographical coordinates (lon, lat) using the rasterio transform.
    """
    geo_polygons = []
    
    for poly in pixel_polygons:
        coords = []
        for x, y in poly.exterior.coords:
            lon, lat = rasterio.transform.xy(transform, y, x)
            coords.append((lon, lat))
            
        geo_poly = Polygon(coords)
        geo_polygons.append(geo_poly)
        
    return geo_polygons

def pixel_to_geo_point(y: float, x: float, transform) -> Tuple[float, float]:
    """
    Converts a single pixel point (y, x) to (lon, lat)
    """
    lon, lat = rasterio.transform.xy(transform, y, x)
    return lon, lat
