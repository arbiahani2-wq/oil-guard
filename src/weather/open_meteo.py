import requests
import logging

logger = logging.getLogger(__name__)

def fetch_marine_weather(lat: float, lon: float):
    """
    Fetches real-time marine weather (wind speed and direction) from Open-Meteo.
    """
    try:
        # Open-Meteo API for marine weather (current conditions)
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "wind_speed_10m,wind_direction_10m",
            "wind_speed_unit": "kn"  # Knots are standard for marine
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        current = data.get("current", {})
        wind_speed_kn = current.get("wind_speed_10m", 0.0)
        wind_direction_deg = current.get("wind_direction_10m", 0.0)
        
        return {
            "wind_speed_kn": float(wind_speed_kn),
            "wind_direction_deg": float(wind_direction_deg)
        }
    except Exception as e:
        logger.error(f"Failed to fetch marine weather from Open-Meteo: {e}")
        return {
            "wind_speed_kn": 0.0,
            "wind_direction_deg": 0.0
        }
