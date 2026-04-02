"""
Matrix builder — aggregates extraction results into a papers × fields matrix.
"""
from sqlalchemy.orm import Session
from app.models.extraction import ExtractionSchema, ExtractionResult
from app.models.paper import Paper


def build_matrix_data(
    db: Session,
    schema_id: str,
    paper_ids: list[str] | None = None,
) -> dict:
    """
    Build a papers × fields matrix from extraction results.

    Returns:
        {
            "fields": ["sample_size", "methodology", ...],
            "rows": [
                {
                    "paper_id": "...",
                    "paper_title": "...",
                    "values": {"sample_size": "120", "methodology": "RCT", ...}
                },
                ...
            ]
        }
    """
    schema = db.query(ExtractionSchema).filter(ExtractionSchema.id == schema_id).first()
    if not schema:
        raise ValueError(f"Schema {schema_id} not found")

    # Get field names from schema
    fields = [f["name"] for f in schema.fields_definition]

    # Query results
    query = db.query(ExtractionResult).filter(ExtractionResult.schema_id == schema_id)
    if paper_ids:
        query = query.filter(ExtractionResult.paper_id.in_(paper_ids))

    results = query.all()

    # Organize by paper
    paper_data: dict[str, dict] = {}
    for result in results:
        if result.paper_id not in paper_data:
            paper = db.query(Paper).filter(Paper.id == result.paper_id).first()
            paper_data[result.paper_id] = {
                "paper_id": result.paper_id,
                "paper_title": paper.title if paper else "Unknown",
                "values": {},
                "confidences": {},
                "sources": {},
            }

        paper_data[result.paper_id]["values"][result.field_name] = result.value
        paper_data[result.paper_id]["confidences"][result.field_name] = result.confidence
        if result.source_text:
            paper_data[result.paper_id]["sources"][result.field_name] = {
                "text": result.source_text,
                "page": result.source_page,
                "chunk_id": result.source_chunk_id,
            }

    return {
        "fields": fields,
        "rows": list(paper_data.values()),
    }
