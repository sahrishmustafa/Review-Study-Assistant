"use client";

import { useState, useEffect } from "react";
import { evaluationApi, ResearchQuestion, PaperEvaluation, EvaluationSummaryItem, papersApi, Paper } from "@/lib/api";

export default function EvaluationPage() {
  const [questions, setQuestions] = useState<ResearchQuestion[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [summary, setSummary] = useState<EvaluationSummaryItem[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<PaperEvaluation | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);

  const [newQ, setNewQ] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newWeight, setNewWeight] = useState(1.0);

  useEffect(() => {
    Promise.all([
      evaluationApi.listQuestions().then(setQuestions).catch(() => {}),
      papersApi.list("included").then((r) => setPapers(r.papers)).catch(() =>
        papersApi.list("processed").then((r) => setPapers(r.papers)).catch(() => {})
      ),
      evaluationApi.getSummary().then(setSummary).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleAddQuestion = async () => {
    try {
      const rq = await evaluationApi.createQuestion({ question_text: newQ, description: newDesc || undefined, weight: newWeight });
      setQuestions([...questions, rq]);
      setNewQ(""); setNewDesc(""); setNewWeight(1.0);
      setShowCreate(false);
    } catch { alert("Failed to add question"); }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this research question?")) return;
    try {
      await evaluationApi.deleteQuestion(id);
      setQuestions(questions.filter((q) => q.id !== id));
    } catch { alert("Delete failed"); }
  };

  const handleRunAll = async () => {
    if (papers.length === 0) { alert("No papers to evaluate. Process and screen papers first."); return; }
    if (questions.length === 0) { alert("Add research questions first."); return; }
    setRunning(true);
    try {
      const res = await evaluationApi.run(papers.map((p) => p.id));
      alert(`Evaluated ${res.total_evaluated} papers: ${res.passed} passed, ${res.failed} failed`);
      evaluationApi.getSummary().then(setSummary).catch(() => {});
    } catch { alert("Evaluation failed"); }
    setRunning(false);
  };

  const handleViewDetails = async (paperId: string) => {
    try {
      const details = await evaluationApi.getResults(paperId);
      setSelectedPaper(details);
    } catch { alert("Failed to load details"); }
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
          <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Evaluation</span></h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Phase 2 — Deep LLM-based paper evaluation with provenance</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn-secondary" onClick={() => setShowCreate(!showCreate)}>
            {showCreate ? "✕ Cancel" : "➕ Add Question"}
          </button>
          <button className="btn-primary" onClick={handleRunAll} disabled={running || questions.length === 0}>
            {running ? "Evaluating..." : "🧪 Run Evaluation"}
          </button>
        </div>
      </div>

      {/* Add RQ form */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Add Research Question</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input placeholder="Research question (e.g., What methodology does this paper use?)" value={newQ} onChange={(e) => setNewQ(e.target.value)} style={inputStyle} />
            <div style={{ display: "flex", gap: 12 }}>
              <input placeholder="Description (optional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} style={{ ...inputStyle, flex: 2 }} />
              <input type="number" step={0.1} min={0.1} max={5} value={newWeight} onChange={(e) => setNewWeight(parseFloat(e.target.value))} placeholder="Weight" style={{ ...inputStyle, flex: 0, width: 100 }} />
            </div>
            <button className="btn-primary" onClick={handleAddQuestion} disabled={!newQ} style={{ alignSelf: "flex-start" }}>💾 Save Question</button>
          </div>
        </div>
      )}

      {/* Research Questions */}
      {questions.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Research Questions ({questions.length})</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 12 }}>
            {questions.map((q) => (
              <div key={q.id} className="glass-card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)", marginBottom: 4 }}>{q.question_text}</p>
                  {q.description && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{q.description}</p>}
                  <span className="badge badge-processed" style={{ fontSize: 10, marginTop: 6 }}>Weight: {q.weight}</span>
                </div>
                <button onClick={() => handleDeleteQuestion(q.id)} style={{ color: "var(--accent-rose)", background: "none", border: "none", cursor: "pointer", fontSize: 14, marginLeft: 8 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Summary */}
      {summary.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden", marginBottom: 24 }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>📊 Evaluation Results (ranked by score)</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Paper</th>
                <th>Score</th>
                <th>Status</th>
                <th>RQs Evaluated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.paper_id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)", maxWidth: 300 }}>{s.title}</td>
                  <td>
                    <span style={{ fontWeight: 700, color: scoreColor(s.final_score), fontSize: 16 }}>
                      {(s.final_score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.passed ? "badge-included" : "badge-excluded"}`}>
                      {s.passed ? "Passed" : "Failed"}
                    </span>
                  </td>
                  <td>{s.rq_count}</td>
                  <td>
                    <button className="btn-secondary" onClick={() => handleViewDetails(s.paper_id)} style={{ fontSize: 12, padding: "6px 12px" }}>
                      🔎 Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paper detail modal */}
      {selectedPaper && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24, borderLeft: "4px solid var(--accent-blue)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>
              📄 {selectedPaper.title}
              <span style={{ marginLeft: 12, fontWeight: 700, color: scoreColor(selectedPaper.final_score) }}>
                {(selectedPaper.final_score * 100).toFixed(0)}%
              </span>
            </h3>
            <button onClick={() => setSelectedPaper(null)} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>

          {selectedPaper.evaluations.map((ev, i) => (
            <div key={i} style={{ marginBottom: 20, padding: 16, borderRadius: 8, background: "var(--bg-secondary)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-blue)" }}>❓ {ev.question}</p>
                <span style={{ fontWeight: 700, color: scoreColor(ev.score) }}>{(ev.score * 100).toFixed(0)}%</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-primary)", marginBottom: 8 }}>{ev.answer || "No answer"}</p>

              {ev.source_quote && (
                <div style={{ padding: 10, borderRadius: 6, background: "rgba(79, 142, 255, 0.06)", borderLeft: "3px solid var(--accent-blue)", marginBottom: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 4 }}>Source Quote</p>
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>"{ev.source_quote}"</p>
                  {ev.source_page && <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>Page {ev.source_page}</p>}
                </div>
              )}

              {ev.reasoning && (
                <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  <span style={{ fontWeight: 600 }}>Reasoning:</span> {ev.reasoning}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {questions.length === 0 && summary.length === 0 && !loading && !showCreate && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🧪</p>
          <p style={{ color: "var(--text-muted)" }}>Add research questions, then run evaluation against your papers.</p>
        </div>
      )}
    </div>
  );
}
