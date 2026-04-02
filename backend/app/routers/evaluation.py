"""
Evaluation API router — define research questions, run deep evaluation, view results.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.evaluation import ResearchQuestion, EvaluationResult
from app.schemas.evaluation import (
    ResearchQuestionCreate, ResearchQuestionResponse,
    EvaluationRunRequest, EvaluationRunResponse,
    PaperEvaluationResponse, EvaluationResultDetail,
    EvaluationSummaryItem,
)

router = APIRouter(prefix="/evaluation", tags=["Evaluation"])

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


# ── Research Questions ────────────────────────────────────────────

@router.post("/questions", response_model=ResearchQuestionResponse)
def create_question(req: ResearchQuestionCreate, db: Session = Depends(get_db)):
    """Create a research question for paper evaluation."""
    rq = ResearchQuestion(
        question_text=req.question_text,
        description=req.description,
        weight=req.weight,
        user_id=DEFAULT_USER_ID,
    )
    db.add(rq)
    db.commit()
    db.refresh(rq)
    return rq


@router.get("/questions", response_model=list[ResearchQuestionResponse])
def list_questions(db: Session = Depends(get_db)):
    """List all research questions."""
    return db.query(ResearchQuestion).all()


@router.delete("/questions/{question_id}")
def delete_question(question_id: str, db: Session = Depends(get_db)):
    """Delete a research question and its evaluation results."""
    rq = db.query(ResearchQuestion).filter(ResearchQuestion.id == question_id).first()
    if not rq:
        raise HTTPException(status_code=404, detail="Research question not found")
    db.delete(rq)
    db.commit()
    return {"message": "Research question deleted"}


# ── Evaluation Run ────────────────────────────────────────────────

@router.post("/run", response_model=EvaluationRunResponse)
def run_evaluation(req: EvaluationRunRequest, db: Session = Depends(get_db)):
    """Run RAG-based evaluation on papers against research questions."""
    from app.services.evaluation_engine import run_evaluation_batch, get_paper_evaluation_summary

    batch_results = run_evaluation_batch(
        db, req.paper_ids, req.question_ids, req.apply_threshold
    )

    paper_responses = []
    for br in batch_results:
        if "error" in br:
            paper_responses.append(PaperEvaluationResponse(
                paper_id=br["paper_id"],
                title=br.get("title", "Error"),
                final_score=0.0,
                passed=False,
                evaluations=[],
            ))
            continue

        # Get full summary with provenance
        summary = get_paper_evaluation_summary(db, br["paper_id"])
        paper_responses.append(PaperEvaluationResponse(
            paper_id=summary["paper_id"],
            title=summary["title"],
            final_score=summary["final_score"],
            passed=summary["passed"],
            evaluations=[
                EvaluationResultDetail(**e) for e in summary["evaluations"]
            ],
        ))

    passed_count = sum(1 for r in paper_responses if r.passed)

    return EvaluationRunResponse(
        message=f"Evaluated {len(paper_responses)} papers",
        total_evaluated=len(paper_responses),
        passed=passed_count,
        failed=len(paper_responses) - passed_count,
        results=paper_responses,
    )


# ── Results ───────────────────────────────────────────────────────

@router.get("/results/{paper_id}", response_model=PaperEvaluationResponse)
def get_paper_results(paper_id: str, db: Session = Depends(get_db)):
    """Get evaluation results for a specific paper with full provenance."""
    from app.services.evaluation_engine import get_paper_evaluation_summary

    try:
        summary = get_paper_evaluation_summary(db, paper_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return PaperEvaluationResponse(
        paper_id=summary["paper_id"],
        title=summary["title"],
        final_score=summary["final_score"],
        passed=summary["passed"],
        evaluations=[
            EvaluationResultDetail(**e) for e in summary["evaluations"]
        ],
    )


@router.get("/summary", response_model=list[EvaluationSummaryItem])
def get_evaluation_summary(db: Session = Depends(get_db)):
    """Get ranked summary of all evaluated papers."""
    from app.models.paper import Paper
    from sqlalchemy import func

    # Get papers with evaluation results
    paper_scores = (
        db.query(
            EvaluationResult.paper_id,
            func.avg(EvaluationResult.score).label("avg_score"),
            func.count(EvaluationResult.id).label("rq_count"),
        )
        .group_by(EvaluationResult.paper_id)
        .order_by(func.avg(EvaluationResult.score).desc())
        .all()
    )

    results = []
    threshold = getattr(settings, "EVALUATION_THRESHOLD", 0.7)
    for ps in paper_scores:
        paper = db.query(Paper).filter(Paper.id == ps.paper_id).first()
        if paper:
            avg_score = float(ps.avg_score) if ps.avg_score else 0.0
            results.append(EvaluationSummaryItem(
                paper_id=ps.paper_id,
                title=paper.title,
                final_score=round(avg_score, 4),
                passed=avg_score >= threshold,
                rq_count=ps.rq_count,
            ))

    return results


# Import settings at module level for threshold
from app.config import settings
