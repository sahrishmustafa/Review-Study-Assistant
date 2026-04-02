"""
Analytics API router — methods frequency, year trends, distributions.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.paper import Paper
from app.models.extraction import ExtractionResult
from app.schemas.analytics import (
    MethodsFrequencyResponse, YearTrendsResponse,
    DistributionResponse, FrequencyItem, TrendItem,
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/methods-frequency", response_model=MethodsFrequencyResponse)
def methods_frequency(db: Session = Depends(get_db)):
    """Compute frequency of methodology values across papers."""
    results = (
        db.query(ExtractionResult.value, func.count(ExtractionResult.id))
        .filter(ExtractionResult.field_name == "methodology")
        .filter(ExtractionResult.value.isnot(None))
        .group_by(ExtractionResult.value)
        .order_by(func.count(ExtractionResult.id).desc())
        .all()
    )
    return MethodsFrequencyResponse(
        data=[FrequencyItem(label=r[0], count=r[1]) for r in results]
    )


@router.get("/year-trends", response_model=YearTrendsResponse)
def year_trends(db: Session = Depends(get_db)):
    """Count papers by publication year."""
    results = (
        db.query(Paper.year, func.count(Paper.id))
        .filter(Paper.year.isnot(None))
        .group_by(Paper.year)
        .order_by(Paper.year)
        .all()
    )
    return YearTrendsResponse(
        data=[TrendItem(year=r[0], count=r[1]) for r in results]
    )


@router.get("/distributions/{field_name}", response_model=DistributionResponse)
def field_distribution(field_name: str, db: Session = Depends(get_db)):
    """Get distribution of values for a given extraction field."""
    results = (
        db.query(ExtractionResult.value, func.count(ExtractionResult.id))
        .filter(ExtractionResult.field_name == field_name)
        .filter(ExtractionResult.value.isnot(None))
        .group_by(ExtractionResult.value)
        .order_by(func.count(ExtractionResult.id).desc())
        .limit(50)
        .all()
    )
    return DistributionResponse(
        field=field_name,
        data=[FrequencyItem(label=r[0], count=r[1]) for r in results],
    )
