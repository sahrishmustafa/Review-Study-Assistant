"use client";

import { useState, useEffect, useRef } from "react";
import { papersApi, Paper } from "@/lib/api";

export default function PapersPage() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    papersApi
      .list(filter || undefined)
      .then((r) => { setPapers(r.papers); setTotal(r.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      if (files.length === 1) {
        await papersApi.upload(files[0]);
      } else {
        await papersApi.uploadBulk(Array.from(files));
      }
      load();
    } catch { alert("Upload failed"); }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleProcess = async (id: string) => {
    try {
      await papersApi.process(id);
      load();
    } catch { alert("Processing failed"); }
  };

  const handleProcessAll = async () => {
    const pending = papers.filter((p) => p.status === "pending");
    if (pending.length === 0) { alert("No pending papers to process"); return; }
    for (const p of pending) {
      try { await papersApi.process(p.id); } catch {}
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this paper?")) return;
    try {
      await papersApi.delete(id);
      load();
    } catch { alert("Delete failed"); }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you absolutely sure? This will delete ALL papers and clear the vector store.")) return;
    try {
      await papersApi.deleteAll();
      load();
    } catch { alert("Bulk delete failed"); }
  };

  const statusBadge = (s: string) => {
    const cls = `badge badge-${s}`;
    return <span className={cls}>{s}</span>;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Papers</span></h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{total} papers in library</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <input type="file" ref={fileRef} accept=".pdf" multiple onChange={handleUpload} style={{ display: "none" }} />
          <button className="btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "📥 Upload PDFs"}
          </button>
          <button className="btn-secondary" onClick={handleProcessAll}>
            ⚙️ Process All Pending
          </button>
          <button className="btn-secondary" style={{ color: "var(--accent-rose)" }} onClick={handleDeleteAll}>
            🗑️ Delete All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["", "pending", "processed", "included", "excluded"].map((s) => (
          <button
            key={s}
            className={filter === s ? "btn-primary" : "btn-secondary"}
            onClick={() => setFilter(s)}
            style={{ padding: "8px 16px", fontSize: 13 }}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 24, color: "var(--text-muted)" }}>Loading...</p>
        ) : papers.length === 0 ? (
          <p style={{ padding: 24, color: "var(--text-muted)", textAlign: "center" }}>
            No papers found. Upload a PDF to get started.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Authors</th>
                <th>Year</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {papers.map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 500, color: "var(--text-primary)", maxWidth: 300 }}>{p.title}</td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.authors?.join(", ") || "—"}
                  </td>
                  <td>{p.year || "—"}</td>
                  <td>{statusBadge(p.status)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      {p.status === "pending" && (
                        <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => handleProcess(p.id)}>
                          ⚙️ Process
                        </button>
                      )}
                      <button className="btn-secondary" style={{ padding: "6px 12px", fontSize: 12, color: "var(--accent-rose)" }} onClick={() => handleDelete(p.id)}>
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
