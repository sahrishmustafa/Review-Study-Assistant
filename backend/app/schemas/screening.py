"""
Pydantic schemas for Screening endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ScreeningCriteriaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    criteria_definition: dict  # Dynamic filter criteria
    threshold: float = 0.6


class ScreeningCriteriaResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    criteria_definition: dict
    threshold: float
    created_at: datetime

    class Config:
        from_attributes = True


class ScreeningRunRequest(BaseModel):
    criteria_id: str
    paper_ids: Optional[list[str]] = None  # None = all pending/processed papers


class ScreeningResultResponse(BaseModel):
    paper_id: str
    title: str
    filter_scores: dict
    final_score: float
    passed: bool
    exclusion_reason: Optional[str]


class ScreeningRunResponse(BaseModel):
    message: str
    total_screened: int
    passed: int
    failed: int
    results: list[ScreeningResultResponse]
