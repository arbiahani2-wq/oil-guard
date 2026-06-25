"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import { useTheme } from "@/components/SettingsProvider";

function UtcClock() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toUTCString().split(" ").slice(4, 5)[0]);
      setDate(now.toUTCString().split(" ").slice(1, 4).join(" ").toUpperCase());
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {/* Satellite SVG */}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L10 7L5 5L7 10L2 12L7 14L5 19L10 17L12 22L14 17L19 19L17 14L22 12L17 10L19 5L14 7L12 2Z"
          stroke="var(--biolum)" strokeWidth="1.3" strokeLinejoin="round" fill="none" />
        <circle cx="12" cy="12" r="2.5" fill="var(--biolum)" opacity="0.8" />
        <circle cx="12" cy="12" r="4.5" stroke="var(--biolum)" strokeWidth="0.7" opacity="0.3" />
      </svg>
      <div>
        <div className="font-mono" style={{ fontSize: 13, color: "var(--text-hi)", letterSpacing: "0.05em", lineHeight: 1 }}>
          {time}
          <span className="anim-blink" style={{ color: "var(--biolum)", marginLeft: 2 }}>_</span>
        </div>
        <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.12em", marginTop: 2 }}>
          {date} · UTC
        </div>
      </div>
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 34,
        height: 34,
        borderRadius: "var(--r-sm)",
        border: "1px solid var(--border-hi)",
        background: isLight ? "rgba(0,168,138,0.10)" : "rgba(0,255,200,0.06)",
        cursor: "pointer",
        transition: "all 200ms ease",
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--biolum)";
        (e.currentTarget as HTMLButtonElement).style.background = "var(--biolum-mid)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-hi)";
        (e.currentTarget as HTMLButtonElement).style.background = isLight ? "rgba(0,168,138,0.10)" : "rgba(0,255,200,0.06)";
      }}
    >
      {isLight ? (
        /* Moon icon — switch to dark */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"
            stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="var(--biolum-dim)" />
        </svg>
      ) : (
        /* Sun icon — switch to light */
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="5" stroke="var(--biolum)" strokeWidth="2" fill="var(--biolum-dim)" />
          <line x1="12" y1="1" x2="12" y2="3" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="21" x2="12" y2="23" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="1" y1="12" x2="3" y2="12" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="21" y1="12" x2="23" y2="12" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export default function TopBar() {
  const [status, setStatus] = useState<"online" | "alert" | "offline">("online");
  const [lastDetection, setLastDetection] = useState<{ lat: string; lon: string; id: string } | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const res = await fetch(`${API_URL}/reports`);
        if (!res.ok) { setStatus("offline"); return; }
        const data = await res.json();
        if (Array.isArray(data)) {
          const hasCritical = data.some(r => r?.risk_report?.level === "CRITICAL");
          setStatus(hasCritical ? "alert" : "online");
          if (data.length > 0) {
            const r = data[0];
            setLastDetection({
              lat: Number(r.center_lat || 0).toFixed(4),
              lon: Number(r.center_lon || 0).toFixed(4),
              id: r.id,
            });
          }
        }
      } catch { setStatus("offline"); }
    }
    fetchStatus();
  }, []);

  const statusMap = {
    online:  { label: "NOMINAL", color: "var(--biolum)" },
    alert:   { label: "ALERT",   color: "var(--plasma)" },
    offline: { label: "OFFLINE", color: "var(--text-lo)" },
  };
  const s = statusMap[status];

  return (
    <header className="max-md:!flex-row max-md:!h-14 max-md:!py-0 max-md:!px-4 max-md:!overflow-hidden" style={{
      height: 50,
      background: "var(--hull)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid var(--wire)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      flexShrink: 0,
      zIndex: 50,
    }}>

      {/* Left — Mission label */}
      <div className="max-md:after:content-['OILGUARD'] max-md:after:font-display max-md:after:text-[16px] max-md:after:font-[800] max-md:after:tracking-[-0.02em] max-md:after:text-[var(--text-hi)]" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div className="max-md:!hidden" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <svg width="16" height="12" viewBox="0 0 32 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1 12 C4 4, 8 4, 8 12 C8 20, 12 20, 12 12 C12 4, 16 4, 16 12 C16 20, 20 20, 20 12 C20 4, 24 4, 24 12 C24 20, 28 20, 28 12 C28 4, 31 4, 31 12"
              stroke="var(--biolum)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: "0.15em" }}>
            MISSION
          </span>
        </div>
        <span className="font-display max-md:!hidden" style={{ fontSize: 12, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "0.06em" }}>
          MEDITERRANEAN OIL SURVEILLANCE · SENTINEL-1 SAR
        </span>
      </div>

      {/* Center — Last known detection coordinates */}
      {lastDetection && (
        <div className="max-md:!hidden" style={{
          display: "flex", alignItems: "center", gap: 10,
          background: "var(--biolum-dim)",
          border: "1px solid var(--wire)",
          borderRadius: "var(--r-sm)",
          padding: "5px 14px",
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="9" stroke="var(--biolum)" strokeWidth="1.5" opacity="0.6"/>
            <circle cx="12" cy="12" r="2" fill="var(--biolum)"/>
            <line x1="12" y1="3" x2="12" y2="7"  stroke="var(--biolum)" strokeWidth="1.5"/>
            <line x1="12" y1="17" x2="12" y2="21" stroke="var(--biolum)" strokeWidth="1.5"/>
            <line x1="3"  y1="12" x2="7"  y2="12" stroke="var(--biolum)" strokeWidth="1.5"/>
            <line x1="17" y1="12" x2="21" y2="12" stroke="var(--biolum)" strokeWidth="1.5"/>
          </svg>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>LAST FIX</span>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--biolum)" }}>
            {lastDetection.lat}°N {lastDetection.lon}°E
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", borderLeft: "1px solid var(--wire)", paddingLeft: 10 }}>
            REF: {lastDetection.id}
          </span>
        </div>
      )}

      {/* Right — System status + Clock + Theme Toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <UtcClock />
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: status === "alert" ? "var(--plasma-bg)" : "var(--biolum-dim)",
          border: `1px solid ${status === "alert" ? "var(--plasma-border)" : "var(--wire)"}`,
          borderRadius: "var(--r-sm)",
          padding: "5px 12px",
        }}>
          <span className={`status-dot ${status === "alert" ? "alert" : status === "online" ? "online" : ""}`} />
          <span className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: s.color, letterSpacing: "0.12em" }}>
            SYSTEM {s.label}
          </span>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
