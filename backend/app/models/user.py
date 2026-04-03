"""
User model.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Zotero Config (stored per-user for multi-tenancy)
    zotero_api_key: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zotero_library_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    zotero_library_type: Mapped[str] = mapped_column(String(50), default="user")

    # Relationships
    papers = relationship("Paper", back_populates="user", lazy="dynamic")
    extraction_schemas = relationship("ExtractionSchema", back_populates="user", lazy="dynamic")
    audit_logs = relationship("AuditLog", back_populates="user", lazy="dynamic")
