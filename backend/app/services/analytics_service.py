"""
Analytics service — statistical analysis on extracted data.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.paper import Paper
from app.models.extraction import ExtractionResult


def get_methods_frequency(db: Session) -> list[dict]:
    """Get frequency distribution of methodology values."""
    results = (
        db.query(ExtractionResult.value, func.count(ExtractionResult.id))
        .filter(ExtractionResult.field_name == "methodology")
        .filter(ExtractionResult.value.isnot(None))
        .group_by(ExtractionResult.value)
        .order_by(func.count(ExtractionResult.id).desc())
        .all()
    )
    return [{"label": r[0], "count": r[1]} for r in results]


def get_year_trends(db: Session) -> list[dict]:
    """Get paper count by year."""
    results = (
        db.query(Paper.year, func.count(Paper.id))
        .filter(Paper.year.isnot(None))
        .group_by(Paper.year)
        .order_by(Paper.year)
        .all()
    )
    return [{"year": r[0], "count": r[1]} for r in results]


def get_field_distribution(db: Session, field_name: str) -> list[dict]:
    """Get value distribution for a specific extraction field."""
    results = (
        db.query(ExtractionResult.value, func.count(ExtractionResult.id))
        .filter(ExtractionResult.field_name == field_name)
        .filter(ExtractionResult.value.isnot(None))
        .group_by(ExtractionResult.value)
        .order_by(func.count(ExtractionResult.id).desc())
        .limit(50)
        .all()
    )
    return [{"label": r[0], "count": r[1]} for r in results]


def get_overview_stats(db: Session) -> dict:
    """Get overview statistics for the dashboard."""
    total_papers = db.query(Paper).count()
    processed = db.query(Paper).filter(Paper.status == "processed").count()
    included = db.query(Paper).filter(Paper.status == "included").count()
    excluded = db.query(Paper).filter(Paper.status == "excluded").count()
    total_extractions = db.query(ExtractionResult).count()

    return {
        "total_papers": total_papers,
        "processed_papers": processed,
        "included_papers": included,
        "excluded_papers": excluded,
        "total_extractions": total_extractions,
    }
