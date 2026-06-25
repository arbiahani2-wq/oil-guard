"use client";

import { useEffect, useState } from "react";
import MetricCard from "@/components/MetricCard";
import AlertCard from "@/components/AlertCard";
import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });
import { AlertTriangle, Waves, Building2, Map, Loader2, ArrowRight, ShieldAlert, Crosshair, DollarSign, Wind, Ship } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { API_URL } from "@/lib/config";
import Link from "next/link";
import { useSettings } from "@/components/SettingsProvider";

const CustomTooltip = ({ active, payload, label }: any) => {
  const { formatArea } = useSettings();
  if (active && payload?.length) {
    const formatted = formatArea(payload[0].value);
    return (
      <div className="glass-card" style={{ padding: "8px 14px", border: "1px solid var(--wire-strong)" }}>
        <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: "0.08em" }}>{label}</div>
        <div className="font-mono" style={{ fontSize: 14, color: "var(--biolum)", marginTop: 2 }}>
          {formatted.value} {formatted.unit}
        </div>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { formatArea, config } = useSettings();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`${API_URL}/reports`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setReports(data);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, []);

  const latestReport = reports.length > 0 ? reports[0] : null;
  const riskReport = latestReport?.risk_report || {};

  const totalAnalyzed = reports.length;
  const criticalCount = reports.filter(r => r?.risk_report?.level === "CRITICAL").length;
  const highCount     = reports.filter(r => r?.risk_report?.level === "HIGH").length;
  const activeAlerts  = criticalCount + highCount;
  
  const currentAreaKm2 = latestReport?.total_area_km2 || 0;
  const formattedCurrentArea = formatArea(currentAreaKm2);
  
  const cleanupCost = riskReport.cleanup_cost_usd || 0;
  const formattedCost = cleanupCost > 1000000 ? `$${(cleanupCost / 1000000).toFixed(1)}M` : `$${(cleanupCost / 1000).toFixed(0)}K`;

  const nearestInfraName = latestReport?.nearest_infrastructures?.[0]?.name || "None";
  const nearestInfraDist = latestReport?.nearest_infrastructures?.[0]?.distance_km != null ? Number(latestReport.nearest_infrastructures[0].distance_km).toFixed(1) : "--";

  const TREND_DATA = reports.slice(0, 8).reverse().map((r, i) => ({
    day: `#${String(i + 1).padStart(2, "0")}`,
    area: r.total_area_km2 || 0,
  }));
  if (TREND_DATA.length === 0) TREND_DATA.push({ day: "N/A", area: 0 });

  const ALERTS = reports.slice(0, 3).map(r => ({
    id: r.id,
    riskLevel: r?.risk_report?.level || "LOW",
    areakm2: r.total_area_km2 || 0,
    lat: r.center_lat || 0,
    lon: r.center_lon || 0,
    timestamp: (() => {
      try {
        return new Date(
          parseInt(r.id.substring(0,4)), parseInt(r.id.substring(4,6))-1,
          parseInt(r.id.substring(6,8)), parseInt(r.id.substring(9,11)),
          parseInt(r.id.substring(11,13)), parseInt(r.id.substring(13,15))
        ).toISOString();
      } catch { return r.id; }
    })(),
    nearestInfra: r.nearest_infrastructures?.[0]?.name || "Unknown",
    distanceKm: r.nearest_infrastructures?.[0]?.distance_km ?? 999,
  }));

  const RISK_ACCENT: Record<string, string> = {
    CRITICAL: "var(--plasma)", HIGH: "var(--ember)", MEDIUM: "var(--amber)", LOW: "var(--safe)", "N/A": "var(--text-lo)",
  };

  const riskScore = riskReport.score || 0;
  const riskColor = riskScore > 80 ? "var(--plasma)" : riskScore > 50 ? "var(--amber)" : "var(--safe)";
  
  const driftDir = riskReport.estimated_drift_direction || "N/A";
  const windSpeed = riskReport.wind_speed_kn != null ? Number(riskReport.wind_speed_kn).toFixed(1) : "0.0";
  const distCoast = riskReport.distance_to_coast_km != null ? Number(riskReport.distance_to_coast_km).toFixed(1) : "--";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, position: "relative" }}>

      {/* ── Page Header ── */}
      <div className="max-md:!flex-col max-md:!items-start max-md:!gap-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>
            MISSION MEDITERRANEAN OIL SURVEILLANCE - SENTINEL-1 SAR
          </div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Command Dashboard
          </h1>
        </div>
        <Link href="/analyse">
          <button className="btn-primary" style={{ gap: 8 }}>
            <Waves size={15} />
            Launch Analysis
            <ArrowRight size={14} />
          </button>
        </Link>
      </div>

      {/* ── KPI Row (5 Cards like mockup) ── */}
      <div className="max-md:!grid-cols-1 max-md:!gap-4" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        <MetricCard
          icon={AlertTriangle} label="ACTIVE ALERTS"
          value={activeAlerts.toString()}
          sub={`${criticalCount} Critical · ${highCount} High`}
          accent="var(--plasma)" pulse={activeAlerts > 0}
        />
        <MetricCard
          icon={Waves} label="TOTAL SPILL AREA"
          value={`${formattedCurrentArea.value} ${formattedCurrentArea.unit}`}
          sub="Latest detection"
          accent="var(--biolum)"
        />
        <MetricCard
          icon={Crosshair} label="DETECTION CONFIDENCE"
          value="92%"
          sub="High Confidence"
          accent="var(--signal-cyan)"
        />
        <MetricCard
          icon={Building2} label="NEAREST INFRASTRUCTURE"
          value={`${nearestInfraDist} km`}
          sub={`Closest Platform (${nearestInfraName})`}
          accent="var(--amber)"
        />
        <MetricCard
          icon={DollarSign} label="ESTIMATED CLEANUP COST"
          value={formattedCost}
          sub="Initial Estimate"
          accent="var(--safe)"
        />
      </div>

      {/* ── Main Layout: Left (Map + Chart) / Right (Sidebar) ── */}
      <div className="max-md:!grid-cols-1" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 12 }}>

        {/* LEFT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Interactive Map */}
          {latestReport ? (
             <LiveMap 
               centerLat={latestReport.center_lat} 
               centerLon={latestReport.center_lon}
               geojsonUrl={latestReport.geojson_url ? `${API_URL}${latestReport.geojson_url}` : undefined}
               infrastructures={latestReport.nearest_infrastructures || []}
             />
          ) : (
            <div className="glass-card" style={{ flex: 1, minHeight: 420, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {loading ? <Loader2 className="anim-spin" size={24} color="var(--biolum)" /> : <span style={{ color: "var(--text-mid)" }}>No Detection Data</span>}
            </div>
          )}

          {/* Trend Chart */}
          <div className="glass-card-lit" style={{ padding: "18px 24px" }}>
            <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h2 className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Contamination Area Trend</h2>
                  <p className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", marginTop: 4, letterSpacing: "0.1em" }}>
                    DETECTED AREA PER REPORT — {config.units}
                  </p>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={130}>
              <AreaChart data={TREND_DATA} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="biolum-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#00FFC8" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#00FFC8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fill: "#263A52", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#263A52", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="area"
                  stroke="var(--biolum)" strokeWidth={1.5}
                  fill="url(#biolum-grad)" dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          
          {/* Mission Status */}
          <div className="glass-card" style={{ padding: 16 }}>
            <h2 className="font-display" style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>MISSION STATUS</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 11 }} className="font-mono">
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-mid)" }}>Detection</span><span style={{ color: "var(--signal-cyan)" }}>CONFIRMED</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-mid)" }}>Severity</span><span style={{ color: RISK_ACCENT[riskReport.level || "LOW"] }}>{riskReport.level || "N/A"}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-mid)" }}>Distance to Coast</span><span style={{ color: "var(--text-primary)" }}>{distCoast} km</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-mid)" }}>Estimated Drift</span><span style={{ color: "var(--text-primary)" }}>{driftDir}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-mid)" }}>Wind Speed</span><span style={{ color: "var(--text-primary)" }}>{windSpeed} kn</span></div>
            </div>
          </div>

          {/* Risk Assessment Gauge */}
          <div className="glass-card" style={{ padding: 16, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h2 className="font-display" style={{ fontSize: 12, fontWeight: 700, alignSelf: "flex-start", color: "var(--text-secondary)" }}>RISK ASSESSMENT</h2>
            <div style={{ position: "relative", width: 120, height: 60, marginTop: 16, overflow: "hidden" }}>
              {/* Simple semi-circle CSS gauge */}
              <div style={{ 
                width: 120, height: 120, borderRadius: "50%", 
                border: "10px solid var(--wire-strong)", 
                borderBottomColor: "transparent", borderLeftColor: "transparent",
                transform: "rotate(-45deg)", position: "absolute", top: 0, left: 0 
              }} />
              <div style={{ 
                width: 120, height: 120, borderRadius: "50%", 
                border: `10px solid ${riskColor}`, 
                borderBottomColor: "transparent", borderLeftColor: "transparent",
                transform: `rotate(${-45 + (180 * (riskScore / 100))}deg)`, 
                position: "absolute", top: 0, left: 0, transition: "transform 1s ease-out"
              }} />
            </div>
            <div className="font-display" style={{ fontSize: 32, fontWeight: 800, marginTop: -20, color: "var(--text-primary)" }}>
              {riskScore}<span style={{ fontSize: 12, color: "var(--text-mid)" }}>/100</span>
            </div>
            <div className="font-mono" style={{ fontSize: 10, marginTop: 4, color: riskColor }}>
              Overall Risk Score
            </div>
          </div>

          {/* Next 24 Hours */}
          <div className="glass-card" style={{ padding: 16 }}>
            <h2 className="font-display" style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: "var(--text-secondary)" }}>NEXT 24 HOURS (AI PREDICTION)</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-mid)", fontSize: 11 }} className="font-mono">
                  <Wind size={14} color="var(--signal-cyan)" /> Drift Direction
                </div>
                <span className="font-mono" style={{ fontSize: 11, color: "var(--text-primary)" }}>{driftDir}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-mid)", fontSize: 11 }} className="font-mono">
                  <ShieldAlert size={14} color="var(--amber)" /> Coastal Impact
                </div>
                <span className="font-mono" style={{ fontSize: 11, color: riskReport.distance_to_coast_km < 20 ? "var(--amber)" : "var(--safe)" }}>
                  {riskReport.distance_to_coast_km < 20 ? "POSSIBLE" : "UNLIKELY"}
                </span>
              </div>
              
              <div style={{ marginTop: 8, padding: 8, background: "rgba(0, 255, 200, 0.05)", borderLeft: "2px solid var(--signal-cyan)", fontSize: 11 }}>
                <span style={{ color: "var(--text-mid)" }} className="font-mono">Recommended Action: </span>
                <span style={{ color: "var(--signal-cyan)" }} className="font-mono">Deploy response vessel to {driftDir}</span>
              </div>
            </div>
          </div>

          {/* Alert Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <h2 className="font-display" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>Recent Detections</h2>
              <Link href="/historique">
                <span className="font-mono" style={{ fontSize: 9, color: "var(--biolum)", letterSpacing: "0.1em", cursor: "pointer" }}>
                  VIEW ALL →
                </span>
              </Link>
            </div>
            {ALERTS.map((alert, i) => (
              <div key={alert.id} style={{ animation: `fade-up 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }}>
                <AlertCard {...alert} />
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
