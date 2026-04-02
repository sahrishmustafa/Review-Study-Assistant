"""
Zotero mapping model — links Zotero items to internal papers.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


class ZoteroMapping(Base):
    __tablename__ = "zotero_mappings"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    zotero_item_key: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    zotero_library_id: Mapped[str] = mapped_column(String(50), nullable=False)
    paper_id: Mapped[str] = mapped_column(String(36), ForeignKey("papers.id"), nullable=False)
    last_synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    paper = relationship("Paper", back_populates="zotero_mapping")
