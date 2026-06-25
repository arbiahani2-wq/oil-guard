"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";

interface AlertCardProps {
  id: string;
  riskLevel: string;
  areakm2: number;
  lat: number;
  lon: number;
  timestamp: string;
  nearestInfra: string;
  distanceKm: number;
}

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "var(--plasma)",
  HIGH: "var(--ember)",
  MEDIUM: "var(--amber)",
  LOW: "var(--safe)",
};

const RISK_BG: Record<string, string> = {
  CRITICAL: "var(--plasma-bg)",
  HIGH: "var(--ember-bg)",
  MEDIUM: "var(--amber-bg)",
  LOW: "var(--safe-bg)",
};

function formatTime(ts: string) {
  try {
    const d = new Date(ts);
    return d.toUTCString().split(" ").slice(1, 5).join(" ");
  } catch { return ts; }
}

export default function AlertCard({ id, riskLevel, areakm2, lat, lon, timestamp, nearestInfra, distanceKm }: AlertCardProps) {
  const { formatArea } = useSettings();
  const color = RISK_COLOR[riskLevel] || "var(--biolum)";
  const bg = RISK_BG[riskLevel] || "var(--biolum-dim)";
  const formattedArea = formatArea(areakm2);

  return (
    <Link href={`/rapport/${id}`}>
      <div className="alert-timeline-item" style={{
        background: "var(--hull)",
        border: "1px solid var(--wire)",
        borderRadius: "var(--r-md)",
        padding: "12px 14px 12px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 6,
        position: "relative",
        transition: "all 200ms ease",
        cursor: "pointer",
        marginLeft: 8,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--wire-strong)";
        (e.currentTarget as HTMLElement).style.transform = "translateX(4px)";
        (e.currentTarget as HTMLElement).style.background = "var(--sonar)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--wire)";
        (e.currentTarget as HTMLElement).style.transform = "translateX(0)";
        (e.currentTarget as HTMLElement).style.background = "var(--hull)";
      }}
      >
        {/* Risk pill + area */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            background: bg,
            border: `1px solid ${color}28`,
            borderRadius: 4,
            padding: "2px 8px",
          }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "block", boxShadow: `0 0 4px ${color}` }} />
            <span className="font-mono" style={{ fontSize: 9, fontWeight: 700, color, letterSpacing: "0.12em" }}>
              {riskLevel}
            </span>
          </div>
          <span className="font-mono" style={{ fontSize: 11, color: "var(--biolum)" }}>
            {formattedArea.value} {formattedArea.unit}
          </span>
        </div>

        {/* Coordinates */}
        <div className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)", letterSpacing: "0.04em" }}>
          {Number(lat).toFixed(4)}°N · {Number(lon).toFixed(4)}°E
        </div>

        {/* Infrastructure + chevron */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: "var(--text-lo)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
            ↳ {nearestInfra} · {Number(distanceKm).toFixed(1)} km
          </span>
          <ChevronRight size={12} color="var(--text-lo)" />
        </div>
      </div>
    </Link>
  );
}
