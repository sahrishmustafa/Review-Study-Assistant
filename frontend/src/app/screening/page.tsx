"use client";

import { useState, useEffect, useRef, KeyboardEvent } from "react";
import { screeningApi, ScreeningCriteria, ScreeningResult, papersApi, Paper } from "@/lib/api";

// ── Tag chip input ─────────────────────────────────────────────────
function TagInput({
  label, hint, placeholder, value, onChange, color = "blue",
}: {
  label: string; hint: string; placeholder: string;
  value: string[]; onChange: (v: string[]) => void; color?: "blue" | "rose";
}) {
  const [input, setInput] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };

  const remove = (tag: string) => onChange(value.filter((t) => t !== tag));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); }
    if (e.key === "Backspace" && !input && value.length) remove(value[value.length - 1]);
  };

  const accentVar = color === "rose" ? "var(--accent-rose)" : "var(--accent-blue)";
  const bgAlpha = color === "rose" ? "rgba(244,114,182,0.12)" : "rgba(79,142,255,0.12)";

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
        {label}
      </label>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{hint}</p>
      <div
        onClick={() => ref.current?.focus()}
        style={{
          minHeight: 48, padding: "8px 12px", borderRadius: 10, border: "1px solid var(--border-color)",
          background: "var(--bg-primary)", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
          cursor: "text", transition: "border 0.2s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = accentVar)}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
      >
        {value.map((tag) => (
          <span
            key={tag}
            style={{
              display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20,
              fontSize: 12, fontWeight: 600, background: bgAlpha, color: accentVar, userSelect: "none",
            }}
          >
            {tag}
            <button
              onClick={(e) => { e.stopPropagation(); remove(tag); }}
              style={{ background: "none", border: "none", cursor: "pointer", color: accentVar,
                fontSize: 14, lineHeight: 1, padding: 0, display: "flex", alignItems: "center" }}
            >×</button>
          </span>
        ))}
        <input
          ref={ref}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={value.length === 0 ? placeholder : "Add more…"}
          style={{
            border: "none", outline: "none", background: "transparent", color: "var(--text-primary)",
            fontSize: 13, flex: 1, minWidth: 120,
          }}
        />
      </div>
    </div>
  );
}

// ── Toggle button group ────────────────────────────────────────────
const PAPER_TYPE_OPTIONS = [
  { label: "Journal", value: "journal" },
  { label: "Conference", value: "conference" },
  { label: "Workshop", value: "workshop" },
  { label: "Book Chapter", value: "book_chapter" },
  { label: "Preprint", value: "preprint" },
];

function PaperTypeToggle({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
        Paper Types
      </label>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
        Only include papers of these publication types. Leave all unselected to allow any type.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {PAPER_TYPE_OPTIONS.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              style={{
                padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: active ? "1px solid var(--accent-purple)" : "1px solid var(--border-color)",
                background: active ? "rgba(139,92,246,0.15)" : "var(--bg-secondary)",
                color: active ? "var(--accent-purple)" : "var(--text-muted)",
                transition: "all 0.2s",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Threshold slider ───────────────────────────────────────────────
function ThresholdSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const pct = Math.round(value * 100);
  const label = pct >= 70 ? "Strict" : pct >= 45 ? "Balanced" : "Lenient";
  const labelColor = pct >= 70 ? "var(--accent-cyan)" : pct >= 45 ? "var(--accent-amber)" : "var(--accent-rose)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
          Strictness Threshold
        </label>
        <span style={{ fontSize: 13, fontWeight: 700, color: labelColor }}>{label} ({pct}%)</span>
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>
        Papers scoring below this threshold are automatically excluded. Higher = fewer papers pass.
      </p>
      <div style={{ position: "relative" }}>
        <input
          type="range" min={0} max={1} step={0.05} value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ width: "100%", accentColor: labelColor }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2, fontSize: 10, color: "var(--text-muted)" }}>
          <span>Lenient (0%)</span><span>Balanced (50%)</span><span>Strict (100%)</span>
        </div>
      </div>
    </div>
  );
}

// ── Year range ─────────────────────────────────────────────────────
const CURRENT_YEAR = new Date().getFullYear();

function YearRange({
  from, to, onFromChange, onToChange,
}: { from: string; to: string; onFromChange: (v: string) => void; onToChange: (v: string) => void }) {
  const inputStyle: React.CSSProperties = {
    padding: "9px 14px", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14,
    width: "100%", textAlign: "center",
  };
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
        Publication Year Range
      </label>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
        Restrict papers to a specific publication period. Leave blank for no date restriction.
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <input type="number" placeholder="From (e.g. 2018)" min={1900} max={CURRENT_YEAR}
          value={from} onChange={(e) => onFromChange(e.target.value)} style={inputStyle} />
        <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 14 }}>→</span>
        <input type="number" placeholder={`To (e.g. ${CURRENT_YEAR})`} min={1900} max={CURRENT_YEAR}
          value={to} onChange={(e) => onToChange(e.target.value)} style={inputStyle} />
      </div>
    </div>
  );
}

// ── Human-friendly badge label map ─────────────────────────────────
const LABEL_MAP: Record<string, string> = {
  year_range: "Year Range",
  required_keywords: "Must-have Keywords",
  excluded_keywords: "Exclude Keywords",
  topic_query: "Topic",
  paper_types: "Paper Types",
  domain: "Domain",
};

// ── Score color ────────────────────────────────────────────────────
const scoreColor = (s: number) =>
  s >= 0.7 ? "var(--accent-cyan)" : s >= 0.4 ? "var(--accent-amber)" : "var(--accent-rose)";

// ── Main Page ──────────────────────────────────────────────────────
export default function ScreeningPage() {
  const [criteria, setCriteria] = useState<ScreeningCriteria[]>([]);
  const [results, setResults] = useState<ScreeningResult[]>([]);
  const [, setPapers] = useState<Paper[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCriteriaId, setActiveCriteriaId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [threshold, setThreshold] = useState(0.6);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [requiredKw, setRequiredKw] = useState<string[]>([]);
  const [excludedKw, setExcludedKw] = useState<string[]>([]);
  const [topicQuery, setTopicQuery] = useState("");
  const [paperTypes, setPaperTypes] = useState<string[]>([]);
  const [domain, setDomain] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      screeningApi.listCriteria().then(setCriteria).catch(() => {}),
      papersApi.list().then((r) => setPapers(r.papers)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const buildCriteriaDef = () => {
    const def: Record<string, any> = {};
    if (yearFrom && yearTo) def.year_range = [parseInt(yearFrom), parseInt(yearTo)];
    if (requiredKw.length) def.required_keywords = requiredKw;
    if (excludedKw.length) def.excluded_keywords = excludedKw;
    if (topicQuery.trim()) def.topic_query = topicQuery.trim();
    if (paperTypes.length) def.paper_types = paperTypes;
    if (domain.trim()) def.domain = domain.trim();
    return def;
  };

  const handleSave = async () => {
    const criteriaDef = buildCriteriaDef();
    try {
      if (editingId) {
        const updated = await screeningApi.updateCriteria(editingId, { name, criteria_definition: criteriaDef, threshold });
        setCriteria(criteria.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const c = await screeningApi.createCriteria({ name, criteria_definition: criteriaDef, threshold });
        setCriteria([...criteria, c]);
      }
      setShowCreate(false);
      setEditingId(null);
      resetForm();
    } catch (err: any) {
      alert(`Failed to save: ${err.message}`);
    }
  };

  const resetForm = () => {
    setName(""); setThreshold(0.6); setYearFrom(""); setYearTo("");
    setRequiredKw([]); setExcludedKw([]); setTopicQuery(""); setPaperTypes([]); setDomain("");
    setEditingId(null);
  };

  const handleEdit = (c: ScreeningCriteria) => {
    setName(c.name);
    setThreshold(c.threshold);
    setYearFrom(c.criteria_definition.year_range?.[0]?.toString() || "");
    setYearTo(c.criteria_definition.year_range?.[1]?.toString() || "");
    setRequiredKw(c.criteria_definition.required_keywords || []);
    setExcludedKw(c.criteria_definition.excluded_keywords || []);
    setTopicQuery(c.criteria_definition.topic_query || "");
    setPaperTypes(c.criteria_definition.paper_types || []);
    setDomain(c.criteria_definition.domain || "");
    setEditingId(c.id);
    setShowCreate(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleRun = async (criteriaId: string) => {
    setRunning(true);
    setActiveCriteriaId(criteriaId);
    try {
      const res = await screeningApi.run(criteriaId);
      setResults(res.results);
      alert(`Screening done! ${res.passed} passed / ${res.total_screened} total`);
    } catch { alert("Screening failed"); }
    setRunning(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this criteria set?")) return;
    try {
      await screeningApi.deleteCriteria(id);
      setCriteria(criteria.filter((c) => c.id !== id));
      if (activeCriteriaId === id) { setResults([]); setActiveCriteriaId(null); }
    } catch { alert("Delete failed"); }
  };

  // Build human-readable summary
  const buildSummary = (c: ScreeningCriteria) => {
    const parts: string[] = [];
    const def = c.criteria_definition;
    if (def.year_range) parts.push(`${def.year_range[0]}–${def.year_range[1]}`);
    if (def.topic_query) parts.push(`topic: "${def.topic_query.slice(0, 40)}"`);
    if (def.required_keywords?.length) parts.push(`needs: ${def.required_keywords.slice(0, 2).join(", ")}`);
    if (def.excluded_keywords?.length) parts.push(`excl: ${def.excluded_keywords.slice(0, 2).join(", ")}`);
    if (def.paper_types?.length) parts.push(def.paper_types.join(", "));
    if (def.domain) parts.push(`domain: ${def.domain}`);
    return parts.length ? parts.join(" · ") : "No filters configured";
  };

  const thresholdLabel = (t: number) =>
    t >= 0.7 ? "Strict" : t >= 0.45 ? "Balanced" : "Lenient";
  const thresholdLabelColor = (t: number) =>
    t >= 0.7 ? "var(--accent-cyan)" : t >= 0.45 ? "var(--accent-amber)" : "var(--accent-rose)";

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)",
    background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14, width: "100%",
  };

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Screening</span></h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Phase 1 — Define who qualifies. Run to filter your paper library.</p>
        </div>
        <button className="btn-primary" onClick={() => { if (showCreate) resetForm(); setShowCreate(!showCreate); }}>
          {showCreate ? "✕ Cancel" : "➕ New Criteria Set"}
        </button>
      </div>

      {/* CREATE / EDIT FORM */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 28, marginBottom: 28 }}>
          <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
            {editingId ? "Edit Criteria Set" : "New Criteria Set"}
          </h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
            Fill in only the filters you care about. Empty fields are ignored.
          </p>

          {/* Name */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
              Criteria Set Name *
            </label>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              A descriptive name so you can tell criteria sets apart later.
            </p>
            <input
              placeholder="e.g., Machine Learning in Healthcare Filter"
              value={name} onChange={(e) => setName(e.target.value)}
              style={inputStyle}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            <div style={{ gridColumn: "span 2" }}>
              <ThresholdSlider value={threshold} onChange={setThreshold} />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <YearRange from={yearFrom} to={yearTo} onFromChange={setYearFrom} onToChange={setYearTo} />
            </div>

            {/* Topic query */}
            <div style={{ gridColumn: "span 2" }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                Research Topic
              </label>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                Describe the research topic in plain language. Papers are semantically matched to this query.
              </p>
              <input placeholder="e.g., deep learning for medical image segmentation"
                value={topicQuery} onChange={(e) => setTopicQuery(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <TagInput
                label="Must-have Keywords"
                hint="Papers must contain at least one of these terms. Type a keyword and press Enter or comma."
                placeholder="e.g., machine learning"
                value={requiredKw} onChange={setRequiredKw} color="blue"
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <TagInput
                label="Exclude Keywords"
                hint="Papers containing these terms will be excluded. Type and press Enter or comma."
                placeholder="e.g., survey, review"
                value={excludedKw} onChange={setExcludedKw} color="rose"
              />
            </div>

            <div style={{ gridColumn: "span 2" }}>
              <PaperTypeToggle value={paperTypes} onChange={setPaperTypes} />
            </div>

            {/* Domain */}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                🏛️ Domain / Field
              </label>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
                Narrow to a specific research field (optional).
              </p>
              <input placeholder="e.g., computer science, bioinformatics"
                value={domain} onChange={(e) => setDomain(e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <button className="btn-primary" onClick={handleSave} disabled={!name}>
               {editingId ? "Update Criteria" : "Save Criteria Set"}
            </button>
            <button className="btn-secondary" onClick={() => { setShowCreate(false); resetForm(); }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing criteria cards */}
      {criteria.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16, marginBottom: 32 }}>
          {criteria.map((c) => {
            const isActive = activeCriteriaId === c.id;
            return (
              <div key={c.id} className="glass-card" style={{
                padding: 20,
                borderLeft: isActive ? "3px solid var(--accent-cyan)" : "3px solid transparent",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</h3>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 700,
                    background: `${thresholdLabelColor(c.threshold)}22`,
                    color: thresholdLabelColor(c.threshold),
                  }}>
                    {thresholdLabel(c.threshold)} ({Math.round(c.threshold * 100)}%)
                  </span>
                </div>

                <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, lineHeight: 1.5 }}>
                  {buildSummary(c)}
                </p>

                {/* Friendly filter pills */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
                  {Object.entries(c.criteria_definition).map(([key, val]) => {
                    const friendly = LABEL_MAP[key] || key;
                    const display = Array.isArray(val) ? val.join(", ") : String(val).slice(0, 40);
                    return (
                      <span key={key} style={{
                        fontSize: 11, padding: "3px 9px", borderRadius: 12,
                        background: "rgba(79,142,255,0.1)", color: "var(--accent-blue)", maxWidth: "100%", wordBreak: "break-all",
                      }}>
                        {friendly}: {display}
                      </span>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn-primary"
                    onClick={() => handleRun(c.id)}
                    disabled={running}
                    style={{ fontSize: 13, padding: "8px 16px", flex: 1 }}
                  >
                    {running && activeCriteriaId === c.id ? "⏳ Running…" : "▶️ Run Screening"}
                  </button>
                  <button className="btn-secondary" onClick={() => handleEdit(c)} style={{ fontSize: 13, padding: "8px 14px" }}>✏️</button>
                  <button className="btn-secondary" onClick={() => handleDelete(c.id)}
                    style={{ fontSize: 13, padding: "8px 14px", color: "var(--accent-rose)" }}>🗑️</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          {/* Summary banner */}
          <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-color)" }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Screening Results</h3>
            <div style={{ display: "flex", gap: 20 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-cyan)" }}>{passedCount}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Passed</div>
              </div>
              <div style={{ width: 1, background: "var(--border-color)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent-rose)" }}>{failedCount}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Excluded</div>
              </div>
              <div style={{ width: 1, background: "var(--border-color)" }} />
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)" }}>{results.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total</div>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
                <div style={{ width: "100%", height: 12, borderRadius: 6, background: "var(--bg-secondary)", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", width: `${(passedCount / results.length) * 100}%`,
                    background: "var(--gradient-success)", borderRadius: 6, transition: "width 0.8s ease",
                  }} />
                </div>
              </div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Paper</th>
                <th>Score</th>
                <th>Status</th>
                <th>Filter Breakdown</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.paper_id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)", maxWidth: 260 }}>{r.title}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontWeight: 700, color: scoreColor(r.final_score), fontSize: 15, minWidth: 40 }}>
                        {(r.final_score * 100).toFixed(0)}%
                      </span>
                      <div style={{ width: 48, height: 6, borderRadius: 3, background: "var(--bg-secondary)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${r.final_score * 100}%`, background: scoreColor(r.final_score), borderRadius: 3 }} />
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.passed ? "badge-included" : "badge-excluded"}`}>
                      {r.passed ? "✅ Passed" : "Excluded"}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {Object.entries(r.filter_scores).map(([k, v]) => (
                        <span key={k} style={{
                          fontSize: 10, padding: "2px 7px", borderRadius: 4,
                          background: "var(--bg-secondary)", color: scoreColor(v),
                        }}>
                          {LABEL_MAP[k] || k}: {(v * 100).toFixed(0)}%
                        </span>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 200 }}>
                    {r.exclusion_reason || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {criteria.length === 0 && results.length === 0 && !loading && !showCreate && (
        <div className="glass-card" style={{ padding: 48, textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🎯</p>
          <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No criteria sets yet</p>
          <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
            Create your first screening criteria set to start filtering your papers automatically.
          </p>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>➕ Create First Criteria Set</button>
        </div>
      )}
    </div>
  );
}
