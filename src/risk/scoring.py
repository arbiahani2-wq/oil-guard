from typing import List
from src.pipeline.types import RiskReport, InfrastructureData

def get_compass_direction(degrees: float) -> str:
    """Convert degrees (0-360) to compass direction."""
    dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
    ix = int((degrees + 11.25) / 22.5)
    return dirs[ix % 16]

def evaluate_risk(
    total_area_km2: float, 
    infrastructures: List[InfrastructureData],
    wind_speed_kn: float = 0.0,
    wind_direction_deg: float = 0.0,
    distance_to_coast_km: float = 999.0,
    infra_critical: float = 2.0,
    infra_high: float = 5.0,
    infra_medium: float = 15.0,
    poll_critical: float = 50.0,
    poll_high: float = 10.0,
    poll_medium: float = 1.0,
    coast_critical: float = 5.0,
    coast_warning: float = 20.0
) -> RiskReport:
    """
    Evaluates the risk level based on the spill surface, distance to nearest infrastructures,
    wind, and distance to coast. Also calculates estimated cleanup cost.
    """
    min_dist = min([inf.distance_km for inf in infrastructures]) if infrastructures else float('inf')
    
    reasons = []
    
    # 1. Evaluate Pollution Risk based on area
    if total_area_km2 > poll_critical:
        pol_level, pol_score = "CRITICAL", 40
        reasons.append(f"POLLUTION CRITICAL: Massive spill area (>{poll_critical:.1f} km²).")
    elif total_area_km2 > poll_high:
        pol_level, pol_score = "HIGH", 30
        reasons.append(f"POLLUTION HIGH: Large spill area (>{poll_high:.1f} km²).")
    elif total_area_km2 > poll_medium:
        pol_level, pol_score = "MEDIUM", 20
        reasons.append(f"POLLUTION MEDIUM: Moderate spill area (>{poll_medium:.1f} km²).")
    else:
        pol_level, pol_score = "LOW", 10
        reasons.append(f"POLLUTION LOW: Small spill area ({total_area_km2:.2f} km², threshold: <={poll_medium:.1f} km²).")
        
    # 2. Evaluate Infrastructure Risk based on distance
    if not infrastructures:
        inf_level, inf_score = "LOW", 10
        reasons.append("INFRASTRUCTURE LOW: No known infrastructure in the vicinity.")
    elif min_dist < infra_critical:
        inf_level, inf_score = "CRITICAL", 40
        reasons.append(f"INFRASTRUCTURE CRITICAL: Extreme proximity to infrastructure ({min_dist:.2f} km, threshold: <{infra_critical:.1f} km).")
    elif min_dist < infra_high:
        inf_level, inf_score = "HIGH", 30
        reasons.append(f"INFRASTRUCTURE HIGH: Very close to infrastructure ({min_dist:.2f} km, threshold: <{infra_high:.1f} km).")
    elif min_dist < infra_medium:
        inf_level, inf_score = "MEDIUM", 20
        reasons.append(f"INFRASTRUCTURE MEDIUM: Relatively close to infrastructure ({min_dist:.2f} km, threshold: <{infra_medium:.1f} km).")
    else:
        inf_level, inf_score = "LOW", 10
        reasons.append(f"INFRASTRUCTURE LOW: Nearest infrastructure is far ({min_dist:.2f} km, threshold: >={infra_medium:.1f} km).")

    # 3. Coastal Risk Penalty
    coast_penalty = 0
    if distance_to_coast_km < coast_critical:
        coast_penalty = 20
        reasons.append(f"COASTAL CRITICAL: Spill is dangerously close to shore ({distance_to_coast_km:.1f} km, threshold: <{coast_critical:.1f} km).")
    elif distance_to_coast_km < coast_warning:
        coast_penalty = 10
        reasons.append(f"COASTAL WARNING: Spill is approaching shoreline ({distance_to_coast_km:.1f} km, threshold: <{coast_warning:.1f} km).")

    # Overall Risk Score (0-100 scale)
    overall_score = max(pol_score, inf_score) + coast_penalty
    overall_score = min(100, max(0, overall_score)) # Clamp to 0-100
    
    if overall_score >= 80:
        overall_level = "CRITICAL"
    elif overall_score >= 60:
        overall_level = "HIGH"
    elif overall_score >= 40:
        overall_level = "MEDIUM"
    else:
        overall_level = "LOW"

    # 4. Calculate estimated drift
    drift_direction = get_compass_direction(wind_direction_deg) if wind_speed_kn > 0 else "NONE"

    # 5. Calculate Cleanup Cost
    # Assume base cost of $50,000 per km2
    base_cost = total_area_km2 * 50000
    # Add multiplier for coastal proximity (harder to clean)
    multiplier = 1.0
    if distance_to_coast_km < 10.0:
        multiplier = 2.5
    elif distance_to_coast_km < 30.0:
        multiplier = 1.5
        
    cleanup_cost_usd = base_cost * multiplier

    return RiskReport(
        level=overall_level,
        score=overall_score,
        infrastructure_level=inf_level,
        infrastructure_score=inf_score,
        pollution_level=pol_level,
        pollution_score=pol_score,
        reasons=reasons,
        wind_speed_kn=wind_speed_kn,
        wind_direction_deg=wind_direction_deg,
        distance_to_coast_km=distance_to_coast_km,
        cleanup_cost_usd=cleanup_cost_usd,
        estimated_drift_direction=drift_direction
    )