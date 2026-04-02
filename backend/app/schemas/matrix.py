"""
Pydantic schemas for Matrix endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MatrixBuildRequest(BaseModel):
    name: str
    schema_id: str
    paper_ids: Optional[list[str]] = None  # None = all papers


class MatrixResponse(BaseModel):
    id: str
    name: str
    schema_id: str
    data: dict
    created_at: datetime

    class Config:
        from_attributes = True
