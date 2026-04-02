"use client";

import { useState } from "react";
import { zoteroApi } from "@/lib/api";

export default function ZoteroPage() {
  const [apiKey, setApiKey] = useState("");
  const [libraryId, setLibraryId] = useState("");
  const [connected, setConnected] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const handleConnect = async () => {
    try {
      const result = await zoteroApi.connect(apiKey, libraryId);
      setConnected(true);
      setMessage(result.message);
      // Fetch collections
      const cols = await zoteroApi.collections();
      setCollections(cols.collections);
    } catch (e: any) {
      setMessage(`Connection failed: ${e.message}`);
    }
  };

  const handleSync = async (collectionKey?: string) => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await zoteroApi.sync(collectionKey);
      setSyncResult(`Synced: ${result.new_papers} new, ${result.updated_papers} updated`);
    } catch (e: any) {
      setSyncResult(`Sync failed: ${e.message}`);
    }
    setSyncing(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}><span className="gradient-text">Zotero</span></h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Connect and sync your Zotero library</p>
      </div>

      {/* Connection form */}
      {!connected ? (
        <div className="glass-card" style={{ padding: 24, maxWidth: 500 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Connect to Zotero</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              placeholder="Zotero API Key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
            />
            <input
              placeholder="Library ID"
              value={libraryId}
              onChange={(e) => setLibraryId(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-color)", background: "var(--bg-primary)", color: "var(--text-primary)", fontSize: 14 }}
            />
            <button className="btn-primary" onClick={handleConnect} disabled={!apiKey || !libraryId}>
              📚 Connect
            </button>
          </div>
          {message && <p style={{ marginTop: 12, fontSize: 13, color: message.includes("failed") ? "var(--accent-rose)" : "var(--accent-cyan)" }}>{message}</p>}
        </div>
      ) : (
        <>
          {/* Sync controls */}
          <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>✅ Connected</span>
            <button className="btn-primary" onClick={() => handleSync()} disabled={syncing}>
              {syncing ? "Syncing..." : "🔄 Sync All Papers"}
            </button>
            {syncResult && <span style={{ fontSize: 13, color: "var(--accent-cyan)" }}>{syncResult}</span>}
          </div>

          {/* Collections */}
          {collections.length > 0 && (
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: 16, fontSize: 16 }}>Collections</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {collections.map((c: any) => (
                  <div key={c.key} className="glass-card" style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>📁 {c.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.num_items} items</div>
                    </div>
                    <button className="btn-secondary" onClick={() => handleSync(c.key)} style={{ padding: "6px 12px", fontSize: 12 }}>
                      Sync
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
