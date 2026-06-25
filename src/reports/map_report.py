import folium
from src.pipeline.types import PipelineResult

def generate_map_report(result: PipelineResult, output_path: str):
    """
    Generates an HTML interactive map using Folium.
    Plots the spill center, spills GeoJSON, and nearby infrastructures.
    """
    if result.center_lat == 0 and result.center_lon == 0:
        # Default fallback if no spill found
        m = folium.Map(location=[0, 0], zoom_start=2)
    else:
        m = folium.Map(location=[result.center_lat, result.center_lon], zoom_start=10)
        
    # Add the spill polygons from the GeoJSON
    if result.geojson_path:
        folium.GeoJson(
            result.geojson_path,
            name="Oil Spill Detected",
            style_function=lambda x: {
                "fillColor": "red",
                "color": "darkred",
                "fillOpacity": 0.5,
                "weight": 2
            }
        ).add_to(m)
        
    # Add markers for nearest infrastructures
    for inf in result.nearest_infrastructures:
        color = "blue"
        if inf.fac_type.lower() == "well":
            color = "green"
            
        popup_text = f"""
        <b>{inf.name}</b><br>
        Type: {inf.fac_type}<br>
        Operator: {inf.operator}<br>
        Distance to Spill: {inf.distance_km:.2f} km
        """
        
        folium.Marker(
            [inf.latitude, inf.longitude],
            popup=folium.Popup(popup_text, max_width=300),
            tooltip=inf.name,
            icon=folium.Icon(color=color, icon="info-sign")
        ).add_to(m)
        
    m.save(output_path)
    result.map_report_path = output_path
