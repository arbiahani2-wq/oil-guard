import json
import dataclasses
from src.pipeline.types import PipelineResult

def generate_json_report(result: PipelineResult, output_path: str):
    """
    Serializes the PipelineResult (excluding raw paths and objects that are hard to serialize) into JSON.
    """
    # Create a serializable dictionary
    data = {
        "image_path": result.image_path,
        "total_area_km2": round(result.total_area_km2, 2),
        "center_lon": result.center_lon,
        "center_lat": result.center_lat,
        "risk_report": {
            "level": result.risk_report.level if result.risk_report else "UNKNOWN",
            "score": result.risk_report.score if result.risk_report else 0,
            "infrastructure_level": result.risk_report.infrastructure_level if result.risk_report else "UNKNOWN",
            "infrastructure_score": result.risk_report.infrastructure_score if result.risk_report else 0,
            "pollution_level": result.risk_report.pollution_level if result.risk_report else "UNKNOWN",
            "pollution_score": result.risk_report.pollution_score if result.risk_report else 0,
            "reasons": result.risk_report.reasons if result.risk_report else [],
            "wind_speed_kn": result.risk_report.wind_speed_kn if result.risk_report else 0.0,
            "wind_direction_deg": result.risk_report.wind_direction_deg if result.risk_report else 0.0,
            "distance_to_coast_km": result.risk_report.distance_to_coast_km if result.risk_report else 999.0,
            "cleanup_cost_usd": result.risk_report.cleanup_cost_usd if result.risk_report else 0.0,
            "estimated_drift_direction": result.risk_report.estimated_drift_direction if result.risk_report else "UNKNOWN"
        } if result.risk_report else None,
        "nearest_infrastructures": [
            {
                "name": inf.name,
                "type": inf.layer_type,
                "fac_type": inf.fac_type,
                "operator": inf.operator,
                "country": inf.country,
                "distance_km": round(inf.distance_km, 2),
                "latitude": inf.latitude,
                "longitude": inf.longitude
            } for inf in result.nearest_infrastructures
        ],
        "spill_polygons": [
            {
                "area_km2": round(sp.area_km2, 2),
                "center_lon": sp.center_lon,
                "center_lat": sp.center_lat
            } for sp in result.spill_polygons
        ],
        "outputs": {
            "mask_path": result.mask_path,
            "geojson_path": result.geojson_path,
            "pdf_report_path": result.pdf_report_path,
            "map_report_path": result.map_report_path
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
        
    result.json_report_path = output_path
