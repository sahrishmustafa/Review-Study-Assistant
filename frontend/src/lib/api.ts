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
  uploadBulk: async (files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${API_BASE}/papers/upload/bulk`, { method: "POST", body: form });
    if (!res.ok) throw new Error("Bulk upload failed");
    return res.json() as Promise<Paper[]>;
  },
  process: (id: string) => request<{ message: string }>(`/papers/${id}/process`, { method: "POST" }),
  updateStatus: (id: string, status: string, reason?: string) =>
    request<Paper>(`/papers/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, exclusion_reason: reason }),
    }),
  delete: (id: string) => request<{ message: string }>(`/papers/${id}`, { method: "DELETE" }),
  deleteAll: () => request<{ message: string }>("/papers", { method: "DELETE" }),
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

// ── Screening (Phase 1) ──────────────────────────────────────────

export interface ScreeningCriteria {
  id: string;
  name: string;
  description: string | null;
  criteria_definition: Record<string, any>;
  threshold: number;
  created_at: string;
}

export interface ScreeningResult {
  paper_id: string;
  title: string;
  filter_scores: Record<string, number>;
  final_score: number;
  passed: boolean;
  exclusion_reason: string | null;
}

export interface ScreeningRunResponse {
  message: string;
  total_screened: number;
  passed: number;
  failed: number;
  results: ScreeningResult[];
}

export const screeningApi = {
  createCriteria: (data: { name: string; description?: string; criteria_definition: Record<string, any>; threshold?: number }) =>
    request<ScreeningCriteria>("/screening/criteria", { method: "POST", body: JSON.stringify(data) }),
  updateCriteria: (id: string, data: { name?: string; description?: string; criteria_definition?: Record<string, any>; threshold?: number }) =>
    request<ScreeningCriteria>(`/screening/criteria/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  listCriteria: () => request<ScreeningCriteria[]>("/screening/criteria"),
  deleteCriteria: (id: string) => request<{ message: string }>(`/screening/criteria/${id}`, { method: "DELETE" }),
  run: (criteriaId: string, paperIds?: string[]) =>
    request<ScreeningRunResponse>("/screening/run", {
      method: "POST",
      body: JSON.stringify({ criteria_id: criteriaId, paper_ids: paperIds }),
    }),
  getResults: (criteriaId?: string, passedOnly?: boolean) => {
    const params = new URLSearchParams();
    if (criteriaId) params.set("criteria_id", criteriaId);
    if (passedOnly) params.set("passed_only", "true");
    return request<ScreeningResult[]>(`/screening/results?${params}`);
  },
};

// ── Evaluation (Phase 2) ─────────────────────────────────────────

export interface ResearchQuestion {
  id: string;
  question_text: string;
  description: string | null;
  weight: number;
  created_at: string;
}

export interface EvaluationResultDetail {
  question: string;
  answer: string | null;
  score: number;
  source_quote: string | null;
  source_page: number | null;
  source_chunk_id: string | null;
  reasoning: string | null;
}

export interface PaperEvaluation {
  paper_id: string;
  title: string;
  final_score: number;
  passed: boolean;
  evaluations: EvaluationResultDetail[];
}

export interface EvaluationRunResponse {
  message: string;
  total_evaluated: number;
  passed: number;
  failed: number;
  results: PaperEvaluation[];
}

export interface EvaluationSummaryItem {
  paper_id: string;
  title: string;
  final_score: number;
  passed: boolean;
  rq_count: number;
}

export const evaluationApi = {
  createQuestion: (data: { question_text: string; description?: string; weight?: number }) =>
    request<ResearchQuestion>("/evaluation/questions", { method: "POST", body: JSON.stringify(data) }),
  listQuestions: () => request<ResearchQuestion[]>("/evaluation/questions"),
  deleteQuestion: (id: string) => request<{ message: string }>(`/evaluation/questions/${id}`, { method: "DELETE" }),
  run: (paperIds: string[], questionIds?: string[], applyThreshold?: boolean) =>
    request<EvaluationRunResponse>("/evaluation/run", {
      method: "POST",
      body: JSON.stringify({ paper_ids: paperIds, question_ids: questionIds, apply_threshold: applyThreshold ?? true }),
    }),
  getResults: (paperId: string) => request<PaperEvaluation>(`/evaluation/results/${paperId}`),
  getSummary: () => request<EvaluationSummaryItem[]>("/evaluation/summary"),
};

// ── Synthesis (Phase 3) ──────────────────────────────────────────

export interface SynthesisOverview {
  total_papers: number;
  pending_papers: number;
  processed_papers: number;
  included_papers: number;
  excluded_papers: number;
  total_evaluations: number;
  total_screenings: number;
  total_research_questions: number;
}

export interface ClusterResult {
  cluster_id: number;
  label: string;
  paper_ids: string[];
  paper_titles: string[];
  size: number;
}

export const synthesisApi = {
  overview: () => request<SynthesisOverview>("/synthesis/overview"),
  aggregate: (paperIds?: string[]) =>
    request<{ fields: string[]; rows: any[]; total_papers: number }>("/synthesis/aggregate", {
      method: "POST",
      body: JSON.stringify({ paper_ids: paperIds }),
    }),
  methodsDistribution: (paperIds?: string[]) =>
    request<{ data: { label: string; count: number }[] }>("/synthesis/methods-distribution", {
      method: "POST",
      body: JSON.stringify({ paper_ids: paperIds }),
    }),
  yearTrends: (paperIds?: string[]) =>
    request<{ data: { year: number; count: number }[] }>("/synthesis/year-trends", {
      method: "POST",
      body: JSON.stringify({ paper_ids: paperIds }),
    }),
  limitations: (paperIds?: string[]) =>
    request<{ data: any[] }>("/synthesis/limitations", {
      method: "POST",
      body: JSON.stringify({ paper_ids: paperIds }),
    }),
  patterns: (numClusters: number = 5, paperIds?: string[]) =>
    request<ClusterResult[]>("/synthesis/patterns", {
      method: "POST",
      body: JSON.stringify({ num_clusters: numClusters, paper_ids: paperIds }),
    }),
};

// ── Extraction (Legacy) ──────────────────────────────────────────

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

// ── Analytics (Legacy) ───────────────────────────────────────────

export const analyticsApi = {
  methodsFrequency: () => request<{ data: { label: string; count: number }[] }>("/analytics/methods-frequency"),
  yearTrends: () => request<{ data: { year: number; count: number }[] }>("/analytics/year-trends"),
  distribution: (field: string) =>
    request<{ field: string; data: { label: string; count: number }[] }>(`/analytics/distributions/${field}`),
  overview: () => request<any>("/overview"),
};

// ── Clusters (Legacy) ────────────────────────────────────────────

export interface Cluster { cluster_id: number; label: string; paper_ids: string[]; size: number; }

export const clustersApi = {
  generate: (numClusters: number = 5) =>
    request<Cluster[]>("/clusters/generate", {
      method: "POST",
      body: JSON.stringify({ num_clusters: numClusters }),
    }),
  get: () => request<Cluster[]>("/clusters"),
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
