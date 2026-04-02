from __future__ import annotations
"""
Screening models — criteria definitions and per-paper screening results.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Float, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ScreeningCriteria(Base):
    """User-defined screening criteria for coarse paper filtering."""
    __tablename__ = "screening_criteria"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Dynamic filter criteria stored as JSON
    # Example: {"year_range": [2018, 2025], "paper_types": ["journal"], ...}
    criteria_definition: Mapped[dict] = mapped_column(JSON, nullable=False)

    threshold: Mapped[float] = mapped_column(Float, default=0.6)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    user = relationship("User")
    results = relationship("ScreeningResult", back_populates="criteria", cascade="all, delete-orphan")


class ScreeningResult(Base):
    """Per-paper screening outcome with per-filter scores."""
    __tablename__ = "screening_results"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    criteria_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("screening_criteria.id", ondelete="CASCADE"), nullable=False
    )

    # Per-filter scores stored as JSON
    # Example: {"year": 1.0, "type": 0.8, "topic_match_score": 0.82}
    filter_scores: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    final_score: Mapped[float] = mapped_column(Float, default=0.0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    exclusion_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    paper = relationship("Paper")
    criteria = relationship("ScreeningCriteria", back_populates="results")
