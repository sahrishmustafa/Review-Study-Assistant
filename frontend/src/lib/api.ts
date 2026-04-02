/**
 * API client for the SLR backend.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "API Error");
  }
  return res.json();
}

// ── Papers ────────────────────────────────────────────────────────

export interface Paper {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  abstract: string | null;
  pdf_path: string | null;
  status: string;
  exclusion_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaperList { papers: Paper[]; total: number; }

export const papersApi = {
  list: (status?: string) =>
    request<PaperList>(`/papers${status ? `?status=${status}` : ""}`),
  get: (id: string) => request<Paper>(`/papers/${id}`),
  upload: async (file: File, title?: string) => {
    const form = new FormData();
    form.append("file", file);
    const url = `${API_BASE}/papers/upload${title ? `?title=${encodeURIComponent(title)}` : ""}`;
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    return res.json() as Promise<Paper>;
  },
  process: (id: string) => request<{ message: string }>(`/papers/${id}/process`, { method: "POST" }),
  updateStatus: (id: string, status: string, reason?: string) =>
    request<Paper>(`/papers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, exclusion_reason: reason }),
    }),
  delete: (id: string) => request<{ message: string }>(`/papers/${id}`, { method: "DELETE" }),
  getChunks: (id: string) => request<Chunk[]>(`/papers/${id}/chunks`),
};

// ── Chunks ────────────────────────────────────────────────────────

export interface Chunk {
  id: string;
  text: string;
  page_number: number;
  section: string | null;
  chunk_index: number;
}

// ── Extraction ────────────────────────────────────────────────────

export interface ExtractionSchema {
  id: string;
  name: string;
  description: string | null;
  fields_definition: { name: string; type: string; description?: string }[];
  template_type: string | null;
  created_at: string;
}

export interface ExtractionResult {
  id: string;
  paper_id: string;
  schema_id: string;
  field_name: string;
  value: string | null;
  confidence: number;
  source_text: string | null;
  source_page: number | null;
  source_chunk_id: string | null;
  is_user_corrected: boolean;
  created_at: string;
}

export const extractionApi = {
  getTemplates: () => request<{ templates: Record<string, any> }>("/extraction/templates"),
  listSchemas: () => request<ExtractionSchema[]>("/extraction/schemas"),
  createSchema: (data: any) =>
    request<ExtractionSchema>("/extraction/schemas", { method: "POST", body: JSON.stringify(data) }),
  run: (schemaId: string, paperIds: string[]) =>
    request<any[]>("/extraction/run", {
      method: "POST",
      body: JSON.stringify({ schema_id: schemaId, paper_ids: paperIds }),
    }),
  getResults: (paperId: string, schemaId?: string) =>
    request<ExtractionResult[]>(`/extraction/results/${paperId}${schemaId ? `?schema_id=${schemaId}` : ""}`),
  correctResult: (id: string, value: string) =>
    request<ExtractionResult>(`/extraction/results/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ value }),
    }),
};

// ── Matrix ────────────────────────────────────────────────────────

export interface Matrix { id: string; name: string; schema_id: string; data: any; created_at: string; }

export const matrixApi = {
  build: (name: string, schemaId: string, paperIds?: string[]) =>
    request<Matrix>("/matrix/build", {
      method: "POST",
      body: JSON.stringify({ name, schema_id: schemaId, paper_ids: paperIds }),
    }),
  get: (id: string) => request<Matrix>(`/matrix/${id}`),
};

// ── Analytics ─────────────────────────────────────────────────────

export const analyticsApi = {
  methodsFrequency: () => request<{ data: { label: string; count: number }[] }>("/analytics/methods-frequency"),
  yearTrends: () => request<{ data: { year: number; count: number }[] }>("/analytics/year-trends"),
  distribution: (field: string) =>
    request<{ field: string; data: { label: string; count: number }[] }>(`/analytics/distributions/${field}`),
  overview: () => request<any>("/overview"),
};

// ── Clusters ──────────────────────────────────────────────────────

export interface Cluster { cluster_id: number; label: string; paper_ids: string[]; size: number; }

export const clustersApi = {
  generate: (numClusters: number = 5) =>
    request<Cluster[]>("/clusters/generate", {
      method: "POST",
      body: JSON.stringify({ num_clusters: numClusters }),
    }),
  get: () => request<Cluster[]>("/clusters"),
};

// ── Conflicts ─────────────────────────────────────────────────────

export interface Conflict { topic: string; conflict: boolean; papers: any[]; details: string; }

export const conflictsApi = {
  detect: (fieldName?: string, schemaId?: string) =>
    request<Conflict[]>("/conflicts/detect", {
      method: "POST",
      body: JSON.stringify({ field_name: fieldName, schema_id: schemaId }),
    }),
  get: () => request<Conflict[]>("/conflicts"),
};

// ── Zotero ────────────────────────────────────────────────────────

export const zoteroApi = {
  connect: (apiKey: string, libraryId: string, libraryType?: string) =>
    request<{ message: string }>("/zotero/connect", {
      method: "POST",
      body: JSON.stringify({ api_key: apiKey, library_id: libraryId, library_type: libraryType || "user" }),
    }),
  collections: () => request<{ collections: any[] }>("/zotero/collections"),
  sync: (collectionKey?: string) =>
    request<{ message: string; new_papers: number; updated_papers: number }>("/zotero/sync", {
      method: "POST",
      body: JSON.stringify({ collection_key: collectionKey }),
    }),
};
