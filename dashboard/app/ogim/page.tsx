"use client";

import { useState, useEffect } from "react";
import { Search, X, Loader2, Factory, Droplets, Building2, MapPin, Anchor, Fuel } from "lucide-react";
import { API_URL } from "@/lib/config";

const TYPE_COLOR: Record<string, string> = {
  Platform: "var(--ember)",
  Well:     "var(--biolum)",
};

const STATUS_COLOR: Record<string, string> = {
  Active:      "var(--safe)",
  Development: "var(--amber)",
  Exploration: "var(--text-mid)",
};

export default function OgimPage() {
  const [query,          setQuery]          = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [typeFilter,     setTypeFilter]     = useState<string>("All");
  const [infrastructure, setInfrastructure] = useState<any[]>([]);
  const [stats,          setStats]          = useState({ total: 0, platforms: 0, wells: 0 });
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(query), 320);
    return () => clearTimeout(h);
  }, [query]);

  useEffect(() => {
    fetch(`${API_URL}/ogim/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = new URL(`${API_URL}/ogim`);
    if (debouncedQuery) url.searchParams.append("q", debouncedQuery);
    if (typeFilter !== "All") url.searchParams.append("type", typeFilter);
    url.searchParams.append("page_size", "200");
    fetch(url.toString())
      .then(r => r.json())
      .then(data => {
        setInfrastructure((data.results || []).map((item: any, idx: number) => ({ ...item, id: idx })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [debouncedQuery, typeFilter]);

  const selected = infrastructure.find(inf => inf.id === selectedId) ?? null;

  const mapSrc = selected
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${selected.lon - 0.8},${selected.lat - 0.8},${selected.lon + 0.8},${selected.lat + 0.8}&layer=mapnik&marker=${selected.lat},${selected.lon}`
    : `https://www.openstreetmap.org/export/embed.html?bbox=14,30,42,42&layer=mapnik`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, height: "calc(100dvh - 120px)" }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end flex-wrap gap-3 shrink-0">
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>OILGUARD / OGIM DATABASE</div>
          <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            OGIM Infrastructure Explorer
          </h1>
          <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 6 }}>
            Offshore Gas &amp; Oil Infrastructure · Mediterranean v2.7 · {stats.total.toLocaleString()} records
          </p>
        </div>

        {/* Stats mini-panel */}
        <div className="flex gap-[1px] overflow-hidden rounded-[var(--r-md)] border border-[var(--wire)] self-start md:self-auto">
          {[
            { label: "TOTAL",     value: stats.total,     color: "var(--biolum)", icon: <Building2 size={11} /> },
            { label: "PLATFORMS", value: stats.platforms,  color: "var(--ember)",  icon: <Factory size={11} /> },
            { label: "WELLS",     value: stats.wells,     color: "var(--biolum)", icon: <Droplets size={11} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} style={{ padding: "10px 18px", background: "var(--hull)", borderRight: "1px solid var(--wire)", display: "flex", flexDirection: "column", gap: 4, alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-lo)" }}>
                {icon}
                <span className="font-mono" style={{ fontSize: 8, letterSpacing: "0.14em" }}>{label}</span>
              </div>
              <span className="font-display" style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>
                {value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap gap-2 items-center shrink-0">
        <div style={{ position: "relative" }}>
          <Search size={13} color="var(--text-lo)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, operator, country..."
            style={{
              background: "var(--hull)", border: "1px solid var(--wire-strong)",
              borderRadius: "var(--r-sm)", padding: "8px 32px 8px 30px",
              color: "var(--text-hi)", fontSize: 12,
              fontFamily: "JetBrains Mono, monospace", outline: "none",
              transition: "border-color 200ms ease",
            }}
            onFocus={e  => (e.target.style.borderColor = "var(--biolum)")}
            onBlur={e   => (e.target.style.borderColor = "var(--wire-strong)")}
          />
          {query && (
            <button onClick={() => setQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-lo)", display: "flex" }}>
              <X size={11} />
            </button>
          )}
        </div>

        {["All", "Platform", "Well"].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)} style={{
            padding: "7px 14px",
            borderRadius: "var(--r-sm)", cursor: "pointer",
            border: `1px solid ${typeFilter === t ? "var(--biolum)" : "var(--wire)"}`,
            background: typeFilter === t ? "var(--biolum-dim)" : "transparent",
            color: typeFilter === t ? "var(--biolum)" : "var(--text-mid)",
            fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", transition: "all 180ms ease",
          }}>
            {t.toUpperCase()}
          </button>
        ))}

        {loading && <Loader2 size={14} color="var(--biolum)" className="anim-spin" style={{ animation: "spin 1s linear infinite", marginLeft: 4 }} />}
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">

        {/* List */}
        <div className="glass-card w-full md:w-[300px] shrink-0 flex flex-col overflow-hidden max-h-[40vh] md:max-h-none">
          <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--wire)", flexShrink: 0 }}>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.14em" }}>
              SHOWING {infrastructure.length} RECORDS
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {!loading && infrastructure.length === 0 ? (
              <div style={{ padding: 28, textAlign: "center", color: "var(--text-mid)", fontSize: 13 }}>
                No results for &ldquo;{query}&rdquo;
              </div>
            ) : (
              infrastructure.map((inf) => {
                const isActive = selectedId === inf.id;
                const color = TYPE_COLOR[inf.type] || "var(--text-mid)";
                return (
                  <div
                    key={inf.id}
                    onClick={() => setSelectedId(isActive ? null : inf.id)}
                    style={{
                      padding: "11px 14px",
                      borderBottom: "1px solid rgba(13,26,48,0.8)",
                      cursor: "pointer",
                      background: isActive ? "var(--biolum-dim)" : "transparent",
                      borderLeft: `2px solid ${isActive ? "var(--biolum)" : "transparent"}`,
                      transition: "all 150ms ease",
                    }}
                    onMouseEnter={e => !isActive && ((e.currentTarget as HTMLElement).style.background = "rgba(0,255,200,0.03)")}
                    onMouseLeave={e => !isActive && ((e.currentTarget as HTMLElement).style.background = "transparent")}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: isActive ? "var(--biolum)" : "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%" }}>
                        {inf.name}
                      </div>
                      <span className="font-mono" style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 3, background: `${color}18`, color, flexShrink: 0, marginLeft: 6, letterSpacing: "0.1em" }}>
                        {inf.type.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {inf.operator} · {inf.country}
                    </div>
                    <div className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={9} /> {inf.lat.toFixed(3)}°N, {inf.lon.toFixed(3)}°E
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Detail + Map */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>

          {selected && (
            <div className="glass-card-lit" style={{ padding: "16px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: TYPE_COLOR[selected.type] || "var(--text-mid)", display: "inline-block", boxShadow: `0 0 6px ${TYPE_COLOR[selected.type] || "var(--text-mid)"}` }} />
                    <h2 className="font-display" style={{ fontSize: 18, fontWeight: 800 }}>{selected.name}</h2>
                  </div>
                  <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: "0.08em" }}>
                    {selected.type} · {selected.operator} · {selected.country}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, padding: "3px 10px", borderRadius: "var(--r-sm)", background: `${STATUS_COLOR[selected.status] || "var(--sonar)"}18`, color: STATUS_COLOR[selected.status] || "var(--text-mid)", border: `1px solid ${STATUS_COLOR[selected.status] || "var(--wire)"}30`, letterSpacing: "0.1em" }}>
                    {selected.status || "UNKNOWN"}
                  </span>
                  <button onClick={() => setSelectedId(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-lo)", display: "flex", padding: 4 }}>
                    <X size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Coordinates",   value: `${selected.lat.toFixed(4)}°N\n${selected.lon.toFixed(4)}°E`, icon: <MapPin size={11} /> },
                  { label: "Facility Type", value: selected.fac_type || "N/A", icon: <Factory size={11} /> },
                  { label: "Commodity",     value: selected.commodity || "N/A", icon: <Fuel size={11} /> },
                  { label: "Installed",     value: selected.install_date || "N/A", icon: <Anchor size={11} /> },
                ].map(({ label, value, icon }) => (
                  <div key={label} style={{ background: "var(--sonar)", border: "1px solid var(--wire)", borderRadius: "var(--r-sm)", padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-lo)", marginBottom: 6 }}>
                      {icon}
                      <span className="font-mono" style={{ fontSize: 8, letterSpacing: "0.12em" }}>{label.toUpperCase()}</span>
                    </div>
                    <div className="font-display" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-hi)", whiteSpace: "pre-line", lineHeight: 1.4 }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Map */}
          <div className="glass-card" style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--wire)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700 }}>
                {selected ? `Location — ${selected.name}` : "Mediterranean Overview"}
              </div>
              {!selected && (
                <span className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.1em" }}>
                  SELECT RECORD TO ZOOM
                </span>
              )}
            </div>
            <iframe
              key={selected?.id ?? "overview"}
              src={mapSrc}
              style={{ flex: 1, border: "none", width: "100%" }}
              title="OGIM Map"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
