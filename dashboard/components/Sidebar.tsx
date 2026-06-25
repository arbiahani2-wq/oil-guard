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
        const data: any[] = await res.json();
        const critical = data.filter(r => r?.risk_report?.level === "CRITICAL").length;
        const high     = data.filter(r => r?.risk_report?.level === "HIGH").length;
        setAlertStats({ critical, high, total: critical + high });
      } catch { /* silent */ }
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
      className={`fixed bottom-0 w-full h-[60px] md:static md:h-auto z-[100] bg-[var(--hull)] border-t md:border-t-0 md:border-r border-[var(--wire)] flex flex-row md:flex-col overflow-hidden backdrop-blur-[20px] transition-[width,min-width] duration-280 shrink-0 ${expanded ? "md:w-[228px] md:min-w-[228px]" : "md:w-[64px] md:min-w-[64px]"}`}
    >
      {/* Logo */}
      <div className="hidden md:flex p-[18px_16px] border-b border-[var(--wire)] items-center gap-[12px] h-[60px] shrink-0">
        <div style={{
          width: 32, height: 32, flexShrink: 0, position: "relative",
          borderRadius: 8, overflow: "hidden",
          boxShadow: "0 0 12px rgba(0,255,200,0.35)",
        }}>
          <Image src="/logo.png" alt="OilGuard Logo" fill style={{ objectFit: "cover" }} />
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
      <nav className="flex-1 md:flex-none md:flex-1 p-0 md:p-[12px_8px] flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-2">
        {expanded && (
          <div className="hidden md:block font-mono mb-[6px] p-[0_6px_6px] text-[9px] text-[var(--text-lo)] tracking-[0.18em] font-bold">
            NAVIGATION
          </div>
        )}
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link key={href} href={href} className={`nav-item flex-1 md:flex-none justify-center ${expanded ? "md:justify-start md:px-[14px]" : "md:px-0"} ${isActive ? "active" : ""}`}
              title={!expanded ? label : undefined}
            >
              <Icon size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
              {expanded && <span className="hidden md:block overflow-hidden whitespace-nowrap">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Alert Widget */}
      {alertStats !== null && alertStats.total > 0 && expanded && (
        <div className="hidden md:block m-[0_8px_8px] p-3 rounded-[var(--r-md)] bg-[var(--plasma-bg)] border border-[rgba(255,61,96,0.2)] anim-fade-up">
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
        <div className="hidden md:flex justify-center mb-3">
          <span className="anim-pulse-plasma" style={{
            width: 8, height: 8, borderRadius: "50%",
            background: "var(--plasma)",
            boxShadow: "0 0 6px var(--plasma)",
            display: "block",
          }} />
        </div>
      )}

      {/* Settings */}
      <div className="md:p-[0_8px_16px] md:border-t md:border-[var(--wire)] md:pt-2 flex-1 md:flex-none flex justify-center md:block">
        <Link href="/settings" className={`nav-item flex-1 md:flex-none justify-center ${expanded ? "md:justify-start md:px-[14px]" : "md:px-0"}`}
          title={!expanded ? "Settings" : undefined}
        >
          <Settings size={17} strokeWidth={2} style={{ flexShrink: 0 }} />
          {expanded && <span className="hidden md:block">Settings</span>}
        </Link>
      </div>
    </aside>
  );
}
