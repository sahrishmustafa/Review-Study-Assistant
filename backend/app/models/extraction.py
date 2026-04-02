"""
Extraction models — schema definitions and per-paper extraction results.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ExtractionSchema(Base):
    """User-defined extraction schema (field definitions for structured extraction)."""
    __tablename__ = "extraction_schemas"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    fields_definition: Mapped[dict] = mapped_column(JSON, nullable=False)
    template_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User", back_populates="extraction_schemas")
    results = relationship("ExtractionResult", back_populates="schema", cascade="all, delete-orphan")
    matrices = relationship("Matrix", back_populates="schema")


class ExtractionResult(Base):
    """A single extracted value for one field of one paper."""
    __tablename__ = "extraction_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id"), nullable=False)
    schema_id: Mapped[str] = mapped_column(String(36), ForeignKey("extraction_schemas.id"), nullable=False)
    field_name: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    source_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    source_chunk_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("chunks.id"), nullable=True
    )
    is_user_corrected: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    paper = relationship("Paper", back_populates="extraction_results")
    schema = relationship("ExtractionSchema", back_populates="results")
    source_chunk = relationship("Chunk", back_populates="extraction_results")
