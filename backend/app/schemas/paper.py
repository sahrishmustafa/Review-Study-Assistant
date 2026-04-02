"""
Pydantic schemas for Paper endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class PaperCreate(BaseModel):
    title: str
    authors: list[str] = []
    year: Optional[int] = None
    abstract: Optional[str] = None


class PaperUpdate(BaseModel):
    title: Optional[str] = None
    authors: Optional[list[str]] = None
    year: Optional[int] = None
    abstract: Optional[str] = None
    status: Optional[str] = None
    exclusion_reason: Optional[str] = None


class PaperResponse(BaseModel):
    id: str
    title: str
    authors: list[str]
    year: Optional[int]
    abstract: Optional[str]
    pdf_path: Optional[str]
    status: str
    exclusion_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PaperListResponse(BaseModel):
    papers: list[PaperResponse]
    total: int


class ChunkResponse(BaseModel):
    id: str
    text: str
    page_number: int
    section: Optional[str]
    chunk_index: int

    class Config:
        from_attributes = True
