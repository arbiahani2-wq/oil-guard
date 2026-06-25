"use client";

import { useEffect, useState } from "react";
import RiskBadge from "@/components/RiskBadge";
import { Download, Ruler, Loader2, Factory, Droplets, Building2, ArrowLeft, Map } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { useSettings } from "@/components/SettingsProvider";

const INFRA_ICON: Record<string, typeof Building2> = { Platform: Factory, Well: Droplets };

function inferType(inf: any): string {
  if (inf.type && (inf.type === "Platform" || inf.type === "Well")) return inf.type;
  const ft = (inf.type || inf.fac_type || "").toLowerCase();
  return ft.includes("well") ? "Well" : "Platform";
}

function leakLikelihood(distKm: number): { label: string; color: string } {
  if (distKm < 5)  return { label: "Possible active leak", color: "var(--plasma)" };
  if (distKm < 20) return { label: "Monitor closely",      color: "var(--ember)" };
  return { label: "Unlikely source", color: "var(--safe)" };
}

const LEVEL_COLOR: Record<string, string> = {
  CRITICAL: "var(--plasma)", HIGH: "var(--ember)", MEDIUM: "var(--amber)", LOW: "var(--safe)",
};

/* ── Threat classification badge SVG ── */
function ThreatBadge({ level }: { level: string }) {
  const color = LEVEL_COLOR[level] || "var(--text-lo)";
  return (
    <svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 2 L34 9 L34 22 C34 31 26 39 18 42 C10 39 2 31 2 22 L2 9 Z"
        stroke={color} strokeWidth="1.5" fill={`${color}10`} />
      {level === "CRITICAL" && <>
        <line x1="18" y1="14" x2="18" y2="24" stroke={color} strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="18" cy="29" r="1.5" fill={color}/>
      </>}
      {level === "HIGH" && <>
        <path d="M12 28 L18 16 L24 28" stroke={color} strokeWidth="1.8" strokeLinejoin="round" fill="none"/>
        <line x1="14" y1="28" x2="22" y2="28" stroke={color} strokeWidth="1.8" strokeLinecap="round"/>
      </>}
      {level === "MEDIUM" && <>
        <line x1="12" y1="22" x2="24" y2="22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      </>}
      {(level === "LOW" || !["CRITICAL","HIGH","MEDIUM"].includes(level)) && <>
        <path d="M13 22 L17 26 L23 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </>}
    </svg>
  );
}

export default function RapportPage() {
  const { formatArea } = useSettings();
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [report, setReport]   = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`${API_URL}/reports/${id}`);
        if (!res.ok) throw new Error("Report not found");
        setReport(await res.json());
      } catch (err: any) { setError(err.message); }
      finally { setLoading(false); }
    }
    fetchReport();
  }, [id]);

  if (loading) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400, flexDirection: "column", gap: 16 }}>
      <Loader2 className="anim-spin" size={32} color="var(--biolum)" />
      <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: "0.12em" }}>LOADING REPORT DATA...</div>
    </div>
  );

  if (error || !report) return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400, flexDirection: "column", gap: 16 }}>
      <svg width="60" height="60" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" stroke="var(--plasma)" strokeWidth="1.5" opacity="0.4"/>
        <line x1="22" y1="22" x2="42" y2="42" stroke="var(--plasma)" strokeWidth="2" strokeLinecap="round"/>
        <line x1="42" y1="22" x2="22" y2="42" stroke="var(--plasma)" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      <div className="font-mono" style={{ fontSize: 10, color: "var(--plasma)", letterSpacing: "0.15em" }}>REPORT NOT FOUND</div>
      <div style={{ fontSize: 13, color: "var(--text-mid)" }}>{error}</div>
      <button className="btn-ghost" onClick={() => router.back()}>
        <ArrowLeft size={14} /> Go back
      </button>
    </div>
  );

  const lvl = report?.risk_report?.level || "LOW";
  const lvlColor = LEVEL_COLOR[lvl] || "var(--text-lo)";
  const formattedArea = formatArea(report.total_area_km2 || 0);
  const spillCount = report.spill_polygons?.length ?? 0;
  const infraLevel = report?.risk_report?.infrastructure_level || "LOW";
  const pollLevel = report?.risk_report?.pollution_level || "LOW";

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Back + Header ── */}
      <div>
        <button className="btn-ghost" onClick={() => router.back()} style={{ marginBottom: 16, padding: "6px 12px" }}>
          <ArrowLeft size={13} /> Back
        </button>

        <div className="max-md:!flex-col max-md:!gap-4" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>
              OILGUARD / MISSION DEBRIEF
            </div>
            <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
              Oil Spill Detection Report
            </h1>
            <p className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 8 }}>
              REF: {report.id} · {report.image_path ? report.image_path.split("/").pop()?.split("\\").pop() : "Unknown"}
            </p>
          </div>
          <div className="max-md:!w-full max-md:!flex-wrap" style={{ display: "flex", gap: 8 }}>
            <a href={`${API_URL}${report.pdf_url}`} target="_blank" rel="noreferrer">
              <button className="btn-ghost"><Download size={13} /> PDF</button>
            </a>
            <a href={`${API_URL}${report.geojson_url}`} download>
              <button className="btn-ghost"><Download size={13} /> GeoJSON</button>
            </a>
          </div>
        </div>
      </div>

      {/* ── Hero Risk Banner — clean two-row layout ── */}
      <div className="glass-card-lit" style={{ overflow: "hidden" }}>

        {/* Top section: Threat badge + 4 stat cards in a row */}
        <div style={{
          padding: "28px 28px 24px",
          background: lvl === "CRITICAL" ? "linear-gradient(135deg, rgba(255,61,96,0.08) 0%, transparent 50%)"
            : lvl === "HIGH" ? "linear-gradient(135deg, rgba(255,122,48,0.06) 0%, transparent 50%)"
            : lvl === "MEDIUM" ? "linear-gradient(135deg, rgba(255,186,8,0.06) 0%, transparent 50%)"
            : "linear-gradient(135deg, rgba(0,230,118,0.05) 0%, transparent 50%)",
        }}>

          {/* Row 1: Classification badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
            <ThreatBadge level={lvl} />
            <div>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>
                THREAT CLASSIFICATION
              </div>
              <div className="font-display" style={{ fontSize: 32, fontWeight: 800, color: lvlColor, letterSpacing: "-0.02em", lineHeight: 1 }}>
                {lvl}
              </div>
            </div>
          </div>

          {/* Row 2: 4 stat cards in even grid */}
          <div className="max-md:!grid-cols-2 max-md:!gap-2" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {/* Infra Risk */}
            <div style={{
              background: "var(--sonar)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "14px 16px",
            }}>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.12em", marginBottom: 10 }}>
                INFRA RISK
              </div>
              <RiskBadge level={infraLevel} size="md" pulse={infraLevel === "CRITICAL"} />
            </div>

            {/* Pollution Risk */}
            <div style={{
              background: "var(--sonar)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "14px 16px",
            }}>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.12em", marginBottom: 10 }}>
                POLLUTION RISK
              </div>
              <RiskBadge level={pollLevel} size="md" />
            </div>

            {/* Total Area */}
            <div style={{
              background: "var(--sonar)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "14px 16px",
            }}>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.12em", marginBottom: 10 }}>
                TOTAL SPILL AREA
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: "var(--biolum)", lineHeight: 1 }}>{formattedArea.value}</span>
                <span className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>{formattedArea.unit}</span>
              </div>
            </div>

            {/* Spill Zones */}
            <div style={{
              background: "var(--sonar)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-sm)",
              padding: "14px 16px",
            }}>
              <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.12em", marginBottom: 10 }}>
                SPILL ZONES
              </div>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{spillCount}</span>
            </div>
          </div>

          {/* Row 3: Environmental & Weather Data */}
          {report?.risk_report && (
            <div className="max-md:!grid-cols-2 max-md:!gap-2" style={{ 
              marginTop: 16, 
              paddingTop: 16, 
              borderTop: "1px solid var(--border)",
              display: "grid", 
              gridTemplateColumns: "repeat(4, 1fr)", 
              gap: 12 
            }}>
              {/* Cleanup Cost */}
              <div style={{
                background: "var(--sonar)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "10px 14px",
              }}>
                <div className="font-mono" style={{ fontSize: 8, color: "var(--text-lo)", letterSpacing: "0.1em", marginBottom: 4 }}>
                  CLEANUP ESTIMATE
                </div>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "var(--safe)" }}>
                  {report.risk_report.cleanup_cost_usd !== undefined ? (
                    report.risk_report.cleanup_cost_usd > 1000000 
                      ? `$${(report.risk_report.cleanup_cost_usd / 1000000).toFixed(2)}M` 
                      : `$${(report.risk_report.cleanup_cost_usd / 1000).toFixed(0)}K`
                  ) : "N/A"}
                </div>
              </div>

              {/* Distance to Coast */}
              <div style={{
                background: "var(--sonar)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "10px 14px",
              }}>
                <div className="font-mono" style={{ fontSize: 8, color: "var(--text-lo)", letterSpacing: "0.1em", marginBottom: 4 }}>
                  DISTANCE TO COAST
                </div>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hi)" }}>
                  {report.risk_report.distance_to_coast_km !== undefined && report.risk_report.distance_to_coast_km !== null
                    ? `${report.risk_report.distance_to_coast_km.toFixed(1)} km` 
                    : "N/A"}
                </div>
              </div>

              {/* Drift Direction */}
              <div style={{
                background: "var(--sonar)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "10px 14px",
              }}>
                <div className="font-mono" style={{ fontSize: 8, color: "var(--text-lo)", letterSpacing: "0.1em", marginBottom: 4 }}>
                  ESTIMATED DRIFT
                </div>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "var(--biolum)" }}>
                  {report.risk_report.estimated_drift_direction || "N/A"}
                </div>
              </div>

              {/* Wind Speed */}
              <div style={{
                background: "var(--sonar)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)",
                padding: "10px 14px",
              }}>
                <div className="font-mono" style={{ fontSize: 8, color: "var(--text-lo)", letterSpacing: "0.1em", marginBottom: 4 }}>
                  WIND SPEED
                </div>
                <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hi)" }}>
                  {report.risk_report.wind_speed_kn !== undefined && report.risk_report.wind_speed_kn !== null
                    ? `${report.risk_report.wind_speed_kn.toFixed(1)} kn` 
                    : "N/A"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk reasons */}
        {report?.risk_report?.reasons?.length > 0 && (
          <div style={{ padding: "14px 28px", borderTop: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {report.risk_report.reasons.map((r: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-mid)", alignItems: "flex-start" }}>
                  <span className="font-mono" style={{ color: lvlColor, flexShrink: 0 }}>→</span>
                  <span>{r}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Two-col: Spills + Infra ── */}
      <div className="max-md:!grid-cols-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Spill Zones Table */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="13" height="16" viewBox="0 0 16 22" fill="none">
              <path d="M8 2 C8 2 1 10 1 14.5 C1 18.09 4.13 21 8 21 C11.87 21 15 18.09 15 14.5 C15 10 8 2 8 2Z"
                stroke="var(--biolum)" strokeWidth="1.4" fill="rgba(0,255,200,0.08)"/>
              <path d="M5 16 C5 14 6.5 12.5 8 12" stroke="var(--biolum)" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
            </svg>
            <h2 className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Detected Spill Zones</h2>
          </div>
          <div style={{ overflowX: "auto", maxHeight: 400, overflowY: "auto" }}>
            {report.spill_polygons?.length > 0 ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th><th>Area {formattedArea.unit}</th><th>Latitude</th><th>Longitude</th>
                  </tr>
                </thead>
                <tbody>
                  {report.spill_polygons.map((s: any, idx: number) => {
                    const polyArea = formatArea(s.area_km2);
                    return (
                    <tr key={idx}>
                      <td className="font-mono" style={{ color: "var(--text-lo)", fontSize: 10 }}>{String(idx+1).padStart(2,"0")}</td>
                      <td className="font-mono" style={{ color: "var(--biolum)", fontWeight: 700 }}>{polyArea.value}</td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{s.center_lat.toFixed(4)}°N</td>
                      <td className="font-mono" style={{ fontSize: 11 }}>{s.center_lon.toFixed(4)}°E</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-mid)", fontSize: 13 }}>No spill zones detected.</div>
            )}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="6" y="10" width="12" height="10" rx="1" stroke="var(--biolum)" strokeWidth="1.4" fill="none"/>
              <rect x="9" y="4"  width="6"  height="6"  rx="1" stroke="var(--biolum)" strokeWidth="1.4" fill="none"/>
              <line x1="3"  y1="20" x2="21" y2="20" stroke="var(--biolum)" strokeWidth="1.4" strokeLinecap="round"/>
              <line x1="3"  y1="20" x2="6"  y2="10" stroke="var(--biolum)" strokeWidth="1" strokeLinecap="round"/>
              <line x1="21" y1="20" x2="18" y2="10" stroke="var(--biolum)" strokeWidth="1" strokeLinecap="round"/>
            </svg>
            <h2 className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Nearby OGIM Infrastructure</h2>
          </div>
          <div style={{ maxHeight: 400, overflowY: "auto" }}>
            {report.nearest_infrastructures?.length > 0 ? (
              report.nearest_infrastructures.map((inf: any, i: number) => {
                const { label, color } = leakLikelihood(inf.distance_km);
                const resolved = inferType(inf);
                const Icon = INFRA_ICON[resolved] ?? Building2;
                return (
                  <div key={i} style={{
                    padding: "14px 18px",
                    borderBottom: i < report.nearest_infrastructures.length - 1 ? "1px solid var(--border)" : "none",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}>
                    <div style={{ width: 34, height: 34, borderRadius: "var(--r-sm)", background: "var(--sonar)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon size={14} color="var(--text-mid)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="font-display" style={{ fontSize: 14, fontWeight: 600, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inf.name}
                      </div>
                      <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 2 }}>
                        {inf.fac_type || inf.type}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <Ruler size={10} color="var(--text-lo)" />
                          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
                            {inf.distance_km.toFixed(1)} km
                          </span>
                        </div>
                        <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.08em" }}>
                          {label.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ padding: 24, textAlign: "center", color: "var(--text-mid)", fontSize: 13 }}>No infrastructure found nearby.</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Interactive Map ── */}
      {report.total_area_km2 > 0 && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Map size={14} color="var(--biolum)" />
              <h2 className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Spill Map — Interactive View</h2>
            </div>
            <a href={`${API_URL}${report.map_url}`} target="_blank" rel="noreferrer">
              <button className="btn-ghost" style={{ padding: "5px 12px" }}>
                Open Full Screen
              </button>
            </a>
          </div>
          <div style={{ height: 500, position: "relative" }}>
            <iframe
              src={`${API_URL}${report.map_url}`}
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Folium Interactive Map"
            />
          </div>
        </div>
      )}

    </div>
  );
}
