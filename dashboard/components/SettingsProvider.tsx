"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type SettingsConfig = {
  confidence: number;
  minArea: number;
  maxPolygons: number;
  emailAlerts: boolean;
  alertLevel: string;
  units: "km2" | "mi2" | "ha";
  aisApiKey: string;
  infraCritical: number;
  infraHigh: number;
  infraMedium: number;
  pollCritical: number;
  pollHigh: number;
  pollMedium: number;
  coastCritical: number;
  coastWarning: number;
};

export const DEFAULT_CONFIG: SettingsConfig = {
  confidence: 85,
  minArea: 0.5,
  maxPolygons: 50,
  emailAlerts: true,
  alertLevel: "HIGH",
  units: "km2",
  aisApiKey: "d90155fc9c93079b5e5cb8565c4b75b994312fb4",
  infraCritical: 2.0,
  infraHigh: 5.0,
  infraMedium: 15.0,
  pollCritical: 50.0,
  pollHigh: 10.0,
  pollMedium: 1.0,
  coastCritical: 5.0,
  coastWarning: 20.0,
};

type SettingsContextType = {
  config: SettingsConfig;
  setConfig: React.Dispatch<React.SetStateAction<SettingsConfig>>;
  resetSettings: () => void;
  formatArea: (areaKm2: number) => { value: string; unit: string };
};

type ThemeContextType = {
  theme: "dark" | "light";
  toggleTheme: () => void;
};

const SettingsContext = createContext<SettingsContextType | null>(null);
const ThemeContext = createContext<ThemeContextType | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SettingsConfig>(DEFAULT_CONFIG);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load config
    const saved = localStorage.getItem("oilguard_config");
    if (saved) {
      try {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
      } catch (e) {}
    }
    // Load theme
    const savedTheme = localStorage.getItem("oilguard_theme") as "dark" | "light" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme ?? (prefersDark ? "dark" : "light");
    setTheme(initialTheme);
    document.documentElement.setAttribute("data-theme", initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("oilguard_theme", next);
      document.documentElement.setAttribute("data-theme", next);
      return next;
    });
  };

  const resetSettings = () => {
    setConfig(DEFAULT_CONFIG);
    localStorage.setItem("oilguard_config", JSON.stringify(DEFAULT_CONFIG));
  };

  const formatArea = (areaKm2: any) => {
    let num = Number(areaKm2);
    if (isNaN(num)) num = 0;
    
    let value = num;
    let unit = "km²";
    
    if (config.units === "mi2") {
      value = num * 0.386102;
      unit = "mi²";
    } else if (config.units === "ha") {
      value = num * 100;
      unit = "ha";
    }
    
    return { value: value.toFixed(1), unit };
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <SettingsContext.Provider value={{ config, setConfig, resetSettings, formatArea }}>
        <div style={{ visibility: mounted ? "visible" : "hidden", display: "contents" }}>
          {children}
        </div>
      </SettingsContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a SettingsProvider");
  }
  return context;
}
