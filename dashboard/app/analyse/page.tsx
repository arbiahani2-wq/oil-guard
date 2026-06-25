"use client";

import { useState, useRef, DragEvent, ChangeEvent, ReactNode } from "react";
import { Upload, CheckCircle, Loader2, XCircle, Clock, ChevronRight, FileSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { useSettings } from "@/components/SettingsProvider";

type StepStatus = "pending" | "running" | "done" | "error";

interface PipelineStep {
  id: number;
  label: string;
  code: string;       // short machine-code label
  description: string;
  status: StepStatus;
  progress: number;
}

const INITIAL_STEPS: PipelineStep[] = [
  { id: 1, label: "Upload & Validate",    code: "SAT.UPLOAD",     description: "Transferring GeoTIFF to processing node",          status: "pending", progress: 0 },
  { id: 2, label: "DeepLabV3+ Inference", code: "AI.INFER",       description: "Running segmentation model — ResNet-50 backbone",   status: "pending", progress: 0 },
  { id: 3, label: "GIS Processing",       code: "GIS.EXTRACT",    description: "Vectorizing mask · computing geodetic coordinates",  status: "pending", progress: 0 },
  { id: 4, label: "OGIM Correlation",     code: "INFRA.CORRELATE",description: "Querying offshore platform & well database",         status: "pending", progress: 0 },
  { id: 5, label: "Risk & Report",        code: "REPORT.GEN",     description: "Scoring threat level · generating PDF + map",        status: "pending", progress: 0 },
];

/* ── Terminal-style upload icon ── */
function SatelliteUploadIcon({ active }: { active: boolean }) {
  return (
    <svg width="56" height="56" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer orbit ring */}
      <ellipse cx="32" cy="32" rx="28" ry="12" stroke={active ? "var(--biolum)" : "var(--wire-strong)"}
        strokeWidth="1.2" strokeDasharray="4 3" opacity={active ? 1 : 0.5} />
      {/* Satellite body */}
      <rect x="26" y="26" width="12" height="12" rx="2" stroke={active ? "var(--biolum)" : "var(--text-mid)"}
        strokeWidth="1.5" fill={active ? "rgba(0,255,200,0.08)" : "transparent"} />
      {/* Solar panels */}
      <rect x="10" y="29" width="14" height="6" rx="1" stroke={active ? "var(--biolum)" : "var(--text-mid)"}
        strokeWidth="1.2" fill={active ? "rgba(0,255,200,0.06)" : "transparent"} />
      <rect x="40" y="29" width="14" height="6" rx="1" stroke={active ? "var(--biolum)" : "var(--text-mid)"}
        strokeWidth="1.2" fill={active ? "rgba(0,255,200,0.06)" : "transparent"} />
      {/* Signal beam down */}
      <path d="M32 38 L27 52 M32 38 L37 52" stroke={active ? "var(--biolum)" : "var(--wire-strong)"}
        strokeWidth="1" strokeLinecap="round" opacity={active ? 0.7 : 0.4} />
      {/* Center dot */}
      <circle cx="32" cy="32" r="2" fill={active ? "var(--biolum)" : "var(--text-lo)"} />
    </svg>
  );
}

const STATUS_ICON: Record<StepStatus, ReactNode> = {
  pending: <Clock size={14} color="var(--text-lo)" />,
  running: <Loader2 size={14} color="var(--biolum)" className="anim-spin" style={{ animation: "spin 1s linear infinite" }} />,
  done:    <CheckCircle size={14} color="var(--safe)" />,
  error:   <XCircle size={14} color="var(--plasma)" />,
};

export default function AnalysePage() {
  const { config } = useSettings();
  const router = useRouter();
  const [file, setFile]       = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [steps, setSteps]     = useState<PipelineStep[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".tif") || f.name.endsWith(".tiff"))) setFile(f);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const runPipeline = async () => {
    if (!file) return;
    setRunning(true); setFinished(false); setErrorMsg(null);

    const update = (idx: number, status: StepStatus, progress: number) =>
      setSteps(prev => prev.map((s, i) => i === idx ? { ...s, status, progress } : s));

    update(0, "running", 50);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("confidence", (config.confidence / 100).toString());
    formData.append("min_area", config.minArea.toString());
    formData.append("infra_critical", (config.infraCritical ?? 2.0).toString());
    formData.append("infra_high", (config.infraHigh ?? 5.0).toString());
    formData.append("infra_medium", (config.infraMedium ?? 15.0).toString());
    formData.append("poll_critical", (config.pollCritical ?? 50.0).toString());
    formData.append("poll_high", (config.pollHigh ?? 10.0).toString());
    formData.append("poll_medium", (config.pollMedium ?? 1.0).toString());
    formData.append("coast_critical", (config.coastCritical ?? 5.0).toString());
    formData.append("coast_warning", (config.coastWarning ?? 20.0).toString());

    const analysisPromise = fetch(`${API_URL}/analyze`, { method: "POST", body: formData });
    const durations = [900, 2800, 1400, 1800, 800];

    try {
      for (let i = 0; i < INITIAL_STEPS.length - 1; i++) {
        update(i, "running", 50);
        await new Promise(r => setTimeout(r, durations[i]));
        update(i, "done", 100);
      }
      update(4, "running", 80);
      const res = await analysisPromise;
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Analysis failed");
      }
      const data = await res.json();
      setReportId(data.id);
      update(4, "done", 100);
      setFinished(true);
      // Automatically redirect to the report page
      router.push(`/rapport/${data.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Unexpected error");
      setSteps(prev => prev.map(s => s.status === "running" ? { ...s, status: "error", progress: 0 } : s));
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setSteps(INITIAL_STEPS); setFile(null);
    setFinished(false); setReportId(null); setErrorMsg(null);
  };

  const doneCount = steps.filter(s => s.status === "done").length;
  const overallPct = finished ? 100 : Math.round((doneCount / INITIAL_STEPS.length) * 100);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Header ── */}
      <div>
        <div className="font-mono" style={{ fontSize: 9, color: "var(--text-lo)", letterSpacing: "0.18em", marginBottom: 6 }}>
          OILGUARD / MISSION LAUNCH
        </div>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1 }}>
          New Analysis
        </h1>
        <p className="font-mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 6 }}>
          Upload a Sentinel-1 SAR GeoTIFF to run the full detection pipeline
        </p>
      </div>

      {/* ── Drop Zone ── */}
      <div
        className={`dropzone ${dragOver ? "drag-over" : ""} ${file ? "dropzone-active" : ""}`}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !running && inputRef.current?.click()}
        style={{ pointerEvents: running ? "none" : "all", opacity: running ? 0.55 : 1, paddingTop: 48, paddingBottom: 48 }}
      >
        <input ref={inputRef} type="file" accept=".tif,.tiff" hidden onChange={handleChange} />

        {file ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <SatelliteUploadIcon active />
            <div>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: "var(--biolum)", letterSpacing: "-0.01em", textAlign: "center" }}>
                {file.name}
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", textAlign: "center", marginTop: 5, letterSpacing: "0.08em" }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · GeoTIFF · READY FOR UPLOAD
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <SatelliteUploadIcon active={false} />
            <div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-hi)", letterSpacing: "-0.02em", textAlign: "center" }}>
                Drop Sentinel-1 SAR image here
              </div>
              <div className="font-mono" style={{ fontSize: 10, color: "var(--text-mid)", textAlign: "center", marginTop: 6, lineHeight: 1.8, letterSpacing: "0.06em" }}>
                .TIF / .TIFF FORMAT · UP TO 500 MB<br />
                <span style={{ color: "var(--biolum)" }}>OR CLICK TO BROWSE</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {errorMsg && (
        <div style={{ padding: 16, borderRadius: "var(--r-md)", background: "var(--plasma-bg)", border: "1px solid rgba(255,61,96,0.3)", display: "flex", gap: 12, alignItems: "flex-start" }}>
          <XCircle size={16} color="var(--plasma)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--plasma)", letterSpacing: "0.1em", marginBottom: 4 }}>ANALYSIS FAILED</div>
            <div style={{ fontSize: 13, color: "var(--text-hi)" }}>{errorMsg}</div>
          </div>
        </div>
      )}

      {/* ── Launch Button ── */}
      {!running && !finished && (
        <button
          className="btn-primary"
          onClick={runPipeline}
          disabled={!file}
          style={{ alignSelf: "flex-start", padding: "13px 28px", fontSize: 14 }}
        >
          <FileSearch size={16} />
          Launch Pipeline
        </button>
      )}

      {/* ── Pipeline Progress ── */}
      {(running || finished || errorMsg) && (
        <div className="glass-card-lit" style={{ overflow: "hidden" }}>

          {/* Header */}
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--wire)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Pipeline icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="4"  cy="12" r="2.5" fill="var(--biolum)" opacity="0.8"/>
                <circle cx="12" cy="12" r="2.5" fill="var(--biolum)" opacity="0.8"/>
                <circle cx="20" cy="12" r="2.5" fill="var(--biolum)" opacity="0.8"/>
                <line x1="6.5" y1="12" x2="9.5" y2="12" stroke="var(--biolum)" strokeWidth="1.5" opacity="0.5"/>
                <line x1="14.5" y1="12" x2="17.5" y2="12" stroke="var(--biolum)" strokeWidth="1.5" opacity="0.5"/>
              </svg>
              <h2 className="font-display" style={{ fontSize: 14, fontWeight: 700 }}>Mission Pipeline</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {running && (
                <span className="font-mono" style={{ fontSize: 10, color: "var(--biolum)", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--biolum)", display: "inline-block" }} className="anim-pulse-biolum" />
                  PROCESSING
                </span>
              )}
              <span className="font-mono" style={{ fontSize: 11, color: finished ? "var(--safe)" : "var(--text-mid)" }}>
                {overallPct}%
              </span>
            </div>
          </div>

          {/* Overall progress bar */}
          <div style={{ height: 2, background: "var(--sonar)" }}>
            <div className="progress-fill" style={{ width: `${overallPct}%`, background: finished ? "var(--safe)" : undefined }} />
          </div>

          {/* Steps */}
          <div style={{ display: "flex", flexDirection: "column", gap: 0, padding: "8px 0" }}>
            {steps.map((step, i) => (
              <div key={step.id} className={`pipeline-step ${step.status}`} style={{ borderRadius: 0, border: "none", borderBottom: i < steps.length - 1 ? "1px solid var(--wire)" : "none", margin: 0 }}>

                {/* Step number */}
                <div className="font-mono" style={{ width: 20, flexShrink: 0, fontSize: 10, color: "var(--text-lo)", textAlign: "center" }}>
                  {String(step.id).padStart(2, "0")}
                </div>

                {/* Icon */}
                <div style={{ width: 24, flexShrink: 0, display: "flex", justifyContent: "center" }}>
                  {STATUS_ICON[step.status]}
                </div>

                {/* Labels */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: step.status === "running" ? 6 : 0 }}>
                    <div className="font-display" style={{ fontSize: 13, fontWeight: 600, color: step.status === "pending" ? "var(--text-lo)" : "var(--text-hi)" }}>
                      {step.label}
                    </div>
                    <span className="font-mono" style={{ fontSize: 9, letterSpacing: "0.1em", color: step.status === "running" ? "var(--biolum)" : step.status === "done" ? "var(--safe)" : step.status === "error" ? "var(--plasma)" : "var(--text-lo)" }}>
                      {step.code}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-lo)", display: step.status === "pending" && i !== 0 ? "none" : "block" }}>
                    {step.description}
                  </div>
                  {step.status === "running" && (
                    <div className="progress-bar" style={{ marginTop: 6 }}>
                      <div className="progress-fill" style={{ width: `${step.progress}%` }} />
                    </div>
                  )}
                  {step.status === "done" && (
                    <div className="progress-bar" style={{ marginTop: 0, height: 2 }}>
                      <div className="progress-fill" style={{ width: "100%", background: "var(--safe)", boxShadow: "none" }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Success CTA */}
          {finished && reportId && (
            <div style={{ padding: "16px 20px", borderTop: "1px solid var(--wire)", background: "rgba(0,230,118,0.05)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div className="font-mono" style={{ fontSize: 10, fontWeight: 700, color: "var(--safe)", letterSpacing: "0.12em" }}>
                  MISSION COMPLETE
                </div>
                <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 3 }}>
                  Report {reportId} generated successfully
                </div>
              </div>
              <button className="btn-primary" style={{ background: "var(--safe)", color: "#030710" }} onClick={() => router.push(`/rapport/${reportId}`)}>
                View Debrief <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {(finished || errorMsg) && (
        <button className="btn-ghost" onClick={reset} style={{ alignSelf: "flex-start" }}>
          ↺ New Mission
        </button>
      )}
    </div>
  );
}
