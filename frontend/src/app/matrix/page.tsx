"use client";

import { useState, useEffect } from "react";
import { matrixApi, extractionApi, ExtractionSchema, Matrix } from "@/lib/api";

export default function MatrixPage() {
  const [schemas, setSchemas] = useState<ExtractionSchema[]>([]);
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    extractionApi.listSchemas().then(setSchemas).catch(() => {});
  }, []);

  const handleBuild = async () => {
    if (!selectedSchema) return;
    setLoading(true);
    try {
      const m = await matrixApi.build("Matrix " + new Date().toISOString().slice(0, 10), selectedSchema);
      setMatrix(m);
    } catch { alert("Failed to build matrix"); }
    setLoading(false);
  };

  const confidenceColor = (c: number) => {
    if (c >= 0.7) return "var(--accent-cyan)";
    if (c >= 0.4) return "var(--accent-amber)";
    return "var(--accent-rose)";
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Matrix</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Cross-paper comparison matrix</p>
      </div>

      {/* Build controls */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <select
          value={selectedSchema}
          onChange={(e) => setSelectedSchema(e.target.value)}
          style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
        >
          <option value="">Select extraction schema...</option>
          {schemas.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button className="btn-primary" onClick={handleBuild} disabled={!selectedSchema || loading}>
          {loading ? "Building..." : "📋 Build Matrix"}
        </button>
      </div>

      {/* Matrix table */}
      {matrix?.data?.rows?.length > 0 && (
        <div className="glass-card" style={{ overflow: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Paper</th>
                {matrix.data.fields.map((f: string) => <th key={f}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {matrix.data.rows.map((row: any) => (
                <tr key={row.paper_id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)", minWidth: 200 }}>{row.paper_title}</td>
                  {matrix.data.fields.map((f: string) => {
                    const val = row.values?.[f];
                    const conf = row.confidences?.[f] || 0;
                    return (
                      <td key={f}>
                        <div>{val || "—"}</div>
                        <div className="confidence-bar" style={{ width: 60, marginTop: 4 }}>
                          <div
                            className={`confidence-fill ${conf >= 0.7 ? "confidence-high" : conf >= 0.4 ? "confidence-medium" : "confidence-low"}`}
                            style={{ width: `${conf * 100}%` }}
                          />
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!matrix && !loading && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>📋</p>
          <p style={{ color: "var(--text-muted)" }}>Select a schema and build a matrix to see cross-paper comparisons.</p>
        </div>
      )}
    </div>
  );
}
