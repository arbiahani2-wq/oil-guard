"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  LayoutDashboard, ScanSearch, History, MapPin, Settings, Waves,
} from "lucide-react";
import { API_URL } from "@/lib/config";

const navItems = [
  { href: "/",           label: "Dashboard",     icon: LayoutDashboard },
  { href: "/analyse",    label: "New Analysis",  icon: ScanSearch },
  { href: "/historique", label: "History",       icon: History },
  { href: "/ogim",       label: "OGIM Explorer", icon: MapPin },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [alertStats, setAlertStats] = useState<{ critical: number; high: number; total: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch(`${API_URL}/reports`);
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          const alerts = data.filter(r => r.risk_report?.level === "CRITICAL" || r.risk_report?.level === "HIGH");
          setAlertStats({
            total: alerts.length,
            critical: alerts.filter(r => r.risk_report?.level === "CRITICAL").length,
            high: alerts.filter(r => r.risk_report?.level === "HIGH").length,
          });
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchAlerts();
  }, []);

  const handleMouseEnter = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setExpanded(true);
  };

  const handleMouseLeave = () => {
    timerRef.current = setTimeout(() => setExpanded(false), 200);
  };

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="max-md:!w-full max-md:!h-[64px] max-md:!flex-row max-md:!border-r-0 max-md:!border-t max-md:!border-[var(--wire)] max-md:!min-w-0 max-md:!fixed max-md:!bottom-0 max-md:!left-0 max-md:!z-[999] max-md:!bg-[var(--hull)]"
      style={{
        width: expanded ? 228 : 64,
        minWidth: expanded ? 228 : 64,
        background: "var(--hull)",
        borderRight: "1px solid var(--wire)",
        display: "flex",
        flexDirection: "column",
        padding: 0,
        zIndex: 100,
        transition: "width 280ms cubic-bezier(0.22,1,0.36,1), min-width 280ms cubic-bezier(0.22,1,0.36,1)",
        overflow: "hidden",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <div className="max-md:!hidden" style={{
        padding: "18px 16px",
        borderBottom: "1px solid var(--wire)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 60,
        flexShrink: 0,
      }}>
        <div style={{
          width: 32, height: 32, flexShrink: 0, position: "relative",
          borderRadius: 8, overflow: "hidden",
          boxShadow: "0 0 12px rgba(0,255,200,0.35)",
        }}>
          <Image src="/oilguard-logo.png" alt="OilGuard Logo" fill style={{ objectFit: "cover" }} />
        </div>
        {expanded && (
          <div style={{ overflow: "hidden", whiteSpace: "nowrap" }}>
            <div className="font-display" style={{ fontSize: 14, fontWeight: 800, color: "var(--text-hi)", letterSpacing: "-0.02em", lineHeight: 1 }}>
              OILGUARD
            </div>
            <div className="font-mono" style={{ fontSize: 9, color: "var(--text-mid)", letterSpacing: "0.18em", marginTop: 3 }}>
              MARITIME SENTINEL
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="max-md:!flex-row max-md:!w-full max-md:!justify-around max-md:!h-full max-md:!items-center max-md:!p-0" style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {expanded && (
          <div className="font-mono max-md:!hidden" style={{ marginBottom: 6, padding: "0 6px 6px", fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", fontWeight: 700 }}>
            NAVIGATION
          </div>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item max-md:!flex-1 max-md:!h-full max-md:!justify-center max-md:!rounded-none max-md:!px-0 ${isActive ? "active" : ""}`}
              title={!expanded ? label : undefined}
              style={{ justifyContent: expanded ? "flex-start" : "center", paddingLeft: expanded ? 14 : 0, paddingRight: expanded ? 14 : 0 }}
            >
              <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
              {expanded && <span style={{ overflow: "hidden", whiteSpace: "nowrap" }}>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Alert Widget */}
      {alertStats !== null && alertStats.total > 0 && expanded && (
        <div className="max-md:!hidden" style={{
          margin: "0 8px 8px",
          padding: 12,
          borderRadius: "var(--r-md)",
          background: "var(--plasma-bg)",
          border: "1px solid rgba(255,61,96,0.2)",
          animation: "fade-up 0.4s ease both",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
            <span className="status-dot alert" />
            <span className="font-display" style={{ fontSize: 11, fontWeight: 700, color: "var(--plasma)" }}>
              {alertStats.total} ACTIVE ALERT{alertStats.total !== 1 ? "S" : ""}
            </span>
          </div>
          <div className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
            {alertStats.critical} Critical · {alertStats.high} High
          </div>
        </div>
      )}

      {/* Alert dot (collapsed) */}
      {alertStats !== null && alertStats.total > 0 && !expanded && (
        <div className="max-md:!hidden" style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
          <span className="anim-pulse-plasma" style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--plasma)",
            boxShadow: "0 0 6px var(--plasma)",
            display: "block",
          }} />
        </div>
      )}

      {/* Settings */}
      <div className="max-md:!hidden" style={{ padding: "0 8px 16px", borderTop: "1px solid var(--wire)", paddingTop: 8, marginTop: 0 }}>
        <Link href="/settings" className="nav-item"
          title={!expanded ? "Settings" : undefined}
          style={{ justifyContent: expanded ? "flex-start" : "center", paddingLeft: expanded ? 14 : 0, paddingRight: expanded ? 14 : 0 }}
        >
          <Settings size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
          {expanded && <span>Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
