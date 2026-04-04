"""
Screening API router — define criteria and run coarse paper screening.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.screening import ScreeningCriteria, ScreeningResult
from app.schemas.screening import (
    ScreeningCriteriaCreate, ScreeningCriteriaUpdate, ScreeningCriteriaResponse,
    ScreeningRunRequest, ScreeningRunResponse, ScreeningResultResponse,
)

router = APIRouter(prefix="/screening", tags=["Screening"])

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


@router.post("/criteria", response_model=ScreeningCriteriaResponse)
def create_criteria(req: ScreeningCriteriaCreate, db: Session = Depends(get_db)):
    """Create screening criteria with dynamic filters."""
    criteria = ScreeningCriteria(
        name=req.name,
        description=req.description,
        criteria_definition=req.criteria_definition,
        threshold=req.threshold,
        user_id=DEFAULT_USER_ID,
    )
    db.add(criteria)
    db.commit()
    db.refresh(criteria)
    return criteria


@router.get("/criteria", response_model=list[ScreeningCriteriaResponse])
def list_criteria(db: Session = Depends(get_db)):
    """List all screening criteria."""
    return db.query(ScreeningCriteria).all()


@router.get("/criteria/{criteria_id}", response_model=ScreeningCriteriaResponse)
def get_criteria(criteria_id: str, db: Session = Depends(get_db)):
    """Get a specific screening criteria."""
    criteria = db.query(ScreeningCriteria).filter(
        ScreeningCriteria.id == criteria_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Criteria not found")
    return criteria


@router.patch("/criteria/{criteria_id}", response_model=ScreeningCriteriaResponse)
def update_criteria(criteria_id: str, req: ScreeningCriteriaUpdate, db: Session = Depends(get_db)):
    """Update existing screening criteria."""
    criteria = db.query(ScreeningCriteria).filter(
        ScreeningCriteria.id == criteria_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Criteria not found")
    
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(criteria, key, value)
    
    db.commit()
    db.refresh(criteria)
    return criteria


@router.delete("/criteria/{criteria_id}")
def delete_criteria(criteria_id: str, db: Session = Depends(get_db)):
    """Delete screening criteria and its results."""
    criteria = db.query(ScreeningCriteria).filter(
        ScreeningCriteria.id == criteria_id
    ).first()
    if not criteria:
        raise HTTPException(status_code=404, detail="Criteria not found")
    db.delete(criteria)
    db.commit()
    return {"message": "Criteria deleted"}


@router.post("/run", response_model=ScreeningRunResponse)
def run_screening(req: ScreeningRunRequest, db: Session = Depends(get_db)):
    """Run coarse screening on papers using the specified criteria."""
    from app.services.screening_service import run_screening as do_screening

    try:
        results = do_screening(db, req.criteria_id, req.paper_ids)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    passed_count = sum(1 for r in results if r["passed"])

    return ScreeningRunResponse(
        message=f"Screened {len(results)} papers",
        total_screened=len(results),
        passed=passed_count,
        failed=len(results) - passed_count,
        results=[ScreeningResultResponse(**r) for r in results],
    )


@router.get("/results", response_model=list[ScreeningResultResponse])
def get_results(
    criteria_id: str | None = None,
    passed_only: bool = False,
    db: Session = Depends(get_db),
):
    """Get screening results, optionally filtered by criteria or pass status."""
    query = db.query(ScreeningResult)
    if criteria_id:
        query = query.filter(ScreeningResult.criteria_id == criteria_id)
    if passed_only:
        query = query.filter(ScreeningResult.passed == True)

    results = query.all()
    from app.models.paper import Paper

    output = []
    for r in results:
        paper = db.query(Paper).filter(Paper.id == r.paper_id).first()
        output.append(ScreeningResultResponse(
            paper_id=r.paper_id,
            title=paper.title if paper else "Unknown",
            filter_scores=r.filter_scores,
            final_score=r.final_score,
            passed=r.passed,
            exclusion_reason=r.exclusion_reason,
        ))
    return output
