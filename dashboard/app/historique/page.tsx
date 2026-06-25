"use client";

import { useEffect, useState } from "react";
import RiskBadge from "@/components/RiskBadge";
import { Search, Filter, Loader2, ChevronRight, Download, FileText } from "lucide-react";
import Link from "next/link";
import { useSettings } from "@/components/SettingsProvider";
import { API_URL } from "@/lib/config";

function formatDate(idStr: string) {
  if (idStr.length < 15) return idStr;
  const y = idStr.substring(0,4), m = idStr.substring(4,6), d = idStr.substring(6,8);
  const hh = idStr.substring(9,11), mm = idStr.substring(11,13);
  return `${y}-${m}-${d}  ${hh}:${mm} UTC`;
}

// Threat level strip color on card left edge
const THREAT_COLOR: Record<string, string> = {
  CRITICAL: "var(--plasma)", HIGH: "var(--ember)", MEDIUM: "var(--amber)", LOW: "var(--safe)",
};

export default function HistoriquePage() {
  const { formatArea } = useSettings();
  const [reports, setReports]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search,  setSearch]    = useState("");
  const [filter,  setFilter]    = useState<string>("ALL");

  useEffect(() => {
    async function fetch_() {
      try {
        const res = await fetch(`${API_URL}/reports`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            setReports(data);
          }
        }
      } catch { /* silent */ } finally { setLoading(false); }
    }
    fetch_();
  }, []);

  const filtered = reports.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.id.toLowerCase().includes(q) || (r?.risk_report?.level || "").toLowerCase().includes(q);
    const matchFilter = filter === "ALL" || (r?.risk_report?.level || "LOW") === filter;
    return matchSearch && matchFilter;
  });

  const LEVELS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>OILGUARD / INTEL ARCHIVE</div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>Analysis History</h1>
          <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 6 }}>
            {reports.length} report{reports.length !== 1 ? "s" : ""} on file
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Search */}
          <div style={{ position: "relative" }}>
            <Search size={13} color="var(--text-lo)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                background: "var(--hull)",
                border: "1px solid var(--border-hi)",
                borderRadius: "var(--r-sm)",
                padding: "8px 12px 8px 30px",
                color: "var(--text-hi)",
                fontSize: 12,
                fontFamily: "JetBrains Mono, monospace",
                outline: "none",
                width: 200,
                transition: "border-color 200ms ease",
              }}
              onFocus={e => (e.target.style.borderColor = "var(--biolum)")}
              onBlur={e  => (e.target.style.borderColor = "var(--wire-strong)")}
            />
          </div>
        </div>
      </div>

      {/* ── Filter Pills ── */}
      <div style={{ display: "flex", gap: 6 }}>
        {LEVELS.map(lvl => (
          <button key={lvl} onClick={() => setFilter(lvl)} style={{
            padding: "5px 12px",
            borderRadius: "var(--r-sm)",
            border: `1px solid ${filter === lvl ? "var(--biolum)" : "var(--wire)"}`,
            background: filter === lvl ? "var(--biolum-dim)" : "transparent",
            color: filter === lvl ? "var(--biolum)" : "var(--text-mid)",
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.12em",
            cursor: "pointer",
            transition: "all 180ms ease",
          }}>
            {lvl}
          </button>
        ))}
      </div>

      {/* ── Card Grid ── */}
      {loading ? (
        <div style={{ padding: 60, display: "flex", justifyContent: "center" }}>
          <Loader2 className="anim-spin" size={28} color="var(--biolum)" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 48, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          {/* Empty — classified folder SVG */}
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="4" y="16" width="56" height="40" rx="4" stroke="var(--text-lo)" strokeWidth="1.5" fill="none"/>
            <path d="M4 24 L14 24 L18 16 L60 16" stroke="var(--text-lo)" strokeWidth="1.5" strokeLinejoin="round" fill="none"/>
            <line x1="18" y1="36" x2="46" y2="36" stroke="var(--text-lo)" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="18" y1="43" x2="36" y2="43" stroke="var(--text-lo)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", letterSpacing: "0.15em" }}>NO RECORDS FOUND</div>
          <div style={{ fontSize: 13, color: "var(--text-mid)" }}>Upload a satellite image to begin logging detections</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
          {filtered.map((report, i) => {
            const lvl = report?.risk_report?.level || "LOW";
            const color = THREAT_COLOR[lvl] || "var(--biolum)";
            const formattedArea = formatArea(report.total_area_km2 || 0);
            const polys = report.spill_polygons?.length ?? 0;
            return (
              <div key={report.id} className="report-card" style={{ animationDelay: `${i * 40}ms` }}>
                {/* Threat level left strip */}
                <div style={{ display: "flex" }}>
                  <div style={{ width: 4, background: color, flexShrink: 0, borderRadius: "var(--r-sm) 0 0 var(--r-sm)" }} />
                  <div style={{ flex: 1, padding: "16px 16px 14px" }}>

                    {/* Top row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.15em", marginBottom: 4 }}>
                          REPORT ID
                        </div>
                        <div className="font-mono" style={{ fontSize: 12, color: "var(--text-hi)", letterSpacing: "0.04em" }}>
                          {report.id}
                        </div>
                      </div>
                      <RiskBadge level={lvl} size="sm" />
                    </div>

                    {/* Stats row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid var(--wire)" }}>
                      <div className="stat-block">
                        <span className="stat-label">Area</span>
                        <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--biolum)", lineHeight: 1 }}>{formattedArea.value}</span>
                        <span className="stat-sub">{formattedArea.unit}</span>
                      </div>
                      <div className="stat-block">
                        <span className="stat-label">Polygons</span>
                        <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: "var(--text-hi)", lineHeight: 1 }}>{polys}</span>
                        <span className="stat-sub">zones</span>
                      </div>
                      <div className="stat-block">
                        <span className="stat-label">Infra</span>
                        <span className="font-display" style={{ fontSize: 18, fontWeight: 800, color: color, lineHeight: 1 }}>{(report.nearest_infrastructures || []).length}</span>
                        <span className="stat-sub">nearby</span>
                      </div>
                    </div>

                    {/* Date + Actions */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", letterSpacing: "0.06em" }}>
                        {formatDate(report.id)}
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <a href={`${API_URL}${report.pdf_url}`} target="_blank" rel="noreferrer" title="Download PDF" onClick={e => e.stopPropagation()}>
                          <button className="btn-ghost" style={{ padding: "5px 9px" }}>
                            <Download size={12} />
                          </button>
                        </a>
                        <Link href={`/rapport/${report.id}`}>
                          <button className="btn-ghost" style={{ padding: "5px 12px", color: "var(--biolum)", borderColor: "var(--biolum)" }}>
                            <FileText size={12} /> View
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
