import os
import json
import folium
from folium import plugins
from src.ogim.loader import load_infrastructure_in_bbox

def generate_ogim_mediterranean_map():
    # Eastern Mediterranean Bounding Box
    bbox = (10.0, 30.0, 36.0, 40.0)
    
    ogim_path = r"data/ogim/OGIM_v2.7.gpkg"
    if not os.path.exists(ogim_path):
        fallback_ogim = r"data\ogim\OGIM_v2.7.gpkg"
        if os.path.exists(fallback_ogim):
            ogim_path = fallback_ogim
        else:
            print(f"Warning: OGIM database not found at {ogim_path}")
    
    print("Loading OGIM data for the Mediterranean Sea...")
    gdf = load_infrastructure_in_bbox(ogim_path, bbox)
    print(f"Loaded {len(gdf)} infrastructure points.")
    
    # Save to JSON for the frontend
    points_json = []
    for _, row in gdf.iterrows():
        points_json.append({
            "name": row.get("FAC_NAME", "Unknown"),
            "type": row.get("FAC_TYPE", "Unknown"),
            "operator": row.get("OPERATOR", "Unknown"),
            "lat": row["LATITUDE"],
            "lon": row["LONGITUDE"]
        })
    
    os.makedirs("outputs/maps", exist_ok=True)
    with open("outputs/maps/ogim_mediterranean.json", "w", encoding="utf-8") as f:
        json.dump(points_json, f)
        
    print("Saved points to JSON.")
    
    # Initialize Map
    m = folium.Map(location=[34.0, 25.0], zoom_start=6, tiles="CartoDB dark_matter")
    
    plugins.Fullscreen().add_to(m)
    
    marker_cluster = plugins.MarkerCluster(name="OGIM Infrastructure").add_to(m)
    
    for pt in points_json:
        color = "red" if pt["type"] == "Platform" else "cyan" if pt["type"] == "Well" else "gray"
        
        popup_html = f"""
        <div style="font-family: Arial; min-width: 200px;">
            <h4 style="color: #333; margin-bottom: 5px;">{pt['name']}</h4>
            <b>Type:</b> {pt['type']}<br>
            <b>Operator:</b> {pt['operator']}<br>
            <b>Coords:</b> {pt['lat']:.4f}, {pt['lon']:.4f}
        </div>
        """
        
        folium.CircleMarker(
            location=[pt["lat"], pt["lon"]],
            radius=6 if pt["type"] == "Platform" else 4,
            color=color,
            fill=True,
            fillColor=color,
            fillOpacity=0.7,
            popup=folium.Popup(popup_html, max_width=300),
            tooltip=f"{pt['name']} ({pt['type']})"
        ).add_to(marker_cluster)

    # Inject postMessage listener
    custom_script = """
    <script>
    window.addEventListener('message', function(event) {
        if (event.data && event.data.lat && event.data.lon) {
            // Find folium map object
            for (let key in window) {
                if (key.startsWith('map_') && window[key].setView) {
                    window[key].setView([event.data.lat, event.data.lon], 12);
                    break;
                }
            }
        }
    });
    </script>
    """
    m.get_root().html.add_child(folium.Element(custom_script))

    # Save
    out_path = "outputs/maps/ogim_mediterranean.html"
    m.save(out_path)
    print(f"Map saved to {out_path}")

if __name__ == "__main__":
    generate_ogim_mediterranean_map()
