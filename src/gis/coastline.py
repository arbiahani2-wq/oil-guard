import geopandas as gpd
from shapely.geometry import Point
import logging

logger = logging.getLogger(__name__)

# Cache the coastline globally
_coastline = None

def get_distance_to_coast(lon: float, lat: float) -> float:
    """
    Calculates the approximate distance from a point to the nearest landmass/coastline in km.
    """
    global _coastline
    try:
        if _coastline is None:
            try:
                path = gpd.datasets.get_path('naturalearth_lowres')
                world = gpd.read_file(path)
            except Exception:
                # Fallback for GeoPandas 1.0+
                url = "https://naciscdn.org/naturalearth/110m/cultural/ne_110m_admin_0_countries.zip"
                world = gpd.read_file(url)
            
            # Combine all polygons into a single geometry for distance calculation
            _coastline = world.geometry.unary_union
            
        point = Point(lon, lat)
        
        # Calculate distance in degrees
        distance_deg = _coastline.distance(point)
        
        # Convert degrees to km (rough approximation: 1 deg ~ 111 km)
        distance_km = distance_deg * 111.0
        return distance_km
    except Exception as e:
        logger.error(f"Failed to calculate distance to coast: {e}")
        return 999.0
