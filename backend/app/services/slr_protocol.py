"""
SLR Protocol Engine — evaluates papers against inclusion/exclusion criteria.
"""
from sqlalchemy.orm import Session
from app.models.paper import Paper, PaperStatus


def evaluate_paper(
    db: Session,
    paper_id: str,
    criteria: dict,
) -> dict:
    """
    Evaluate a paper against SLR inclusion/exclusion criteria.

    Args:
        criteria: {
            "year_range": [2018, 2025],
            "study_type": ["RCT", "cohort"],
            "required_keywords": ["machine learning"],
            "excluded_keywords": ["survey"],
            "min_sample_size": 50,
        }

    Returns:
        {"included": bool, "reason": str, "details": list[str]}
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        return {"included": False, "reason": "Paper not found", "details": []}

    details = []
    excluded = False
    reason = ""

    # Year range check
    year_range = criteria.get("year_range")
    if year_range and paper.year:
        if paper.year < year_range[0] or paper.year > year_range[1]:
            excluded = True
            reason = f"Year {paper.year} outside range {year_range}"
            details.append(reason)

    # Required keywords in abstract
    required_kw = criteria.get("required_keywords", [])
    if required_kw and paper.abstract:
        abstract_lower = paper.abstract.lower()
        missing = [kw for kw in required_kw if kw.lower() not in abstract_lower]
        if missing:
            excluded = True
            msg = f"Missing required keywords: {', '.join(missing)}"
            reason = reason or msg
            details.append(msg)

    # Excluded keywords
    excluded_kw = criteria.get("excluded_keywords", [])
    if excluded_kw and paper.abstract:
        abstract_lower = paper.abstract.lower()
        found = [kw for kw in excluded_kw if kw.lower() in abstract_lower]
        if found:
            excluded = True
            msg = f"Contains excluded keywords: {', '.join(found)}"
            reason = reason or msg
            details.append(msg)

    if excluded:
        paper.status = PaperStatus.EXCLUDED.value
        paper.exclusion_reason = reason
    else:
        paper.status = PaperStatus.INCLUDED.value
        paper.exclusion_reason = None

    db.commit()

    return {
        "included": not excluded,
        "reason": reason if excluded else "Meets all criteria",
        "details": details,
    }


def evaluate_all_papers(db: Session, criteria: dict) -> list[dict]:
    """Evaluate all pending papers against criteria."""
    papers = db.query(Paper).filter(
        Paper.status.in_([PaperStatus.PENDING.value, PaperStatus.PROCESSED.value])
    ).all()

    results = []
    for paper in papers:
        result = evaluate_paper(db, paper.id, criteria)
        result["paper_id"] = paper.id
        result["title"] = paper.title
        results.append(result)

    return results
