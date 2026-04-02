"""
Extraction API router — schema CRUD, run extraction, view/correct results.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.extraction import ExtractionSchema, ExtractionResult
from app.schemas.extraction import (
    ExtractionSchemaCreate, ExtractionSchemaResponse,
    ExtractionRunRequest, ExtractionResultResponse,
    ExtractionCorrectionRequest, ExtractionRunResponse,
)

router = APIRouter(prefix="/extraction", tags=["Extraction"])

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"

# ── Built-in templates ──────────────────────────────────────────

TEMPLATES = {
    "medical": {
        "name": "Medical Research",
        "fields_definition": [
            {"name": "sample_size", "type": "number", "description": "Number of participants"},
            {"name": "study_type", "type": "string", "description": "RCT, cohort, case-control, etc."},
            {"name": "intervention", "type": "string", "description": "Treatment or intervention studied"},
            {"name": "outcome_measure", "type": "string", "description": "Primary outcome measure"},
            {"name": "effect_size", "type": "string", "description": "Effect size or main result"},
            {"name": "limitations", "type": "string", "description": "Study limitations"},
        ],
    },
    "cs": {
        "name": "Computer Science",
        "fields_definition": [
            {"name": "dataset", "type": "string", "description": "Dataset used"},
            {"name": "methodology", "type": "string", "description": "Approach or algorithm"},
            {"name": "baseline", "type": "string", "description": "Baseline methods compared"},
            {"name": "metrics", "type": "string", "description": "Evaluation metrics"},
            {"name": "results", "type": "string", "description": "Key results"},
            {"name": "limitations", "type": "string", "description": "Limitations mentioned"},
        ],
    },
    "general": {
        "name": "General SLR",
        "fields_definition": [
            {"name": "research_question", "type": "string", "description": "Research question addressed"},
            {"name": "methodology", "type": "string", "description": "Research methodology"},
            {"name": "sample_size", "type": "number", "description": "Sample size"},
            {"name": "key_findings", "type": "string", "description": "Key findings"},
            {"name": "limitations", "type": "string", "description": "Limitations"},
        ],
    },
}


@router.get("/templates")
def get_templates():
    """Return built-in extraction schema templates."""
    return {"templates": TEMPLATES}


@router.post("/schemas", response_model=ExtractionSchemaResponse)
def create_schema(req: ExtractionSchemaCreate, db: Session = Depends(get_db)):
    """Create a new extraction schema."""
    schema = ExtractionSchema(
        name=req.name,
        description=req.description,
        fields_definition=[f.model_dump() for f in req.fields_definition],
        template_type=req.template_type,
        user_id=DEFAULT_USER_ID,
    )
    db.add(schema)
    db.commit()
    db.refresh(schema)
    return schema


@router.get("/schemas", response_model=list[ExtractionSchemaResponse])
def list_schemas(db: Session = Depends(get_db)):
    """List all extraction schemas."""
    return db.query(ExtractionSchema).all()


@router.post("/run", response_model=list[ExtractionRunResponse])
def run_extraction(req: ExtractionRunRequest, db: Session = Depends(get_db)):
    """Run multi-pass extraction on specified papers using the given schema."""
    from app.services.extraction_engine import run_extraction_pipeline

    schema = db.query(ExtractionSchema).filter(ExtractionSchema.id == req.schema_id).first()
    if not schema:
        raise HTTPException(status_code=404, detail="Schema not found")

    results = []
    for paper_id in req.paper_ids:
        paper_results = run_extraction_pipeline(db, paper_id, schema)
        results.append(ExtractionRunResponse(
            message="Extraction complete",
            paper_id=paper_id,
            results=[ExtractionResultResponse.model_validate(r) for r in paper_results],
        ))
    return results


@router.get("/results/{paper_id}", response_model=list[ExtractionResultResponse])
def get_results(paper_id: str, schema_id: str = None, db: Session = Depends(get_db)):
    """Get extraction results for a paper, optionally filtered by schema."""
    query = db.query(ExtractionResult).filter(ExtractionResult.paper_id == paper_id)
    if schema_id:
        query = query.filter(ExtractionResult.schema_id == schema_id)
    return query.all()


@router.patch("/results/{result_id}", response_model=ExtractionResultResponse)
def correct_result(result_id: str, req: ExtractionCorrectionRequest, db: Session = Depends(get_db)):
    """User correction of an extraction result."""
    result = db.query(ExtractionResult).filter(ExtractionResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")

    result.value = req.value
    result.is_user_corrected = True
    db.commit()
    db.refresh(result)
    return result
