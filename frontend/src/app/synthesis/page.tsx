"use client";

import { useState, useEffect } from "react";
import { synthesisApi, ClusterResult } from "@/lib/api";

const CLUSTER_COLORS = [
  "var(--accent-blue)", "var(--accent-purple)", "var(--accent-cyan)",
  "var(--accent-rose)", "var(--accent-amber)", "#4ade80", "#f97316",
];

export default function SynthesisPage() {
  const [activeTab, setActiveTab] = useState<"aggregate" | "methods" | "years" | "patterns" | "limitations">("aggregate");
  const [aggData, setAggData] = useState<{ fields: string[]; rows: any[]; total_papers: number } | null>(null);
  const [methodsData, setMethodsData] = useState<{ label: string; count: number }[]>([]);
  const [yearData, setYearData] = useState<{ year: number; count: number }[]>([]);
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  const [limitations, setLimitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [numClusters, setNumClusters] = useState(5);

  const loadTab = async (tab: typeof activeTab) => {
    setLoading(true);
    try {
      switch (tab) {
        case "aggregate":
          const agg = await synthesisApi.aggregate();
          setAggData(agg);
          break;
        case "methods":
          const methods = await synthesisApi.methodsDistribution();
          setMethodsData(methods.data);
          break;
        case "years":
          const years = await synthesisApi.yearTrends();
          setYearData(years.data);
          break;
        case "patterns":
          const pats = await synthesisApi.patterns(numClusters);
          setClusters(pats);
          break;
        case "limitations":
          const lims = await synthesisApi.limitations();
          setLimitations(lims.data);
          break;
      }
    } catch (e: any) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadTab(activeTab); }, [activeTab]);

  const maxMethod = Math.max(...methodsData.map((d) => d.count), 1);
  const maxYear = Math.max(...yearData.map((d) => d.count), 1);
  const scoreColor = (s: number) => s >= 0.7 ? "var(--accent-cyan)" : s >= 0.4 ? "var(--accent-amber)" : "var(--accent-rose)";

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Synthesis</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Phase 3 — Cross-paper analysis, patterns, and insights</p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { key: "aggregate", label: "📋 Aggregation Table" },
          { key: "methods", label: "📊 Methods" },
          { key: "years", label: "📈 Year Trends" },
          { key: "patterns", label: "🧬 Patterns" },
          { key: "limitations", label: "⚠️ Limitations" },
        ].map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{ padding: "10px 20px", fontSize: 13 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : (
        <>
          {/* Aggregation Table */}
          {activeTab === "aggregate" && aggData && (
            <div className="glass-card" style={{ overflow: "auto" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                <h3 style={{ fontWeight: 700 }}>Cross-Paper Comparison ({aggData.total_papers} papers)</h3>
              </div>
              {aggData.rows.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Year</th>
                      {aggData.fields.map((f) => <th key={f}>{f}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {aggData.rows.map((row: any) => (
                      <tr key={row.paper_id}>
                        <td style={{ fontWeight: 500, color: "var(--text-primary)", minWidth: 200 }}>{row.title}</td>
                        <td>{row.year || "—"}</td>
                        {aggData.fields.map((f) => {
                          const score = row.scores?.[f] || 0;
                          return (
                            <td key={f}>
                              <div style={{ fontSize: 13 }}>{row.values?.[f]?.slice(0, 80) || "—"}</div>
                              <div className="confidence-bar" style={{ width: 50, marginTop: 4 }}>
                                <div
                                  className={`confidence-fill ${score >= 0.7 ? "confidence-high" : score >= 0.4 ? "confidence-medium" : "confidence-low"}`}
                                  style={{ width: `${score * 100}%` }}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ padding: 20, color: "var(--text-muted)", textAlign: "center" }}>No data. Run evaluation first.</p>
              )}
            </div>
          )}

          {/* Methods Distribution */}
          {activeTab === "methods" && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📊 Methods Frequency</h3>
              {methodsData.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet. Run evaluation first.</p>
              ) : (
                methodsData.map((d) => (
                  <div key={d.label} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)" }}>{d.count}</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--bg-secondary)" }}>
                      <div style={{ height: "100%", width: `${(d.count / maxMethod) * 100}%`, borderRadius: 4, background: "var(--gradient-success)", transition: "width 0.8s ease" }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Year Trends */}
          {activeTab === "years" && (
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📈 Year Trends</h3>
              {yearData.length === 0 ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No year data available.</p>
              ) : (
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200 }}>
                  {yearData.map((d) => (
                    <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-blue)", marginBottom: 4 }}>{d.count}</span>
                      <div style={{ width: "100%", height: `${(d.count / maxYear) * 160}px`, borderRadius: "6px 6px 0 0", background: "var(--gradient-primary)", transition: "height 0.8s ease", minHeight: 4 }} />
                      <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, transform: "rotate(-45deg)" }}>{d.year}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Patterns (Clusters) */}
          {activeTab === "patterns" && (
            <div>
              <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 12, alignItems: "center" }}>
                <label style={{ fontSize: 14, color: "var(--text-secondary)" }}>Clusters:</label>
                <input type="number" min={2} max={20} value={numClusters} onChange={(e) => setNumClusters(parseInt(e.target.value) || 5)}
                  style={{ width: 60, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, textAlign: "center" }} />
                <button className="btn-primary" onClick={() => loadTab("patterns")} style={{ fontSize: 13, padding: "8px 16px" }}>🧬 Regenerate</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                {clusters.map((c) => (
                  <div key={c.cluster_id} className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length]}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <h3 style={{ fontWeight: 700, fontSize: 15, color: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}>{c.label}</h3>
                      <span className="badge badge-processed">{c.size} papers</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {c.paper_titles.slice(0, 4).map((title, j) => (
                        <div key={j} style={{ padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>📄 {title.slice(0, 60)}{title.length > 60 && "..."}</div>
                      ))}
                      {c.paper_titles.length > 4 && <div style={{ padding: "4px 0", color: "var(--accent-blue)" }}>+{c.paper_titles.length - 4} more</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Limitations */}
          {activeTab === "limitations" && (
            <div>
              {limitations.length === 0 ? (
                <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
                  <p style={{ color: "var(--text-muted)" }}>No limitations extracted yet. Add a RQ about limitations in Evaluation first.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {limitations.map((lim, i) => (
                    <div key={i} className="glass-card" style={{ padding: 16, borderLeft: "4px solid var(--accent-amber)" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{lim.paper_title}</div>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>{lim.limitation}</p>
                      {lim.source_quote && (
                        <div style={{ padding: 8, borderRadius: 6, background: "rgba(251, 191, 36, 0.06)", borderLeft: "3px solid var(--accent-amber)" }}>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>"{lim.source_quote}"</p>
                          {lim.source_page && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>Page {lim.source_page}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
