"use client";

import { useEffect, useState } from "react";
import { synthesisApi, SynthesisOverview } from "@/lib/api";

export default function Dashboard() {
  const [stats, setStats] = useState<SynthesisOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    synthesisApi
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
        { label: "Evaluations", value: stats.total_evaluations, color: "var(--accent-amber)", icon: "🧪" },
        { label: "Research Qs", value: stats.total_research_questions, color: "var(--accent-blue)", icon: "❓" },
      ]
    : [];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
          <span className="gradient-text">Dashboard</span>
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
          AI-powered systematic literature review pipeline
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
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 16,
              marginBottom: 32,
            }}
          >
            {statCards.map((card) => (
              <div key={card.label} className="glass-card pulse-glow" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 24 }}>{card.icon}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: card.color,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {card.label}
                  </span>
                </div>
                <p style={{ fontSize: 32, fontWeight: 800, color: card.color, margin: 0 }}>
                  {card.value}
                </p>
              </div>
            ))}
          </div>

          {/* Pipeline flow */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🔄 Scolar Sense Pipeline</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
              {[
                { phase: "Phase 0", label: "Document Processing", desc: "Upload & vectorize papers", href: "/papers", icon: "📥", color: "var(--accent-blue)" },
                { phase: "Phase 1", label: "Screening", desc: "Coarse programmatic filtering", href: "/screening", icon: "🔍", color: "var(--accent-purple)" },
                { phase: "Phase 2", label: "Evaluation", desc: "Deep LLM-based assessment", href: "/evaluation", icon: "🧪", color: "var(--accent-cyan)" },
                { phase: "Phase 3", label: "Synthesis", desc: "Cross-paper analysis", href: "/synthesis", icon: "📈", color: "var(--accent-amber)" },
              ].map((p) => (
                <a key={p.phase} href={p.href} className="glass-card" style={{ padding: 20, textDecoration: "none", borderTop: `3px solid ${p.color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: p.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {p.phase}
                  </div>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{p.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.desc}</div>
                </a>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <a href="/papers" className="btn-primary" style={{ textDecoration: "none" }}>
                📥 Upload Papers
              </a>
              <a href="/screening" className="btn-secondary" style={{ textDecoration: "none" }}>
                🔍 Run Screening
              </a>
              <a href="/evaluation" className="btn-secondary" style={{ textDecoration: "none" }}>
                🧪 Run Evaluation
              </a>
              <a href="/synthesis" className="btn-secondary" style={{ textDecoration: "none" }}>
                📈 View Synthesis
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
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Welcome to Scolar Sense</h2>
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
