"""
Papers API router — upload, list, get, update, delete papers.
"""
import os
import uuid
import shutil
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.paper import Paper, PaperStatus
from app.schemas.paper import (
    PaperCreate, PaperUpdate, PaperResponse, PaperListResponse, ChunkResponse,
)
from app.config import settings

router = APIRouter(prefix="/papers", tags=["Papers"])

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


@router.post("/upload", response_model=PaperResponse)
async def upload_paper(
    file: UploadFile = File(...),
    title: str = Query(None),
    db: Session = Depends(get_db),
):
    """Upload a PDF and create a paper record."""
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_id = str(uuid.uuid4())
    filename = f"{file_id}.pdf"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)

    paper = Paper(
        title=title or file.filename or "Untitled",
        pdf_path=filepath,
        status=PaperStatus.PENDING.value,
        user_id=DEFAULT_USER_ID,
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


@router.get("", response_model=PaperListResponse)
def list_papers(
    status: str | None = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """List papers with optional status filter."""
    query = db.query(Paper)
    if status:
        query = query.filter(Paper.status == status)
    total = query.count()
    papers = query.offset(skip).limit(limit).all()
    return PaperListResponse(papers=papers, total=total)


@router.get("/{paper_id}", response_model=PaperResponse)
def get_paper(paper_id: str, db: Session = Depends(get_db)):
    """Get a single paper by ID."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.patch("/{paper_id}", response_model=PaperResponse)
def update_paper(paper_id: str, update: PaperUpdate, db: Session = Depends(get_db)):
    """Update paper metadata or status."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(paper, field, value)

    db.commit()
    db.refresh(paper)
    return paper


@router.delete("/{paper_id}")
def delete_paper(paper_id: str, db: Session = Depends(get_db)):
    """Delete a paper and its PDF."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")

    if paper.pdf_path and os.path.exists(paper.pdf_path):
        os.remove(paper.pdf_path)

    db.delete(paper)
    db.commit()
    return {"message": "Paper deleted"}


@router.get("/{paper_id}/chunks", response_model=list[ChunkResponse])
def get_paper_chunks(paper_id: str, db: Session = Depends(get_db)):
    """Get all chunks for a paper."""
    from app.models.chunk import Chunk
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    chunks = db.query(Chunk).filter(Chunk.paper_id == paper_id).order_by(Chunk.chunk_index).all()
    return chunks


@router.post("/{paper_id}/process")
def process_paper(paper_id: str, db: Session = Depends(get_db)):
    """Trigger PDF parsing, chunking, and section classification for a paper."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    if not paper.pdf_path:
        raise HTTPException(status_code=400, detail="No PDF found for this paper")

    from app.services.pdf_parser import parse_pdf
    from app.services.chunker import create_chunks
    from app.services.section_classifier import classify_sections

    # Parse PDF
    pages = parse_pdf(paper.pdf_path)

    # Create chunks
    chunks = create_chunks(pages, paper.id)

    # Classify sections
    chunks = classify_sections(chunks)

    # Save to DB
    from app.models.chunk import Chunk
    for chunk_data in chunks:
        chunk = Chunk(
            paper_id=paper.id,
            text=chunk_data["text"],
            page_number=chunk_data["page_number"],
            section=chunk_data.get("section"),
            chunk_index=chunk_data["chunk_index"],
        )
        db.add(chunk)

    paper.status = PaperStatus.PROCESSED.value
    db.commit()

    return {"message": f"Processed {len(chunks)} chunks", "paper_id": paper.id}
