"""
Zotero service — connect, fetch collections, and sync papers.
Uses the pyzotero library.
"""
import os
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.config import settings
from app.models.paper import Paper, PaperStatus
from app.models.zotero_mapping import ZoteroMapping


def _get_zotero_client(api_key: str = None, library_id: str = None, library_type: str = None):
    """Create a pyzotero client."""
    from pyzotero import zotero

    return zotero.Zotero(
        library_id or settings.ZOTERO_LIBRARY_ID,
        library_type or settings.ZOTERO_LIBRARY_TYPE,
        api_key or settings.ZOTERO_API_KEY,
    )


def validate_connection(api_key: str, library_id: str, library_type: str) -> dict:
    """Validate Zotero API connection."""
    zot = _get_zotero_client(api_key, library_id, library_type)
    # Try to fetch key permissions (will raise on invalid key)
    key_info = zot.key_info()
    return {"username": key_info.get("username", "Unknown"), "access": key_info}


def get_collections() -> list[dict]:
    """Fetch all Zotero collections."""
    zot = _get_zotero_client()
    collections = zot.collections()
    return [
        {
            "key": c["key"],
            "name": c["data"]["name"],
            "parent": c["data"].get("parentCollection", None),
            "num_items": c["meta"].get("numItems", 0),
        }
        for c in collections
    ]


def sync_papers(
    db: Session,
    collection_key: Optional[str] = None,
) -> dict:
    """
    Sync papers from Zotero into the database.
    Supports incremental sync via last_synced_at.
    """
    zot = _get_zotero_client()
    user_id = "00000000-0000-0000-0000-000000000001"  # Default user

    # Fetch items
    if collection_key:
        items = zot.collection_items(collection_key, itemType="journalArticle || conferencePaper || preprint || book || bookSection || thesis || report")
    else:
        items = zot.items(itemType="journalArticle || conferencePaper || preprint || book || bookSection || thesis || report")

    new_count = 0
    updated_count = 0

    for item in items:
        item_key = item["key"]
        item_data = item.get("data", {})

        # Check if already synced
        existing_mapping = (
            db.query(ZoteroMapping)
            .filter(ZoteroMapping.zotero_item_key == item_key)
            .first()
        )

        # Extract metadata
        title = item_data.get("title", "Untitled")
        authors = [
            f"{c.get('firstName', '')} {c.get('lastName', '')}".strip()
            for c in item_data.get("creators", [])
        ]
        year = None
        date_str = item_data.get("date", "")
        if date_str:
            try:
                year = int(date_str[:4])
            except (ValueError, IndexError):
                pass

        abstract = item_data.get("abstractNote", "")

        if existing_mapping:
            # Update existing paper
            paper = db.query(Paper).filter(Paper.id == existing_mapping.paper_id).first()
            if paper:
                paper.title = title
                paper.authors = authors
                paper.year = year
                paper.abstract = abstract
                existing_mapping.last_synced_at = datetime.now(timezone.utc)
                updated_count += 1
        else:
            # Create new paper
            paper = Paper(
                title=title,
                authors=authors,
                year=year,
                abstract=abstract,
                status=PaperStatus.PENDING.value,
                user_id=user_id,
            )
            db.add(paper)
            db.flush()

            # Try to download PDF attachment
            pdf_path = _download_attachment(zot, item_key, paper.id)
            if pdf_path:
                paper.pdf_path = pdf_path

            # Create mapping
            mapping = ZoteroMapping(
                zotero_item_key=item_key,
                zotero_library_id=settings.ZOTERO_LIBRARY_ID or "",
                paper_id=paper.id,
            )
            db.add(mapping)
            new_count += 1

    db.commit()

    return {
        "new": new_count,
        "updated": updated_count,
        "total": len(items),
    }


def _download_attachment(zot, item_key: str, paper_id: str) -> Optional[str]:
    """Download PDF attachment for a Zotero item."""
    try:
        children = zot.children(item_key)
        for child in children:
            child_data = child.get("data", {})
            if child_data.get("contentType") == "application/pdf":
                os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
                filepath = os.path.join(settings.UPLOAD_DIR, f"{paper_id}.pdf")
                zot.dump(child["key"], filepath)
                return filepath
    except Exception:
        pass
    return None
