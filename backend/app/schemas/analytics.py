"""
Pydantic schemas for Analytics endpoints.
"""
from pydantic import BaseModel


class FrequencyItem(BaseModel):
    label: str
    count: int


class TrendItem(BaseModel):
    year: int
    count: int


class MethodsFrequencyResponse(BaseModel):
    data: list[FrequencyItem]


class YearTrendsResponse(BaseModel):
    data: list[TrendItem]


class DistributionResponse(BaseModel):
    field: str
    data: list[FrequencyItem]


class ClusterResponse(BaseModel):
    cluster_id: int
    label: str
    paper_ids: list[str]
    size: int


class ConflictResponse(BaseModel):
    topic: str
    conflict: bool
    papers: list[dict]
    details: str
