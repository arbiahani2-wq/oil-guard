"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useSettings } from "@/components/SettingsProvider";
import { API_URL } from "@/lib/config";

// Dynamically import react-leaflet components to prevent SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((mod) => mod.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), { ssr: false });

import { useMap } from "react-leaflet";

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
      map.invalidateSize();
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [center, zoom, map]);
  return null;
}

interface Infrastructure {
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distance_km: number;
}

interface LiveMapProps {
  centerLat?: number;
  centerLon?: number;
  geojsonUrl?: string;
  infrastructures?: Infrastructure[];
}

// Custom icons
const platformIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

const shipIcon = typeof window !== 'undefined' ? new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
}) : null;

export default function LiveMap({ centerLat = 35.5, centerLon = 34.8, geojsonUrl, infrastructures = [] }: LiveMapProps) {
  const { config } = useSettings();
  const [geoData, setGeoData] = useState<any>(null);
  const [layers, setLayers] = useState({ spill: true, platforms: true, ais: true });
  const [basemap, setBasemap] = useState<"normal" | "ocean" | "satellite" | "light">("normal");
  const [ships, setShips] = useState<any[]>([]);
  const [aisStatus, setAisStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");

  // Fetch GeoJSON
  useEffect(() => {
    if (geojsonUrl) {
      fetch(geojsonUrl)
        .then(res => res.json())
        .then(data => setGeoData(data))
        .catch(err => console.error("Failed to load geojson", err));
    }
  }, [geojsonUrl]);

  // Connect to live AIS stream from aisstream.io
  useEffect(() => {
    if (!centerLat || !centerLon || !layers.ais) {
      setAisStatus("disconnected");
      return;
    }

    const key = config.aisApiKey || "d90155fc9c93079b5e5cb8565c4b75b994312fb4";
    if (!key) {
      setAisStatus("error");
      return;
    }

    setAisStatus("connecting");

    let ws: WebSocket | null = null;
    let activeShips: { [mmsi: string]: any } = {};

    try {
      const wsUrl = API_URL.replace(/^http/, "ws") + "/ws/ais";
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        setAisStatus("connected");
        // Define bounding box around spill center (+/- 0.35 degrees, approx 35km radius)
        const latMin = centerLat - 0.35;
        const latMax = centerLat + 0.35;
        const lonMin = centerLon - 0.35;
        const lonMax = centerLon + 0.35;

        const subMsg = {
          APIKey: key,
          BoundingBoxes: [[[latMin, lonMin], [latMax, lonMax]]],
          FilterMessageTypes: ["PositionReport", "ShipStaticData"]
        };

        ws?.send(JSON.stringify(subMsg));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          
          // Handle backend proxy error messages (like HTTP 429)
          if (msg.error) {
            if (msg.error === "simulated") {
              console.warn("AIS proxy info:", msg.message);
              setAisStatus("connected");
              return;
            }
            console.warn("AIS stream proxy error:", msg.message);
            setAisStatus("error");
            return;
          }

          const mmsi = msg.MetaData?.MMSI;
          if (!mmsi) return;

          if (msg.MessageType === "PositionReport") {
            const pos = msg.Message.PositionReport;
            activeShips[mmsi] = {
              ...activeShips[mmsi],
              id: `mmsi-${mmsi}`,
              mmsi: mmsi,
              lat: pos.Latitude,
              lon: pos.Longitude,
              speed: (pos.Sog || 0).toFixed(1),
              heading: pos.TrueHeading || pos.Cog || 0,
              status: pos.NavigationalStatus || "Unknown",
              timestamp: msg.MetaData.Time_UTC
            };
            setShips(Object.values(activeShips));
          } else if (msg.MessageType === "ShipStaticData") {
            const staticData = msg.Message.ShipStaticData;
            const cleanName = (staticData.Name || "").trim();
            if (cleanName) {
              activeShips[mmsi] = {
                ...activeShips[mmsi],
                name: cleanName,
                shipType: staticData.ShipType || "Unknown"
              };
              setShips(Object.values(activeShips));
            }
          }
        } catch (err) {
          console.warn("Error parsing AIS WebSocket message", err);
        }
      };

      ws.onerror = (err) => {
        console.warn("AIS WebSocket error", err);
        setAisStatus("error");
      };

      ws.onclose = () => {
        setAisStatus("disconnected");
      };
    } catch (e) {
      console.error("Failed to initialize AIS WebSocket", e);
      setAisStatus("error");
    }

    return () => {
      if (ws) {
        ws.close();
      }
      setShips([]);
    };
  }, [centerLat, centerLon, layers.ais, config.aisApiKey]);

  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers(prev => ({ ...prev, [layer]: !prev[layer] }));
  };

  // GeoJSON style
  const spillStyle = {
    color: "#ff003c",
    weight: 2,
    fillColor: "#ff003c",
    fillOpacity: 0.3
  };

  // Only render map on client
  if (typeof window === 'undefined') return null;

  return (
    <div className="glass-card" style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 420 }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "absolute",
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        background: "var(--hull)",
        backdropFilter: "blur(10px)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--biolum)", boxShadow: "0 0 6px var(--biolum)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>Detection Map</span>
          {layers.ais && (
            <span style={{ 
              fontSize: 10, 
              padding: "2px 6px", 
              borderRadius: 3, 
              fontFamily: "monospace",
              marginLeft: 8,
              background: aisStatus === "connected" ? "rgba(0, 230, 118, 0.1)" : aisStatus === "connecting" ? "rgba(255, 193, 7, 0.1)" : "rgba(255, 61, 96, 0.1)",
              color: aisStatus === "connected" ? "var(--safe)" : aisStatus === "connecting" ? "var(--amber)" : "var(--plasma)",
              border: `1px solid ${aisStatus === "connected" ? "rgba(0, 230, 118, 0.2)" : aisStatus === "connecting" ? "rgba(255, 193, 7, 0.2)" : "rgba(255, 61, 96, 0.2)"}`
            }}>
              AIS: {aisStatus.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { id: "spill", label: "Spill Zone", activeColor: "#ff003c", activeBg: "rgba(255, 0, 60, 0.12)", activeBorder: "rgba(255, 0, 60, 0.4)" },
            { id: "platforms", label: "Platforms", activeColor: "var(--amber)", activeBg: "rgba(255, 193, 7, 0.12)", activeBorder: "rgba(255, 193, 7, 0.4)" },
            { id: "ais", label: "AIS Vessels (Realtime)", activeColor: "var(--safe)", activeBg: "rgba(0, 230, 118, 0.12)", activeBorder: "rgba(0, 230, 118, 0.4)" }
          ].map((layer) => {
            const isActive = layers[layer.id as keyof typeof layers];
            return (
              <span 
                key={layer.id} 
                onClick={() => toggleLayer(layer.id as any)}
                style={{
                  fontSize: 11,
                  padding: "5px 10px",
                  borderRadius: 4,
                  background: isActive ? layer.activeBg : "var(--sonar)",
                  border: `1px solid ${isActive ? layer.activeBorder : "var(--border)"}`,
                  color: isActive ? layer.activeColor : "var(--text-mid)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontWeight: 600
                }}
              >
                <span style={{ 
                  width: 6, 
                  height: 6, 
                  borderRadius: "50%", 
                  background: isActive ? layer.activeColor : "var(--text-lo)",
                  display: "inline-block",
                  transition: "background-color 0.2s"
                }} />
                {layer.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Map content */}
      <div style={{ width: "100%", height: "100%", marginTop: 45, position: "relative" }}>
        <MapContainer 
          center={[centerLat, centerLon]} 
          zoom={10} 
          style={{ width: "100%", height: "calc(100% - 45px)", background: basemap === "light" || basemap === "normal" ? "#f4f6f9" : "#0a101e" }}
          zoomControl={false}
        >
          <MapUpdater center={[centerLat, centerLon]} zoom={10} />
          {/* Normal/Standard Basemap (Default) */}
          {basemap === "normal" && (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
          )}

          {/* Oceanic Basemap */}
          {basemap === "ocean" && (
            <>
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, IHO, NGS'
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Reference/MapServer/tile/{z}/{y}/{x}"
                attribution='Sources: GEBCO, NOAA, National Geographic, Esri'
              />
            </>
          )}

          {/* Satellite Basemap */}
          {basemap === "satellite" && (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            />
          )}

          {/* Light Basemap */}
          {basemap === "light" && (
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
          )}

          {/* Spill GeoJSON */}
          {layers.spill && geoData && (
            <GeoJSON data={geoData} style={spillStyle} />
          )}

          {/* Infrastructure Platforms */}
          {layers.platforms && infrastructures.map((inf, idx) => (
            <Marker key={`inf-${idx}`} position={[inf.latitude, inf.longitude]} icon={platformIcon as L.Icon}>
              <Popup>
                <div style={{ color: "#000" }}>
                  <strong>{inf.name}</strong><br/>
                  Type: {inf.type}<br/>
                  Distance to spill: {inf.distance_km} km
                </div>
              </Popup>
            </Marker>
          ))}

          {/* AIS Ships */}
          {layers.ais && ships.map((ship) => (
            <Marker key={ship.id} position={[ship.lat, ship.lon]} icon={shipIcon as L.Icon}>
              <Popup>
                <div style={{ color: "#000" }}>
                  <strong>{ship.name || `MMSI: ${ship.mmsi}`}</strong><br/>
                  Speed: {ship.speed} kn<br/>
                  Heading: {typeof ship.heading === 'number' ? ship.heading.toFixed(0) : ship.heading}°<br/>
                  Status: {ship.status || "Unknown"}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Basemap Selector */}
        <div style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          background: "var(--hull)",
          border: "1px solid var(--border-hi)",
          padding: "6px 8px",
          borderRadius: 6,
          backdropFilter: "blur(10px)",
          boxShadow: "var(--shadow-card)"
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: "var(--text-lo)", fontFamily: "monospace", letterSpacing: "0.08em", marginBottom: 2 }}>MAP THEME</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { id: "normal", label: "Normal Map" },
              { id: "ocean", label: "Ocean Blue" },
              { id: "satellite", label: "Satellite" },
              { id: "light", label: "Light Map" }
            ].map((b) => (
              <button
                key={b.id}
                onClick={() => setBasemap(b.id as any)}
                style={{
                  fontSize: 10,
                  padding: "4px 8px",
                  borderRadius: 4,
                  border: "1px solid",
                  borderColor: basemap === b.id ? "var(--biolum)" : "var(--border)",
                  background: basemap === b.id ? "var(--biolum-mid)" : "var(--sonar)",
                  color: basemap === b.id ? "var(--biolum)" : "var(--text-mid)",
                  cursor: "pointer",
                  fontWeight: 600,
                  transition: "all 0.2s"
                }}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
