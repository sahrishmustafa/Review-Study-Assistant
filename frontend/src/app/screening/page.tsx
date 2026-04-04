"use client";

import { useState, useEffect } from "react";
import { screeningApi, ScreeningCriteria, ScreeningResult, papersApi, Paper } from "@/lib/api";

export default function ScreeningPage() {
  const [criteria, setCriteria] = useState<ScreeningCriteria[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  // New criteria form state
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(0.6);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [requiredKw, setRequiredKw] = useState("");
  const [excludedKw, setExcludedKw] = useState("");
  const [topicQuery, setTopicQuery] = useState("");
  const [paperTypes, setPaperTypes] = useState("");
  const [domain, setDomain] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      screeningApi.listCriteria().then(setCriteria).catch(() => {}),
      papersApi.list().then((r) => setPapers(r.papers)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const criteriaDef: Record<string, any> = {};
    if (yearFrom && yearTo) criteriaDef.year_range = [parseInt(yearFrom), parseInt(yearTo)];
    if (requiredKw.trim()) criteriaDef.required_keywords = requiredKw.split(",").map((s) => s.trim()).filter(Boolean);
    if (excludedKw.trim()) criteriaDef.excluded_keywords = excludedKw.split(",").map((s) => s.trim()).filter(Boolean);
    if (topicQuery.trim()) criteriaDef.topic_query = topicQuery.trim();
    if (paperTypes.trim()) criteriaDef.paper_types = paperTypes.split(",").map((s) => s.trim()).filter(Boolean);
    if (domain.trim()) criteriaDef.domain = domain.trim();

    try {
      if (editingId) {
        const updated = await screeningApi.updateCriteria(editingId, { name, criteria_definition: criteriaDef, threshold });
        setCriteria(criteria.map((c) => (c.id === editingId ? updated : c)));
        alert("Criteria updated");
      } else {
        const c = await screeningApi.createCriteria({ name, criteria_definition: criteriaDef, threshold });
        setCriteria([...criteria, c]);
        alert("Criteria created");
      }
      setShowCreate(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert(`Failed to save criteria: ${err.message}`);
    }
  };

  const resetForm = () => {
    setName(""); setThreshold(0.6); setYearFrom(""); setYearTo("");
    setRequiredKw(""); setExcludedKw(""); setTopicQuery(""); setPaperTypes(""); setDomain("");
    setEditingId(null);
  };

  const handleEdit = (c: ScreeningCriteria) => {
    setName(c.name);
    setThreshold(c.threshold);
    setYearFrom(c.criteria_definition.year_range?.[0]?.toString() || "");
    setYearTo(c.criteria_definition.year_range?.[1]?.toString() || "");
    setRequiredKw(c.criteria_definition.required_keywords?.join(", ") || "");
    setExcludedKw(c.criteria_definition.excluded_keywords?.join(", ") || "");
    setTopicQuery(c.criteria_definition.topic_query || "");
    setPaperTypes(c.criteria_definition.paper_types?.join(", ") || "");
    setDomain(c.criteria_definition.domain || "");
    setEditingId(c.id);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRun = async (criteriaId: string) => {
    setRunning(true);
    try {
      const res = await screeningApi.run(criteriaId);
      setResults(res.results);
      alert(`Screened ${res.total_screened} papers: ${res.passed} passed, ${res.failed} failed`);
    } catch { alert("Screening failed"); }
    setRunning(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this criteria?")) return;
    try {
      await screeningApi.deleteCriteria(id);
      setCriteria(criteria.filter((c) => c.id !== id));
    } catch { alert("Delete failed"); }
  };

  const scoreColor = (s: number) => s >= 0.7 ? "var(--accent-cyan)" : s >= 0.4 ? "var(--accent-amber)" : "var(--accent-rose)";

  const inputStyle = {
    padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, width: "100%",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Screening</span></h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Phase 1 — Define criteria and filter papers programmatically</p>
        </div>
        <button className="btn-primary" onClick={() => { if (showCreate) resetForm(); setShowCreate(!showCreate); }}>
          {showCreate ? "✕ Cancel" : "➕ New Criteria"}
        </button>
      </div>

      {/* Create criteria form */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>{editingId ? "Edit Screening Criteria" : "Define Screening Criteria"}</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Criteria Name *</label>
              <input placeholder="e.g., ML Healthcare SLR Filter" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Threshold (0.0 – 1.0)</label>
              <input type="number" step={0.1} min={0} max={1} value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} style={inputStyle} />
            </div>
          </div>

          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 12 }}>Filters</p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Year From</label>
              <input placeholder="2018" value={yearFrom} onChange={(e) => setYearFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Year To</label>
              <input placeholder="2025" value={yearTo} onChange={(e) => setYearTo(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Topic / Domain Query (semantic match)</label>
              <input placeholder="e.g., deep learning for medical image segmentation" value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Required Keywords (comma-separated)</label>
              <input placeholder="machine learning, healthcare" value={requiredKw} onChange={(e) => setRequiredKw(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Excluded Keywords (comma-separated)</label>
              <input placeholder="survey, review" value={excludedKw} onChange={(e) => setExcludedKw(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Paper Types (comma-separated)</label>
              <input placeholder="journal, conference" value={paperTypes} onChange={(e) => setPaperTypes(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Domain</label>
              <input placeholder="computer science" value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <button className="btn-primary" onClick={handleSave} disabled={!name}>💾 {editingId ? "Update Criteria" : "Save Criteria"}</button>
        </div>
      )}

      {/* Existing criteria */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16, marginBottom: 32 }}>
        {criteria.map((c) => (
          <div key={c.id} className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <h3 style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</h3>
              <span className="badge badge-processed" style={{ fontSize: 11 }}>Threshold: {c.threshold}</span>
            </div>
            {c.description && <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>{c.description}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {Object.entries(c.criteria_definition).map(([key, val]) => (
                <span key={key} className="badge badge-processed" style={{ fontSize: 10 }}>
                  {key}: {Array.isArray(val) ? val.join(", ") : String(val).slice(0, 30)}
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn-primary" onClick={() => handleRun(c.id)} disabled={running} style={{ fontSize: 13, padding: "8px 16px" }}>
                {running ? "Running..." : "▶️ Run"}
              </button>
              <button className="btn-secondary" onClick={() => handleEdit(c)} style={{ fontSize: 13, padding: "8px 16px" }}>
                ✏️ Edit
              </button>
              <button className="btn-secondary" onClick={() => handleDelete(c.id)} style={{ fontSize: 13, padding: "8px 16px", color: "var(--accent-rose)" }}>
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Results table */}
      {results.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Screening Results</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Paper</th>
                <th>Score</th>
                <th>Status</th>
                <th>Filter Scores</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.paper_id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)", maxWidth: 250 }}>{r.title}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: scoreColor(r.final_score), fontSize: 16 }}>
                      {(r.final_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.passed ? "badge-included" : "badge-excluded"}`}>
                      {r.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(r.filter_scores).map(([k, v]) => (
                        <span key={k} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--bg-secondary)", color: scoreColor(v) }}>
                          {k}: {(v * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 200 }}>{r.exclusion_reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {criteria.length === 0 && results.length === 0 && !loading && !showCreate && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🔍</p>
          <p style={{ color: "var(--text-muted)" }}>Define screening criteria to start filtering papers.</p>
        </div>
      )}
    </div>
  );
}
