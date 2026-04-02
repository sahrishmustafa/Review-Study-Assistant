"""
Pydantic schemas for Evaluation endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# ── Research Questions ────────────────────────────────────────────

class ResearchQuestionCreate(BaseModel):
    question_text: str
    description: Optional[str] = None
    weight: float = 1.0


class ResearchQuestionResponse(BaseModel):
    id: str
    question_text: str
    description: Optional[str]
    weight: float
    created_at: datetime

    class Config:
        from_attributes = True


# ── Evaluation Run ────────────────────────────────────────────────

class EvaluationRunRequest(BaseModel):
    paper_ids: list[str]
    question_ids: Optional[list[str]] = None  # None = all questions
    apply_threshold: bool = True


class EvaluationResultDetail(BaseModel):
    question: str
    answer: Optional[str]
    score: float
    source_quote: Optional[str]
    source_page: Optional[int]
    source_chunk_id: Optional[str]
    reasoning: Optional[str]


class PaperEvaluationResponse(BaseModel):
    paper_id: str
    title: str
    final_score: float
    passed: bool
    evaluations: list[EvaluationResultDetail]


class EvaluationRunResponse(BaseModel):
    message: str
    total_evaluated: int
    passed: int
    failed: int
    results: list[PaperEvaluationResponse]


# ── Evaluation Summary ────────────────────────────────────────────

class EvaluationSummaryItem(BaseModel):
    paper_id: str
    title: str
    final_score: float
    passed: bool
    rq_count: int
