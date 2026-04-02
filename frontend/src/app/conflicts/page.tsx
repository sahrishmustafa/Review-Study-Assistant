"use client";

import { useState } from "react";
import { conflictsApi, Conflict } from "@/lib/api";

export default function ConflictsPage() {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(false);
  const [fieldName, setFieldName] = useState("");

  const detect = async () => {
    setLoading(true);
    try {
      const result = await conflictsApi.detect(fieldName || undefined);
      setConflicts(result);
    } catch { alert("Conflict detection failed"); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Conflicts</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Detect contradictory findings across papers</p>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          placeholder="Filter by field name (optional)"
          value={fieldName}
          onChange={(e) => setFieldName(e.target.value)}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
        />
        <button className="btn-primary" onClick={detect} disabled={loading}>
          {loading ? "Detecting..." : "⚠️ Detect Conflicts"}
        </button>
      </div>

      {conflicts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {conflicts.map((c, i) => (
            <div key={i} className="glass-card" style={{ padding: 20, borderLeft: "4px solid var(--accent-rose)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: 16 }}>
                  <span style={{ color: "var(--accent-rose)" }}>⚠️</span> {c.topic}
                </h3>
                <span className="badge badge-excluded">Conflict</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>{c.details}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {c.papers.slice(0, 4).map((p: any, j: number) => (
                  <div key={j} style={{ padding: 10, borderRadius: 8, background: "var(--bg-secondary)", fontSize: 12 }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{p.paper_title}</div>
                    <div style={{ color: "var(--accent-amber)" }}>Value: {p.value}</div>
                    <div style={{ color: "var(--text-muted)" }}>Confidence: {(p.confidence * 100).toFixed(0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {conflicts.length === 0 && !loading && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
          <p style={{ color: "var(--text-muted)" }}>Run conflict detection to find contradictory findings in your extracted data.</p>
        </div>
      )}
    </div>
  );
}
