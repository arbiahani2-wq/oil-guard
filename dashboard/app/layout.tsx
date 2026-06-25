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
      <body className="flex flex-col md:flex-row h-[100dvh] overflow-hidden bg-[var(--void)] text-[var(--text-hi)]">
        <SettingsProvider>
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-5 h-[100dvh] pb-[96px] md:pb-5">
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
