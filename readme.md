# SLR Platform — Walkthrough

## What Was Built

A production-grade **AI-powered Systematic Literature Review** platform with:

### Backend (FastAPI + SQLAlchemy)

| Layer | Files | Description |
|-------|-------|-------------|
| **Models** | 8 | [User](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/user.py#11-27), [Paper](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/frontend/src/lib/api.ts#21-33), [Chunk](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/frontend/src/lib/api.ts#60-67), [ExtractionSchema](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/extraction.py#11-31), [ExtractionResult](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/extraction.py#33-59), [Matrix](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/matrix.py#11-28), [AuditLog](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/audit_log.py#11-31), [ZoteroMapping](file:///home/sahrish/Documents/University/Semester%208/apd/Phase%204/src/backend/app/models/zotero_mapping.py#11-26) |
| **Routers** | 7 | Papers, Zotero, Extraction, Matrix, Analytics, Clusters, Conflicts |
| **Services** | 12 | PDF parser, chunker, section classifier, extraction engine, confidence scorer, LLM client, Zotero sync, SLR protocol, matrix builder, analytics, clustering, conflict detection |
| **Schemas** | 4 | Pydantic models for all API request/response types |
| **Utils** | 1 | Provenance tracking and source highlighting |

### Frontend (Next.js + Tailwind)

| Page | Route | Features |
|------|-------|----------|
| Dashboard | `/` | Stat cards, quick actions |
| Papers | `/papers` | Upload, filter, process, delete |
| Extraction | `/extraction` | Schema builder, template library |
| Matrix | `/matrix` | Papers × fields table with confidence bars |
| Analytics | `/analytics` | Bar charts for methods/year distributions |
| Clusters | `/clusters` | Semantic clustering with colored cards |
| Conflicts | `/conflicts` | Contradictory findings detection |
| Zotero | `/zotero` | Connect, browse collections, sync |

---

## Key Architecture Decisions

1. **Multi-pass extraction** — 4-stage pipeline (retrieve → extract → validate → provenance) ensures structured, grounded outputs
2. **Hybrid section classifier** — Regex heading detection first, LLM fallback for ambiguous chunks
3. **Confidence scoring** — Multi-factor (source quality, corroboration count, type match, ambiguity detection)
4. **FAISS + sklearn fallback** — Clustering works with or without FAISS installed
5. **Audit logging** — Every LLM call is logged with prompt, model, and response

---

## How to Run

### 1. Prerequisites
- **Docker** and **Docker Compose** (for PostgreSQL)
- **Python** 3.11+
- **Node.js** 20+

### 2. Start the Database
```bash
# From the project root — starts PostgreSQL 15 on port 5433
docker compose up -d

# Verify it's running
docker ps | grep slr_postgres
```

### 3. Backend Setup
```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize Database (create tables & seed default user)
python3 init_db.py

# Run the server
PYTHONPATH=. python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API docs → http://localhost:8000/docs
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Dashboard → http://localhost:3000
```

---

## API Endpoints Summary

| Prefix | Endpoints |
|--------|-----------|
| `/api/papers` | Upload, list, get, update, delete, process, chunks |
| `/api/zotero` | Connect, collections, sync |
| `/api/extraction` | Schemas CRUD, templates, run, results, corrections |
| `/api/matrix` | Build, get, export (CSV/JSON) |
| `/api/analytics` | Methods frequency, year trends, distributions |
| `/api/clusters` | Generate, get cached |
| `/api/conflicts` | Detect, get cached |
| `/api/health` | Health check |
| `/api/overview` | Dashboard statistics |

Please fill in the env accordingly or add support for a different API for the agents required.
