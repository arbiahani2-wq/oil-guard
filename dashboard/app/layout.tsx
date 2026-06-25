
import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

import { SettingsProvider } from "@/components/SettingsProvider";

export const metadata: Metadata = {
  title: "OilGuard — Maritime Oil Spill Detection",
  description: "Real-time Sentinel-1 SAR oil spill detection and early warning system. Mediterranean surveillance powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: "flex", height: "100dvh", overflow: "hidden", background: "var(--void)" }}>
        <SettingsProvider>
          <Sidebar />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <TopBar />
            <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
