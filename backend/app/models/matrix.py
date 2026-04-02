"""
Matrix model — stores structured cross-paper comparison matrices.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class Matrix(Base):
    __tablename__ = "matrices"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    schema_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("extraction_schemas.id"), nullable=False
    )
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    schema = relationship("ExtractionSchema", back_populates="matrices")
