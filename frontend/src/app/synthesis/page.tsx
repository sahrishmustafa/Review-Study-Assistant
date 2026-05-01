"use client";

import { useState, useEffect } from "react";
import { synthesisApi, ClusterResult } from "@/lib/api";

// ── Palette ────────────────────────────────────────────────────────
const CLUSTER_COLORS = [
  "var(--accent-blue)", "var(--accent-purple)", "var(--accent-cyan)",
  "var(--accent-rose)", "var(--accent-amber)", "#4ade80", "#f97316",
];

const DONUT_COLORS = [
  "#4f8eff", "#8b5cf6", "#06d6a0", "#f472b6", "#fbbf24", "#4ade80", "#f97316",
  "#22d3ee", "#a78bfa", "#fb7185", "#34d399", "#fb923c",
];

// ── Donut Chart (SVG, no library) ──────────────────────────────────
function DonutChart({ data, maxShow = 8 }: { data: { label: string; count: number }[]; maxShow?: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return null;

  // Build sorted slices
  const sorted = [...data].sort((a, b) => b.count - a.count);
  const topN = sorted.slice(0, maxShow);
  const others = sorted.slice(maxShow);
  const othersTotal = others.reduce((s, d) => s + d.count, 0);
  const slices = othersTotal > 0 ? [...topN, { label: "Others", count: othersTotal }] : topN;

  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const R = 85;
  const r = 52;

  let cumAngle = -90;
  const paths = slices.map((d, i) => {
    const fraction = d.count / total;
    const sweep = fraction * 360;
    const startAngle = cumAngle;
    cumAngle += sweep;
    const endAngle = cumAngle;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const x1 = cx + R * Math.cos(toRad(startAngle));
    const y1 = cy + R * Math.sin(toRad(startAngle));
    const x2 = cx + R * Math.cos(toRad(endAngle));
    const y2 = cy + R * Math.sin(toRad(endAngle));
    const xi1 = cx + r * Math.cos(toRad(startAngle));
    const yi1 = cy + r * Math.sin(toRad(startAngle));
    const xi2 = cx + r * Math.cos(toRad(endAngle));
    const yi2 = cy + r * Math.sin(toRad(endAngle));
    const large = sweep > 180 ? 1 : 0;
    const path = [
      `M ${x1} ${y1}`,
      `A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`,
      `L ${xi2} ${yi2}`,
      `A ${r} ${r} 0 ${large} 0 ${xi1} ${yi1}`,
      "Z",
    ].join(" ");
    return { path, color: DONUT_COLORS[i % DONUT_COLORS.length], ...d, fraction };
  });

  const hov = hovered !== null ? paths[hovered] : null;

  return (
    <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <svg width={size} height={size}>
          {paths.map((p, i) => (
            <path
              key={i}
              d={p.path}
              fill={p.color}
              opacity={hovered === null || hovered === i ? 1 : 0.35}
              style={{ cursor: "pointer", transition: "opacity 0.2s, transform 0.2s", transformOrigin: `${cx}px ${cy}px`,
                transform: hovered === i ? "scale(1.04)" : "scale(1)" }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center label */}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="var(--text-primary)" fontSize={22} fontWeight={800}>
            {hov ? hov.count : total}
          </text>
          <text x={cx} y={cy + 14} textAnchor="middle" fill="var(--text-muted)" fontSize={10}>
            {hov ? hov.label.slice(0, 16) : "total papers"}
          </text>
          {hov && (
            <text x={cx} y={cy + 28} textAnchor="middle" fill={hov.color} fontSize={12} fontWeight={700}>
              {(hov.fraction * 100).toFixed(1)}%
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ flex: 1, minWidth: 160 }}>
        {paths.map((p, i) => (
          <div
            key={i}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{
              display: "flex", alignItems: "center", gap: 10, padding: "5px 8px", borderRadius: 6,
              marginBottom: 4, cursor: "pointer",
              background: hovered === i ? "rgba(79,142,255,0.06)" : "transparent",
              transition: "background 0.15s",
            }}
          >
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{p.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: p.color }}>{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Animated Bar Chart ─────────────────────────────────────────────
function BarChart({ data }: { data: { year: number; count: number }[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const maxHeight = 160;

  return (
    <div>
      {/* Y-axis guide lines */}
      <div style={{ position: "relative" }}>
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <div key={frac} style={{
            position: "absolute", left: 0, right: 0,
            bottom: `${frac * maxHeight + 20}px`,
            borderBottom: "1px dashed rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: 9, color: "var(--text-muted)", position: "absolute", left: -2, bottom: 2 }}>
              {Math.round(frac * maxCount)}
            </span>
          </div>
        ))}

        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: maxHeight + 40, paddingBottom: 28, paddingLeft: 20 }}>
          {data.map((d) => {
            const pct = (d.count / maxCount) * maxHeight;
            return (
              <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Tooltip */}
                <div style={{
                  position: "absolute", bottom: mounted ? pct + 30 : 20,
                  background: "var(--bg-card)", border: "1px solid var(--border-color)",
                  borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                  color: "var(--accent-blue)", whiteSpace: "nowrap", pointerEvents: "none",
                  opacity: 1,
                }}>
                  {d.count}
                </div>
                {/* Bar */}
                <div style={{
                  width: "100%", minWidth: 12,
                  height: mounted ? pct : 0,
                  borderRadius: "6px 6px 0 0",
                  background: "var(--gradient-primary)",
                  transition: "height 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  position: "absolute", bottom: 28,
                }} />
                {/* X label */}
                <span style={{
                  position: "absolute", bottom: 4, fontSize: 9, color: "var(--text-muted)",
                  transform: data.length > 8 ? "rotate(-45deg)" : "none",
                  whiteSpace: "nowrap",
                }}>{d.year}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }: { icon: string; value: string | number; label: string; color: string }) {
  return (
    <div className="glass-card" style={{ padding: "18px 22px", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

// ── Horizontal bar chart (for methods) ────────────────────────────
function HorizontalBars({ data }: { data: { label: string; count: number }[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {data.map((d, i) => (
        <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 160, fontSize: 12, color: "var(--text-secondary)", textAlign: "right", flexShrink: 0 }}>
            {d.label}
          </div>
          <div style={{ flex: 1, height: 18, background: "var(--bg-secondary)", borderRadius: 9, overflow: "hidden", position: "relative" }}>
            <div style={{
              height: "100%", borderRadius: 9,
              width: mounted ? `${(d.count / max) * 100}%` : "0%",
              background: DONUT_COLORS[i % DONUT_COLORS.length],
              transition: `width ${0.5 + i * 0.06}s cubic-bezier(0.34, 1.56, 0.64, 1)`,
              opacity: 0.85,
            }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: DONUT_COLORS[i % DONUT_COLORS.length], width: 30, textAlign: "right" }}>
            {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Cluster bubble card ────────────────────────────────────────────
function ClusterCard({ cluster, index }: { cluster: ClusterResult; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const color = CLUSTER_COLORS[cluster.cluster_id % CLUSTER_COLORS.length];
  const colorHex = DONUT_COLORS[cluster.cluster_id % DONUT_COLORS.length];
  const shown = expanded ? cluster.paper_titles : cluster.paper_titles.slice(0, 3);

  return (
    <div className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Bubble size indicator */}
          <div style={{
            width: 40, height: 40, borderRadius: "50%", background: `${colorHex}22`,
            border: `2px solid ${colorHex}`, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: color, flexShrink: 0,
          }}>
            {cluster.size}
          </div>
          <h3 style={{ fontWeight: 700, fontSize: 14, color }}>{cluster.label}</h3>
        </div>
        <span className="badge badge-processed" style={{ fontSize: 10 }}>{cluster.size} papers</span>
      </div>

      {/* Bar showing cluster size relative to others */}
      <div style={{ height: 4, borderRadius: 2, background: "var(--bg-secondary)", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${Math.min(100, (cluster.size / 10) * 100)}%`, borderRadius: 2, background: color }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {shown.map((title, j) => (
          <div key={j} style={{ fontSize: 11, color: "var(--text-muted)", padding: "4px 0",
            borderBottom: "1px solid var(--border-color)", display: "flex", gap: 6 }}>
            <span style={{ color, flexShrink: 0 }}>📄</span>
            {title.slice(0, 70)}{title.length > 70 && "…"}
          </div>
        ))}
      </div>

      {cluster.paper_titles.length > 3 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ marginTop: 8, background: "none", border: "none", cursor: "pointer",
            fontSize: 11, color: color, fontWeight: 600 }}
        >
          {expanded ? "▲ Show less" : `▼ +${cluster.paper_titles.length - 3} more papers`}
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────
export default function SynthesisPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "methods" | "years" | "patterns" | "limitations">("overview");
  const [aggData, setAggData] = useState<{ fields: string[]; rows: any[]; total_papers: number } | null>(null);
  const [methodsData, setMethodsData] = useState<{ label: string; count: number }[]>([]);
  const [yearData, setYearData] = useState<{ year: number; count: number }[]>([]);
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  const [limitations, setLimitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [numClusters, setNumClusters] = useState(5);
  const [viewMode, setViewMode] = useState<"donut" | "bars">("donut");

  const loadTab = async (tab: typeof activeTab) => {
    setLoading(true);
    try {
      switch (tab) {
        case "overview":
          const agg = await synthesisApi.aggregate();
          setAggData(agg);
          const m = await synthesisApi.methodsDistribution();
          setMethodsData(m.data);
          const y = await synthesisApi.yearTrends();
          setYearData(y.data);
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

  const scoreColor = (s: number) =>
    s >= 0.7 ? "var(--accent-cyan)" : s >= 0.4 ? "var(--accent-amber)" : "var(--accent-rose)";

  const yearRange = yearData.length
    ? `${Math.min(...yearData.map((d) => d.year))}–${Math.max(...yearData.map((d) => d.year))}`
    : "—";
  const peakYear = yearData.length
    ? yearData.reduce((a, b) => (a.count >= b.count ? a : b)).year
    : null;
  const totalPapers = aggData?.total_papers ?? (yearData.reduce((s, d) => s + d.count, 0) || null);

  const TABS = [
    { key: "overview", label: "📊 Overview" },
    { key: "methods", label: "🔬 Methods" },
    { key: "years", label: "📈 Year Trends" },
    { key: "patterns", label: "🧬 Clusters" },
    { key: "limitations", label: "⚠️ Limitations" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Synthesis</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Phase 3 — Cross-paper insights, trends, and patterns</p>
      </div>

      {/* Stat summary bar */}
      {(totalPapers || yearRange !== "—" || methodsData.length > 0) && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
          {totalPapers != null && (
            <StatCard icon="📄" value={totalPapers} label="Papers Analysed" color="var(--accent-blue)" />
          )}
          {methodsData.length > 0 && (
            <StatCard icon="🔬" value={methodsData.length} label="Distinct Methods" color="var(--accent-purple)" />
          )}
          {yearRange !== "—" && (
            <StatCard icon="📅" value={yearRange} label="Year Span" color="var(--accent-cyan)" />
          )}
          {peakYear && (
            <StatCard icon="🏆" value={peakYear} label="Peak Year" color="var(--accent-amber)" />
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={activeTab === tab.key ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            style={{ padding: "10px 18px", fontSize: 13 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⏳</div>
          <p style={{ color: "var(--text-muted)" }}>Loading synthesis data…</p>
        </div>
      ) : (
        <>
          {/* ── OVERVIEW TAB ── */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Methods donut + year bars side by side */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>🔬 Methods Distribution</h3>
                  {methodsData.length === 0
                    ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet. Run evaluation first.</p>
                    : <DonutChart data={methodsData} maxShow={6} />
                  }
                </div>
                <div className="glass-card" style={{ padding: 24 }}>
                  <h3 style={{ fontWeight: 700, marginBottom: 16 }}>📈 Year Trends</h3>
                  {yearData.length === 0
                    ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No year data available.</p>
                    : <BarChart data={yearData} />
                  }
                </div>
              </div>

              {/* Aggregation table */}
              {aggData && aggData.rows.length > 0 && (
                <div className="glass-card" style={{ overflow: "auto" }}>
                  <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
                    <h3 style={{ fontWeight: 700 }}>Cross-Paper Comparison ({aggData.total_papers} papers)</h3>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Paper</th><th>Year</th>
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
                                  <div className={`confidence-fill ${score >= 0.7 ? "confidence-high" : score >= 0.4 ? "confidence-medium" : "confidence-low"}`}
                                    style={{ width: `${score * 100}%` }} />
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
            </div>
          )}

          {/* ── METHODS TAB ── */}
          {activeTab === "methods" && (
            <div className="glass-card" style={{ padding: 28 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, fontSize: 17 }}>🔬 Methods & Techniques Distribution</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["donut", "bars"] as const).map((m) => (
                    <button key={m} onClick={() => setViewMode(m)}
                      className={viewMode === m ? "btn-primary" : "btn-secondary"}
                      style={{ fontSize: 12, padding: "6px 14px" }}>
                      {m === "donut" ? "🍩 Donut" : "📊 Bars"}
                    </button>
                  ))}
                </div>
              </div>
              {methodsData.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet. Run evaluation first.</p>
                : viewMode === "donut"
                  ? <DonutChart data={methodsData} />
                  : <HorizontalBars data={methodsData} />
              }
            </div>
          )}

          {/* ── YEARS TAB ── */}
          {activeTab === "years" && (
            <div className="glass-card" style={{ padding: 28 }}>
              <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 20 }}>📈 Publication Year Trends</h3>
              {yearData.length === 0
                ? <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No year data available.</p>
                : (
                  <>
                    <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
                      <div style={{ padding: "10px 18px", borderRadius: 8, background: "rgba(79,142,255,0.08)", border: "1px solid rgba(79,142,255,0.2)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Year Span</div>
                        <div style={{ fontWeight: 700, color: "var(--accent-blue)" }}>{yearRange}</div>
                      </div>
                      {peakYear && (
                        <div style={{ padding: "10px 18px", borderRadius: 8, background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Peak Year</div>
                          <div style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{peakYear}</div>
                        </div>
                      )}
                      <div style={{ padding: "10px 18px", borderRadius: 8, background: "rgba(6,214,160,0.08)", border: "1px solid rgba(6,214,160,0.2)" }}>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Total Points</div>
                        <div style={{ fontWeight: 700, color: "var(--accent-cyan)" }}>{yearData.reduce((s, d) => s + d.count, 0)}</div>
                      </div>
                    </div>
                    <BarChart data={yearData} />
                  </>
                )
              }
            </div>
          )}

          {/* ── PATTERNS TAB ── */}
          {activeTab === "patterns" && (
            <div>
              <div className="glass-card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ fontSize: 14, color: "var(--text-secondary)" }}>Number of clusters:</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[3, 4, 5, 6, 8].map((n) => (
                    <button key={n} onClick={() => setNumClusters(n)}
                      className={numClusters === n ? "btn-primary" : "btn-secondary"}
                      style={{ fontSize: 13, padding: "6px 14px", minWidth: 40 }}>
                      {n}
                    </button>
                  ))}
                </div>
                <button className="btn-primary" onClick={() => loadTab("patterns")} style={{ fontSize: 13, padding: "8px 16px" }}>
                  🧬 Regenerate
                </button>
                {clusters.length > 0 && (
                  <div style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
                    {clusters.reduce((s, c) => s + c.size, 0)} papers across {clusters.length} clusters
                  </div>
                )}
              </div>

              {clusters.length === 0 ? (
                <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>🧬</p>
                  <p style={{ color: "var(--text-muted)" }}>No cluster data yet. Click Regenerate above.</p>
                </div>
              ) : (
                <>
                  {/* Bubble size legend */}
                  <div className="glass-card" style={{ padding: "12px 20px", marginBottom: 16, display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Cluster sizes:</span>
                    {clusters.sort((a, b) => b.size - a.size).map((c) => {
                      const color = CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length];
                      const hex = DONUT_COLORS[c.cluster_id % DONUT_COLORS.length];
                      const sz = Math.max(20, Math.min(48, 16 + c.size * 3));
                      return (
                        <div key={c.cluster_id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{
                            width: sz, height: sz, borderRadius: "50%",
                            background: `${hex}22`, border: `2px solid ${hex}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 800, color, flexShrink: 0,
                          }}>{c.size}</div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{c.label.slice(0, 20)}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
                    {clusters.map((c, i) => <ClusterCard key={c.cluster_id} cluster={c} index={i} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── LIMITATIONS TAB ── */}
          {activeTab === "limitations" && (
            <div>
              {limitations.length === 0 ? (
                <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
                  <p style={{ fontSize: 36, marginBottom: 8 }}>⚠️</p>
                  <p style={{ color: "var(--text-muted)" }}>
                    No limitations extracted yet. Add a Research Question about limitations in the Evaluation phase first.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                    <div className="glass-card" style={{ padding: "10px 18px" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Limitations </span>
                      <span style={{ fontWeight: 700, color: "var(--accent-amber)" }}>{limitations.length}</span>
                    </div>
                    <div className="glass-card" style={{ padding: "10px 18px" }}>
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>From </span>
                      <span style={{ fontWeight: 700, color: "var(--accent-blue)" }}>
                        {new Set(limitations.map((l) => l.paper_title)).size} papers
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {limitations.map((lim, i) => (
                      <div key={i} className="glass-card" style={{ padding: 18, borderLeft: "4px solid var(--accent-amber)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{lim.paper_title}</div>
                          <span style={{
                            fontSize: 10, padding: "2px 9px", borderRadius: 12, fontWeight: 700,
                            background: "rgba(251,191,36,0.12)", color: "var(--accent-amber)", flexShrink: 0, marginLeft: 8,
                          }}>⚠️ Limitation</span>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: lim.source_quote ? 10 : 0 }}>
                          {lim.limitation}
                        </p>
                        {lim.source_quote && (
                          <div style={{ padding: "8px 12px", borderRadius: 6, background: "rgba(251,191,36,0.06)", borderLeft: "3px solid var(--accent-amber)" }}>
                            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>"{lim.source_quote}"</p>
                            {lim.source_page && (
                              <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>— Page {lim.source_page}</p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
