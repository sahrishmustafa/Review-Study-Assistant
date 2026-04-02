from __future__ import annotations
"""
Evaluation models — research questions and per-paper evaluation results.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ResearchQuestion(Base):
    """User-defined research question for deep paper evaluation."""
    __tablename__ = "research_questions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User")
    evaluation_results = relationship("EvaluationResult", back_populates="research_question", cascade="all, delete-orphan")


class EvaluationResult(Base):
    """Per-paper-per-RQ evaluation result with provenance."""
    __tablename__ = "evaluation_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("research_questions.id", ondelete="CASCADE"), nullable=False
    )

    # LLM-generated answer
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    score: Mapped[float] = mapped_column(Float, default=0.0)

    # Provenance (CRITICAL for anti-hallucination)
    source_chunk_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("chunks.id", ondelete="SET NULL"), nullable=True
    )
    source_quote: Mapped[str | None] = mapped_column(Text, nullable=True)
    source_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    reasoning: Mapped[str | None] = mapped_column(Text, nullable=True)

    # All retrieved chunks used for context (stored as JSON list of chunk IDs)
    context_chunk_ids: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    paper = relationship("Paper")
    research_question = relationship("ResearchQuestion", back_populates="evaluation_results")
    source_chunk = relationship("Chunk")
