"""
Matrix API router — build and export cross-paper comparison matrices.
"""
import csv
import io
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.matrix import Matrix
from app.schemas.matrix import MatrixBuildRequest, MatrixResponse

router = APIRouter(prefix="/matrix", tags=["Matrix"])


@router.post("/build", response_model=MatrixResponse)
def build_matrix(req: MatrixBuildRequest, db: Session = Depends(get_db)):
    """Build a papers × fields matrix from extraction results."""
    from app.services.matrix_builder import build_matrix_data

    data = build_matrix_data(db, req.schema_id, req.paper_ids)

    matrix = Matrix(
        name=req.name,
        schema_id=req.schema_id,
        data=data,
    )
    db.add(matrix)
    db.commit()
    db.refresh(matrix)
    return matrix


@router.get("/{matrix_id}", response_model=MatrixResponse)
def get_matrix(matrix_id: str, db: Session = Depends(get_db)):
    """Get a stored matrix."""
    matrix = db.query(Matrix).filter(Matrix.id == matrix_id).first()
    if not matrix:
        raise HTTPException(status_code=404, detail="Matrix not found")
    return matrix


@router.get("/{matrix_id}/export")
def export_matrix(matrix_id: str, format: str = "csv", db: Session = Depends(get_db)):
    """Export matrix as CSV or JSON."""
    matrix = db.query(Matrix).filter(Matrix.id == matrix_id).first()
    if not matrix:
        raise HTTPException(status_code=404, detail="Matrix not found")

    if format == "json":
        return matrix.data

    # CSV export
    output = io.StringIO()
    data = matrix.data
    if not data.get("rows"):
        return StreamingResponse(io.BytesIO(b""), media_type="text/csv")

    fields = data.get("fields", [])
    writer = csv.writer(output)
    writer.writerow(["paper_id", "paper_title"] + fields)

    for row in data["rows"]:
        writer.writerow(
            [row.get("paper_id", ""), row.get("paper_title", "")]
            + [row.get("values", {}).get(f, "") for f in fields]
        )

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={matrix.name}.csv"},
    )
