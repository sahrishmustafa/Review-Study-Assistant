"""
Chunk model — represents a text chunk extracted from a paper PDF.
"""
import uuid
from sqlalchemy import String, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    section: Mapped[str | None] = mapped_column(String(50), nullable=True)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    paper = relationship("Paper", back_populates="chunks")
    extraction_results = relationship("ExtractionResult", back_populates="source_chunk")
