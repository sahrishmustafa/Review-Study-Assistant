"""
Pydantic schemas for Synthesis endpoints.
"""
from pydantic import BaseModel
from typing import Optional


class AggregationRequest(BaseModel):
    paper_ids: Optional[list[str]] = None  # None = all included papers


class FrequencyItem(BaseModel):
    label: str
    count: int


class TrendItem(BaseModel):
    year: int
    count: int


class LimitationItem(BaseModel):
    paper_id: str
    paper_title: str
    limitation: Optional[str]
    source_quote: Optional[str]
    source_page: Optional[int]


class AggregationTableResponse(BaseModel):
    fields: list[str]
    rows: list[dict]
    total_papers: int


class ClusterRequest(BaseModel):
    num_clusters: int = 5
    paper_ids: Optional[list[str]] = None


class ClusterResponse(BaseModel):
    cluster_id: int
    label: str
    paper_ids: list[str]
    paper_titles: list[str]
    size: int


class SynthesisOverviewResponse(BaseModel):
    total_papers: int
    pending_papers: int
    processed_papers: int
    included_papers: int
    excluded_papers: int
    total_evaluations: int
    total_screenings: int
    total_research_questions: int
