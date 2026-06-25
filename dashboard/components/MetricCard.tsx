"use client";

import { ElementType } from "react";

interface MetricCardProps {
  icon: ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: string;
  pulse?: boolean;
}

export default function MetricCard({ icon: Icon, label, value, sub, accent = "var(--biolum)", pulse }: MetricCardProps) {
  return (
    <div className="glass-card-lit metric-card" style={{ padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      
      {/* Background glow orb */}
      <div style={{
        position: "absolute",
        top: -30, right: -30,
        width: 100, height: 100,
        borderRadius: "50%",
        background: accent,
        opacity: 0.05,
        filter: "blur(30px)",
        pointerEvents: "none",
      }} />

      {/* Top row: icon + label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span className="stat-label">{label}</span>
        <div style={{
          width: 30, height: 30,
          borderRadius: "var(--r-sm)",
          background: `${accent}18`,
          border: `1px solid ${accent}28`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={14} color={accent} strokeWidth={2} />
        </div>
      </div>

      {/* Value */}
      <div className="font-display" style={{
        fontSize: 26, fontWeight: 800, color: "var(--text-hi)",
        lineHeight: 1, letterSpacing: "-0.03em",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        {pulse && (
          <span style={{
            width: 8, height: 8, borderRadius: "50%", background: accent,
            boxShadow: `0 0 8px ${accent}`,
            display: "inline-block", flexShrink: 0,
          }} className="anim-pulse-plasma" />
        )}
        {value}
      </div>

      {/* Sub */}
      {sub && (
        <div className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 6, letterSpacing: "0.06em" }}>
          {sub}
        </div>
      )}

      {/* Bottom accent line */}
      <div style={{
        position: "absolute",
        bottom: 0, left: 0, right: 0,
        height: 2,
        background: `linear-gradient(90deg, ${accent}60, transparent)`,
        borderRadius: "0 0 var(--r-md) var(--r-md)",
      }} />
    </div>
  );
}
