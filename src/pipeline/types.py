from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple
import numpy as np

@dataclass
class ImageMetadata:
    width: int
    height: int
    transform: Any
    crs: Any
    bounds: Any
    pixel_deg: float

@dataclass
class SpillPolygon:
    polygon: Any # shapely.geometry.Polygon
    area_km2: float
    center_lon: float
    center_lat: float

@dataclass
class InfrastructureData:
    name: str
    country: str
    fac_type: str
    layer_type: str  # Categorical: "Platform" or "Well"
    operator: str
    distance_km: float
    latitude: float
    longitude: float

@dataclass
class RiskReport:
    level: str
    score: int
    infrastructure_level: str
    infrastructure_score: int
    pollution_level: str
    pollution_score: int
    reasons: List[str]
    wind_speed_kn: float = 0.0
    wind_direction_deg: float = 0.0
    distance_to_coast_km: float = 999.0
    cleanup_cost_usd: float = 0.0
    estimated_drift_direction: str = "UNKNOWN"

@dataclass
class PipelineResult:
    image_path: str
    oil_pixels: int
    total_area_km2: float
    center_lon: float
    center_lat: float
    spill_polygons: List[SpillPolygon] = field(default_factory=list)
    nearest_infrastructures: List[InfrastructureData] = field(default_factory=list)
    risk_report: RiskReport = None
    mask_path: str = ""
    geojson_path: str = ""
    json_report_path: str = ""
    pdf_report_path: str = ""
    map_report_path: str = ""
