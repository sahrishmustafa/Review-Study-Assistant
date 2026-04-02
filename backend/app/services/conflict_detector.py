"""
Conflict detector — identifies contradictory findings across papers.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.extraction import ExtractionResult
from app.models.paper import Paper

_cached_conflicts = None


def detect_conflicts(
    db: Session,
    field_name: str | None = None,
    schema_id: str | None = None,
) -> list[dict]:
    """
    Detect conflicting values for the same field across different papers.

    Strategy:
    1. Group extraction results by field
    2. Identify fields with divergent values
    3. Flag as conflict if values are semantically contradictory
    """
    global _cached_conflicts

    query = db.query(ExtractionResult).filter(ExtractionResult.value.isnot(None))

    if field_name:
        query = query.filter(ExtractionResult.field_name == field_name)
    if schema_id:
        query = query.filter(ExtractionResult.schema_id == schema_id)

    results = query.all()

    # Group by field name
    field_groups: dict[str, list[ExtractionResult]] = {}
    for r in results:
        if r.field_name not in field_groups:
            field_groups[r.field_name] = []
        field_groups[r.field_name].append(r)

    conflicts = []

    for fname, field_results in field_groups.items():
        if len(field_results) < 2:
            continue

        # Get unique values
        values = {}
        for r in field_results:
            normalized = r.value.strip().lower() if r.value else ""
            if normalized not in values:
                values[normalized] = []
            values[normalized].append(r)

        # If multiple distinct values exist, potential conflict
        if len(values) > 1:
            # Compute disagreement details
            value_groups = []
            for val, group_results in values.items():
                papers_info = []
                for r in group_results:
                    paper = db.query(Paper).filter(Paper.id == r.paper_id).first()
                    papers_info.append({
                        "paper_id": r.paper_id,
                        "paper_title": paper.title if paper else "Unknown",
                        "value": r.value,
                        "confidence": r.confidence,
                        "source_text": r.source_text,
                    })
                value_groups.append({
                    "value": val,
                    "papers": papers_info,
                    "count": len(papers_info),
                })

            # Generate conflict detail
            value_strs = [f"'{vg['value']}' ({vg['count']} papers)" for vg in value_groups]
            detail = f"Field '{fname}' has {len(values)} distinct values: {', '.join(value_strs)}"

            all_papers = []
            for vg in value_groups:
                all_papers.extend(vg["papers"])

            conflicts.append({
                "topic": fname,
                "conflict": True,
                "papers": all_papers,
                "details": detail,
            })

    _cached_conflicts = conflicts
    return conflicts


def get_cached_conflicts():
    """Return cached conflict results."""
    return _cached_conflicts
