from pyproj import Geod
from shapely.geometry import Polygon

def calculate_pixel_area_m2(pixel_deg: float, lon: float, lat: float) -> float:
    """
    Approximates the real-world area in square meters of a single pixel 
    at a given latitude/longitude.
    """
    geod = Geod(ellps="WGS84")
    
    # Calculate width
    _, _, width_m = geod.inv(lon, lat, lon + pixel_deg, lat)
    
    # Calculate height
    _, _, height_m = geod.inv(lon, lat, lon, lat - pixel_deg)
    
    return width_m * height_m

def calculate_geo_polygon_area_km2(geo_poly: Polygon) -> float:
    """
    Calculates the area in km2 of a geographic polygon (lon, lat coordinates).
    """
    geod = Geod(ellps="WGS84")
    # Returns (poly_area, poly_perimeter)
    area, _ = geod.geometry_area_perimeter(geo_poly)
    
    # area can be negative depending on vertex winding order
    area_m2 = abs(area)
    
    return area_m2 / 1e6