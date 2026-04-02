"use client";

import { useState, useEffect } from "react";
import { analyticsApi } from "@/lib/api";

export default function AnalyticsPage() {
  const [methodsData, setMethodsData] = useState<{ label: string; count: number }[]>([]);
  const [yearData, setYearData] = useState<{ year: number; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.methodsFrequency().then((r) => setMethodsData(r.data)).catch(() => {}),
      analyticsApi.yearTrends().then((r) => setYearData(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const maxMethod = Math.max(...methodsData.map((d) => d.count), 1);
  const maxYear = Math.max(...yearData.map((d) => d.count), 1);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Analytics</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Distributions, trends, and insights</p>
      </div>

      {loading ? (
        <p style={{ color: "var(--text-muted)" }}>Loading analytics...</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Methods frequency */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📊 Methods Frequency</h3>
            {methodsData.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No data yet. Run extraction first.</p>
            ) : (
              methodsData.map((d) => (
                <div key={d.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{d.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-cyan)" }}>{d.count}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "var(--bg-secondary)" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${(d.count / maxMethod) * 100}%`,
                        borderRadius: 4,
                        background: "var(--gradient-success)",
                        transition: "width 0.8s ease",
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Year trends */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📈 Year Trends</h3>
            {yearData.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No year data available.</p>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 200 }}>
                {yearData.map((d) => (
                  <div key={d.year} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-blue)", marginBottom: 4 }}>{d.count}</span>
                    <div
                      style={{
                        width: "100%",
                        height: `${(d.count / maxYear) * 160}px`,
                        borderRadius: "6px 6px 0 0",
                        background: "var(--gradient-primary)",
                        transition: "height 0.8s ease",
                        minHeight: 4,
                      }}
                    />
                    <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, transform: "rotate(-45deg)" }}>{d.year}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
