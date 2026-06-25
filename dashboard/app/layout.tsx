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
            <main className="flex-1 overflow-y-auto p-4 md:p-5 lg:p-6 pb-20 md:pb-6">
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
