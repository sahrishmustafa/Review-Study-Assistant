"use client";

import { useEffect, useState } from "react";
import { analyticsApi } from "@/lib/api";

interface Stats {
  total_papers: number;
  processed_papers: number;
  included_papers: number;
  excluded_papers: number;
  total_extractions: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .overview()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const statCards = stats
    ? [
        { label: "Total Papers", value: stats.total_papers, color: "var(--accent-blue)", icon: "📄" },
        { label: "Processed", value: stats.processed_papers, color: "var(--accent-purple)", icon: "⚙️" },
        { label: "Included", value: stats.included_papers, color: "var(--accent-cyan)", icon: "✅" },
        { label: "Excluded", value: stats.excluded_papers, color: "var(--accent-rose)", icon: "❌" },
        { label: "Extractions", value: stats.total_extractions, color: "var(--accent-amber)", icon: "🔍" },
      ]
    : [];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          <span className="gradient-text">Dashboard</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          Overview of your systematic literature review
        </p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading...</p>
      ) : stats ? (
        <>
          {/* Stat cards grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 20,
              marginBottom: 40,
            }}
          >
            {statCards.map((card) => (
              <div key={card.label} className="glass-card pulse-glow" style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 28 }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: card.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {card.label}
                  </span>
                </div>
                <p style={{ fontSize: 36, fontWeight: 800, color: card.color, margin: 0 }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/papers" className="btn-primary" style={{ textDecoration: "none" }}>
                📥 Upload Papers
              </a>
              <a href="/extraction" className="btn-secondary" style={{ textDecoration: "none" }}>
                🔍 Run Extraction
              </a>
              <a href="/matrix" className="btn-secondary" style={{ textDecoration: "none" }}>
                📋 View Matrix
              </a>
              <a href="/analytics" className="btn-secondary" style={{ textDecoration: "none" }}>
                📈 Analytics
              </a>
              <a href="/zotero" className="btn-secondary" style={{ textDecoration: "none" }}>
                📚 Zotero Sync
              </a>
            </div>
          </div>
        </>
      ) : (
        <div className="glass-card" style={{ padding: 40, textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🚀</p>
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Welcome to SLR Platform</h2>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Start by uploading papers or connecting to Zotero
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <a href="/papers" className="btn-primary" style={{ textDecoration: "none" }}>
              Upload Papers
            </a>
            <a href="/zotero" className="btn-secondary" style={{ textDecoration: "none" }}>
              Connect Zotero
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
