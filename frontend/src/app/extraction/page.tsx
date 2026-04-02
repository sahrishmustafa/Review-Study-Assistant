"use client";

import { useState, useEffect } from "react";
import { extractionApi, ExtractionSchema } from "@/lib/api";

const FIELD_TYPES = ["string", "number", "boolean", "list"];

export default function ExtractionPage() {
  const [schemas, setSchemas] = useState<ExtractionSchema[]>([]);
  const [templates, setTemplates] = useState<Record<string, any>>({});
  const [showCreate, setShowCreate] = useState(false);
  const [newSchema, setNewSchema] = useState({ name: "", description: "", fields: [{ name: "", type: "string", description: "" }] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      extractionApi.listSchemas().then(setSchemas).catch(() => {}),
      extractionApi.getTemplates().then((r) => setTemplates(r.templates)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const addField = () => setNewSchema({ ...newSchema, fields: [...newSchema.fields, { name: "", type: "string", description: "" }] });
  const removeField = (i: number) => setNewSchema({ ...newSchema, fields: newSchema.fields.filter((_, idx) => idx !== i) });
  const updateField = (i: number, key: string, value: string) => {
    const fields = [...newSchema.fields];
    (fields[i] as any)[key] = value;
    setNewSchema({ ...newSchema, fields });
  };

  const handleCreate = async () => {
    try {
      const schema = await extractionApi.createSchema({
        name: newSchema.name,
        description: newSchema.description,
        fields_definition: newSchema.fields,
      });
      setSchemas([...schemas, schema]);
      setShowCreate(false);
      setNewSchema({ name: "", description: "", fields: [{ name: "", type: "string", description: "" }] });
    } catch { alert("Failed to create schema"); }
  };

  const loadTemplate = (key: string) => {
    const tpl = templates[key];
    if (tpl) {
      setNewSchema({ name: tpl.name, description: "", fields: tpl.fields_definition });
      setShowCreate(true);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Extraction</span></h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Define schemas and extract structured data from papers</p>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "✕ Cancel" : "➕ New Schema"}
        </button>
      </div>

      {/* Templates */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {Object.keys(templates).map((key) => (
          <button key={key} className="btn-secondary" onClick={() => loadTemplate(key)} style={{ fontSize: 13 }}>
            📋 {templates[key].name}
          </button>
        ))}
      </div>

      {/* Schema builder */}
      {showCreate && (
        <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Create Extraction Schema</h3>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <input
              placeholder="Schema name"
              value={newSchema.name}
              onChange={(e) => setNewSchema({ ...newSchema, name: e.target.value })}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
            />
            <input
              placeholder="Description (optional)"
              value={newSchema.description}
              onChange={(e) => setNewSchema({ ...newSchema, description: e.target.value })}
              style={{ flex: 2, padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
            />
          </div>

          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase" }}>Fields</p>
          {newSchema.fields.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
              <input placeholder="Field name" value={f.name} onChange={(e) => updateField(i, "name", e.target.value)}
                style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13 }} />
              <select value={f.type} onChange={(e) => updateField(i, "type", e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13 }}>
                {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Description" value={f.description} onChange={(e) => updateField(i, "description", e.target.value)}
                style={{ flex: 2, padding: "8px 12px", borderRadius: 6, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 13 }} />
              <button onClick={() => removeField(i)} style={{ color: "var(--accent-rose)", background: "none", border: "none", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button className="btn-secondary" onClick={addField} style={{ fontSize: 13 }}>➕ Add Field</button>
            <button className="btn-primary" onClick={handleCreate} disabled={!newSchema.name || newSchema.fields.every((f) => !f.name)}>
              💾 Save Schema
            </button>
          </div>
        </div>
      )}

      {/* Existing schemas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
        {schemas.map((s) => (
          <div key={s.id} className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{s.name}</h3>
            {s.description && <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>{s.description}</p>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {s.fields_definition.map((f: any) => (
                <span key={f.name} className="badge badge-processed" style={{ fontSize: 11 }}>
                  {f.name} ({f.type})
                </span>
              ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {s.template_type && `Template: ${s.template_type} • `}
              Created: {new Date(s.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {!loading && schemas.length === 0 && !showCreate && (
        <div className="glass-card" style={{ padding: 32, textAlign: "center" }}>
          <p style={{ fontSize: 36, marginBottom: 8 }}>🔍</p>
          <p style={{ color: "var(--text-muted)" }}>No schemas yet. Create one or load a template.</p>
        </div>
      )}
    </div>
  );
}
