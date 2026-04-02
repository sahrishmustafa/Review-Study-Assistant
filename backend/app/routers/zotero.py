"""
Zotero API router — connect, list collections, sync papers.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db

router = APIRouter(prefix="/zotero", tags=["Zotero"])


class ZoteroConnectRequest(BaseModel):
    api_key: str
    library_id: str
    library_type: str = "user"


class ZoteroSyncRequest(BaseModel):
    collection_key: Optional[str] = None


@router.post("/connect")
def connect_zotero(req: ZoteroConnectRequest):
    """Validate and store Zotero API credentials."""
    from app.services.zotero_service import validate_connection
    try:
        result = validate_connection(req.api_key, req.library_id, req.library_type)
        return {"message": "Connected successfully", "username": result.get("username", "Unknown")}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")


@router.get("/collections")
def list_collections():
    """List Zotero collections."""
    from app.services.zotero_service import get_collections
    try:
        collections = get_collections()
        return {"collections": collections}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
def sync_from_zotero(req: ZoteroSyncRequest, db: Session = Depends(get_db)):
    """Sync papers from Zotero library/collection into the system."""
    from app.services.zotero_service import sync_papers
    try:
        result = sync_papers(db, collection_key=req.collection_key)
        return {
            "message": "Sync complete",
            "new_papers": result["new"],
            "updated_papers": result["updated"],
            "total": result["total"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
