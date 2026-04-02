"""
Pydantic schemas for Extraction endpoints.
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FieldDefinition(BaseModel):
    name: str
    type: str  # "string", "number", "boolean", "list"
    description: Optional[str] = None


class ExtractionSchemaCreate(BaseModel):
    name: str
    description: Optional[str] = None
    fields_definition: list[FieldDefinition]
    template_type: Optional[str] = None


class ExtractionSchemaResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    fields_definition: list[dict]
    template_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractionRunRequest(BaseModel):
    schema_id: str
    paper_ids: list[str]


class ExtractionResultResponse(BaseModel):
    id: str
    paper_id: str
    schema_id: str
    field_name: str
    value: Optional[str]
    confidence: float
    source_text: Optional[str]
    source_page: Optional[int]
    source_chunk_id: Optional[str]
    is_user_corrected: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ExtractionCorrectionRequest(BaseModel):
    value: str


class ExtractionRunResponse(BaseModel):
    message: str
    paper_id: str
    results: list[ExtractionResultResponse]
