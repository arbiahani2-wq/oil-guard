"use client";

import { useState } from "react";
import { Save, Bell, Monitor, Check, Activity, RotateCcw } from "lucide-react";
import { useSettings } from "@/components/SettingsProvider";

const TABS = [
  { id: "pipeline", label: "Detection Pipeline", icon: Activity },
  { id: "alerts", label: "Alerts & Notifications", icon: Bell },
  { id: "display", label: "Display Preferences", icon: Monitor },
];

export default function SettingsPage() {
  const { config, setConfig, resetSettings } = useSettings();
  const [activeTab, setActiveTab] = useState("pipeline");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (key: string, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      localStorage.setItem("oilguard_config", JSON.stringify(config));
      setTimeout(() => setSaveSuccess(false), 2000);
    }, 800);
  };

  const handleReset = () => {
    resetSettings();
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>
            SYSTEM CONFIGURATION
          </div>
          <h1 className="font-display" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
            Settings & Preferences
          </h1>
        </div>
        
        <div style={{ display: "flex", gap: 12 }}>
          <button 
            className="btn-ghost" 
            onClick={handleReset}
            title="Reset to original defaults"
          >
            <RotateCcw size={14} /> Reset
          </button>
          <button 
            className="btn-primary" 
            style={{ width: 140, justifyContent: "center", position: "relative" }} 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <span className="anim-spin" style={{ width: 14, height: 14, border: "2px solid rgba(3,7,16,0.3)", borderTopColor: "#030710", borderRadius: "50%", display: "inline-block" }} />
            ) : saveSuccess ? (
              <><Check size={14} /> Config Saved</>
            ) : (
              <><Save size={14} /> Save Config</>
            )}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 24, alignItems: "start" }}>
        
        {/* Sidebar Tabs */}
        <div className="glass-card" style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 16px",
                borderRadius: "var(--r-sm)",
                border: "1px solid",
                borderColor: activeTab === tab.id ? "var(--border-hi)" : "transparent",
                background: activeTab === tab.id ? "var(--sonar)" : "transparent",
                color: activeTab === tab.id ? "var(--text-hi)" : "var(--text-mid)",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              <tab.icon size={16} color={activeTab === tab.id ? "var(--biolum)" : "var(--text-lo)"} />
              <span className="font-display" style={{ fontSize: 13, fontWeight: 600 }}>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ padding: "24px 32px", minHeight: 400 }}>
          
          {activeTab === "pipeline" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Detection Pipeline</h2>
                <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>Configure the sensitivity of the ML models.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Confidence Threshold */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>Confidence Threshold</span>
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--biolum)", fontWeight: 700 }}>{config.confidence}%</span>
                  </div>
                  <input 
                    type="range" min="50" max="99" 
                    value={config.confidence} 
                    onChange={e => handleChange("confidence", parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--biolum)" }}
                  />
                  <p className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 6 }}>
                    Minimum AI confidence required to flag a polygon as an oil spill. Higher values reduce false positives.
                  </p>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                {/* Minimum Area */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>Minimum Spill Area</span>
                    <span className="font-mono" style={{ fontSize: 12, color: "var(--biolum)", fontWeight: 700 }}>{config.minArea} km²</span>
                  </div>
                  <input 
                    type="range" min="0.1" max="5" step="0.1"
                    value={config.minArea} 
                    onChange={e => handleChange("minArea", parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--biolum)" }}
                  />
                  <p className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 6 }}>
                    Ignore contiguous dark spots smaller than this area.
                  </p>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                {/* Risk Evaluation Thresholds */}
                <div>
                  <h3 className="font-display" style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "var(--biolum)", letterSpacing: "0.05em" }}>RISK SCORING THRESHOLDS</h3>
                  
                  {/* Pollution Spill Area thresholds */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 className="font-display" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-hi)", marginBottom: 10 }}>Pollution Spill Area (km²)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Medium Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.pollMedium} 
                          onChange={e => handleChange("pollMedium", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>High Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.pollHigh} 
                          onChange={e => handleChange("pollHigh", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Critical Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.pollCritical} 
                          onChange={e => handleChange("pollCritical", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Infrastructure Proximity thresholds */}
                  <div style={{ marginBottom: 20 }}>
                    <h4 className="font-display" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-hi)", marginBottom: 10 }}>Infrastructure Proximity (km)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Medium Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.infraMedium} 
                          onChange={e => handleChange("infraMedium", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>High Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.infraHigh} 
                          onChange={e => handleChange("infraHigh", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Critical Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.infraCritical} 
                          onChange={e => handleChange("infraCritical", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coastline Proximity thresholds */}
                  <div>
                    <h4 className="font-display" style={{ fontSize: 12, fontWeight: 600, color: "var(--text-hi)", marginBottom: 10 }}>Coastline Proximity (km)</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Warning Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.coastWarning} 
                          onChange={e => handleChange("coastWarning", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                      <div>
                        <div style={{ marginBottom: 4 }}>
                          <span className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)" }}>Critical Threshold</span>
                        </div>
                        <input 
                          type="number" step="0.1" min="0.1"
                          value={config.coastCritical} 
                          onChange={e => handleChange("coastCritical", parseFloat(e.target.value) || 0)}
                          style={{
                            width: "100%", padding: "8px 10px", borderRadius: "var(--r-sm)",
                            border: "1px solid var(--wire)", background: "rgba(3,7,16,0.3)",
                            color: "var(--text-hi)", fontFamily: "JetBrains Mono, monospace", fontSize: 11
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "alerts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Alerts & Notifications</h2>
                <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>Manage how and when you are notified of detections.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)" }}>Enable Email Alerts</div>
                    <div className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 4 }}>Receive automatic reports when a spill is detected.</div>
                  </div>
                  <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
                    <input type="checkbox" checked={config.emailAlerts} onChange={e => handleChange("emailAlerts", e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: "absolute", cursor: "pointer", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: config.emailAlerts ? "var(--biolum)" : "var(--hull)", borderRadius: 24, transition: ".4s" }}>
                      <span style={{ position: "absolute", content: '""', height: 16, width: 16, left: 4, bottom: 4, backgroundColor: config.emailAlerts ? "#030710" : "var(--text-lo)", borderRadius: "50%", transition: ".4s", transform: config.emailAlerts ? "translateX(20px)" : "none" }} />
                    </span>
                  </label>
                </div>
                
                <div style={{ height: 1, background: "var(--border)" }} />
                
                <div>
                  <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", marginBottom: 12 }}>Minimum Alert Level</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map(level => (
                      <button
                        key={level}
                        onClick={() => handleChange("alertLevel", level)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "var(--r-sm)",
                          border: `1px solid ${config.alertLevel === level ? "var(--biolum)" : "var(--wire)"}`,
                          background: config.alertLevel === level ? "var(--biolum-dim)" : "transparent",
                          color: config.alertLevel === level ? "var(--biolum)" : "var(--text-mid)",
                          cursor: "pointer",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11, fontWeight: 700, letterSpacing: "0.05em"
                        }}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "display" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              <div>
                <h2 className="font-display" style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Display Preferences</h2>
                <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>Customize the dashboard interface.</p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", marginBottom: 12 }}>Area Units</div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      { id: "km2", label: "Square Kilometers (km²)" },
                      { id: "mi2", label: "Square Miles (mi²)" },
                      { id: "ha", label: "Hectares (ha)" }
                    ].map(u => (
                      <button
                        key={u.id}
                        onClick={() => handleChange("units", u.id)}
                        style={{
                          padding: "8px 16px",
                          borderRadius: "var(--r-sm)",
                          border: `1px solid ${config.units === u.id ? "var(--biolum)" : "var(--wire)"}`,
                          background: config.units === u.id ? "var(--biolum-dim)" : "transparent",
                          color: config.units === u.id ? "var(--biolum)" : "var(--text-mid)",
                          cursor: "pointer",
                          fontFamily: "JetBrains Mono, monospace",
                          fontSize: 11, fontWeight: 700
                        }}
                      >
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: "var(--border)" }} />

                <div>
                  <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-hi)", marginBottom: 8 }}>AIS Stream API Key</div>
                  <input 
                    type="text" 
                    value={config.aisApiKey || ""} 
                    onChange={e => handleChange("aisApiKey", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px",
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--wire)",
                      background: "rgba(3,7,16,0.3)",
                      color: "var(--text-hi)",
                      fontFamily: "JetBrains Mono, monospace",
                      fontSize: 12
                    }}
                    placeholder="Enter aisstream.io API Key"
                  />
                  <p className="font-mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 6 }}>
                    WebSocket key for real-time AIS vessel tracking near the spill area, obtained from aisstream.io.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
