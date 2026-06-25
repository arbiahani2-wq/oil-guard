"use client";

interface RiskBadgeProps {
  level: string;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "var(--plasma)", HIGH: "var(--ember)", MEDIUM: "var(--amber)", LOW: "var(--safe)",
};
const RISK_BG: Record<string, string> = {
  CRITICAL: "var(--plasma-bg)", HIGH: "var(--ember-bg)", MEDIUM: "var(--amber-bg)", LOW: "var(--safe-bg)",
};

export default function RiskBadge({ level, size = "md", pulse }: RiskBadgeProps) {
  const color = RISK_COLOR[level] || "var(--text-mid)";
  const bg    = RISK_BG[level]    || "var(--sonar)";
  const sz    = size === "sm" ? 9 : size === "lg" ? 13 : 11;
  const py    = size === "sm" ? 2 : size === "lg" ? 5 : 3;
  const px    = size === "sm" ? 7 : size === "lg" ? 12 : 9;

  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: `${py}px ${px}px`,
      borderRadius: 4,
      background: bg,
      border: `1px solid ${color}28`,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: sz,
      fontWeight: 700,
      letterSpacing: "0.10em",
      color,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>
      <span style={{
        width: size === "lg" ? 6 : 5,
        height: size === "lg" ? 6 : 5,
        borderRadius: "50%",
        background: color,
        display: "inline-block",
        boxShadow: `0 0 5px ${color}`,
        flexShrink: 0,
        ...(pulse ? { animation: "pulse-plasma 2s ease-in-out infinite" } : {}),
      }} />
      {level}
    </span>
  );
}
