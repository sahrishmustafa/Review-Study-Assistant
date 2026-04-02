"use client";

import { useState } from "react";
import { clustersApi, Cluster } from "@/lib/api";

const CLUSTER_COLORS = [
  "var(--accent-blue)", "var(--accent-purple)", "var(--accent-cyan)",
  "var(--accent-rose)", "var(--accent-amber)", "#4ade80", "#f97316",
];

export default function ClustersPage() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [numClusters, setNumClusters] = useState(5);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const result = await clustersApi.generate(numClusters);
      setClusters(result);
    } catch { alert("Clustering failed. Ensure papers have embeddings."); }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Clusters</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Semantic topic clustering of papers</p>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
        <label style={{ fontSize: 14, color: "var(--text-secondary)" }}>Number of clusters:</label>
        <input
          type="number" min={2} max={20} value={numClusters}
          onChange={(e) => setNumClusters(parseInt(e.target.value) || 5)}
          style={{ width: 60, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, textAlign: "center" }}
        />
        <button className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? "Clustering..." : "🧬 Generate Clusters"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {clusters.map((c) => (
          <div key={c.cluster_id} className="glass-card" style={{ padding: 20, borderLeft: `4px solid ${CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16, color: CLUSTER_COLORS[c.cluster_id % CLUSTER_COLORS.length] }}>
                {c.label}
              </h3>
              <span className="badge badge-processed">{c.size} papers</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {c.paper_ids.slice(0, 3).map((id) => (
                <div key={id} style={{ padding: "4px 0", borderBottom: "1px solid var(--border-color)" }}>
                  📄 {id.slice(0, 8)}...
                </div>
              ))}
              {c.paper_ids.length > 3 && (
                <div style={{ padding: "4px 0", color: "var(--accent-blue)" }}>
                  +{c.paper_ids.length - 3} more
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {clusters.length === 0 && !loading && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🧬</p>
          <p style={{ color: "var(--text-muted)" }}>Generate clusters to discover topic groups in your papers.</p>
        </div>
      )}
    </div>
  );
}
