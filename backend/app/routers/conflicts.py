"""
Conflicts API router — detect contradictory findings across papers.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.schemas.analytics import ConflictResponse

router = APIRouter(prefix="/conflicts", tags=["Conflicts"])


class ConflictDetectRequest(BaseModel):
    field_name: Optional[str] = None
    schema_id: Optional[str] = None


@router.post("/detect", response_model=list[ConflictResponse])
def detect_conflicts(req: ConflictDetectRequest, db: Session = Depends(get_db)):
    """Detect conflicts in extracted values across papers."""
    from app.services.conflict_detector import detect_conflicts
    try:
        conflicts = detect_conflicts(db, field_name=req.field_name, schema_id=req.schema_id)
        return conflicts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[ConflictResponse])
def get_conflicts(db: Session = Depends(get_db)):
    """Get cached conflict results."""
    from app.services.conflict_detector import get_cached_conflicts
    conflicts = get_cached_conflicts()
    if conflicts is None:
        raise HTTPException(status_code=404, detail="No conflict analysis run yet.")
    return conflicts
