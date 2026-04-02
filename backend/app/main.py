"""
SLR Platform — FastAPI Application Entry Point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Create all tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-Powered Systematic Literature Review Platform",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ─────────────────────────────────────────────

from app.routers import papers, zotero, extraction, matrix, screening, evaluation, synthesis, analytics, clusters

app.include_router(papers.router, prefix="/api")
app.include_router(zotero.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")       # Kept for backward compat
app.include_router(matrix.router, prefix="/api")
app.include_router(screening.router, prefix="/api")         # Phase 1: Coarse screening
app.include_router(evaluation.router, prefix="/api")        # Phase 2: Deep evaluation
app.include_router(synthesis.router, prefix="/api")          # Phase 3: EDA & Synthesis
app.include_router(analytics.router, prefix="/api")         # Legacy analytics
app.include_router(clusters.router, prefix="/api")          # Clustering


# ── Health & Overview ─────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": "2.0.0",
        "docs": "/docs",
        "pipeline": [
            "Phase 0: Document Processing",
            "Phase 1: Programmatic Screening",
            "Phase 2: LLM Evaluation",
            "Phase 3: EDA & Synthesis",
        ],
    }


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/overview")
def overview():
    """Dashboard statistics."""
    from app.database import SessionLocal
    from app.services.synthesis_service import get_overview_stats

    db = SessionLocal()
    try:
        stats = get_overview_stats(db)
        return stats
    finally:
        db.close()
