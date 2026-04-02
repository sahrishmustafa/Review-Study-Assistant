from __future__ import annotations
"""
Screening Service — dynamic programmatic filtering of papers.

Replaces the old slr_protocol.py with a flexible, score-based system.
Each filter produces a 0-1 score; final score is the weighted average.
Papers above the threshold pass screening.
"""
import re
from sqlalchemy.orm import Session
from app.models.paper import Paper, PaperStatus
from app.models.screening import ScreeningCriteria, ScreeningResult
from app.models.chunk import Chunk
from app.config import settings


def run_screening(
    db: Session,
    criteria_id: str,
    paper_ids: list[str] | None = None,
) -> list[dict]:
    """
    Run screening on papers using the specified criteria.

    Returns list of per-paper results with filter scores.
    """
    criteria = db.query(ScreeningCriteria).filter(
        ScreeningCriteria.id == criteria_id
    ).first()
    if not criteria:
        raise ValueError(f"Screening criteria {criteria_id} not found")

    filters = criteria.criteria_definition
    threshold = criteria.threshold or settings.SCREENING_THRESHOLD

    # Get papers to screen
    if paper_ids:
        papers = db.query(Paper).filter(Paper.id.in_(paper_ids)).all()
    else:
        papers = db.query(Paper).filter(
            Paper.status.in_([PaperStatus.PENDING.value, PaperStatus.PROCESSED.value])
        ).all()

    results = []
    for paper in papers:
        filter_scores = {}
        reasons = []

        # ── Year range filter ─────────────────────────────────────
        year_range = filters.get("year_range")
        if year_range and len(year_range) == 2:
            if paper.year:
                if year_range[0] <= paper.year <= year_range[1]:
                    filter_scores["year"] = 1.0
                else:
                    filter_scores["year"] = 0.0
                    reasons.append(f"Year {paper.year} outside [{year_range[0]}, {year_range[1]}]")
            else:
                filter_scores["year"] = 0.5  # Unknown year → neutral

        # ── Paper type filter (via LLM-lite: title + abstract heuristics) ──
        paper_types = filters.get("paper_types")
        if paper_types:
            type_score = _detect_paper_type_score(paper, paper_types, db)
            filter_scores["paper_type"] = type_score
            if type_score < 0.5:
                reasons.append(f"Paper type likely not in {paper_types}")

        # ── Keyword filters ───────────────────────────────────────
        required_kw = filters.get("required_keywords", [])
        if required_kw:
            kw_score = _keyword_match_score(paper, required_kw, db, required=True)
            filter_scores["required_keywords"] = kw_score
            if kw_score < 0.5:
                reasons.append(f"Missing required keywords")

        excluded_kw = filters.get("excluded_keywords", [])
        if excluded_kw:
            excl_score = _keyword_exclusion_score(paper, excluded_kw, db)
            filter_scores["excluded_keywords"] = excl_score
            if excl_score < 0.5:
                reasons.append(f"Contains excluded keywords")

        # ── Page count filter ─────────────────────────────────────
        min_pages = filters.get("min_pages")
        max_pages = filters.get("max_pages")
        if min_pages is not None or max_pages is not None:
            page_score = _page_count_score(paper, db, min_pages, max_pages)
            filter_scores["page_count"] = page_score

        # ── Topic/domain semantic match ───────────────────────────
        topic_query = filters.get("topic_query")
        if topic_query:
            from app.services.vector_store import compute_topic_similarity
            topic_score = compute_topic_similarity(paper.id, topic_query)
            filter_scores["topic_match"] = topic_score
            if topic_score < 0.3:
                reasons.append(f"Low topic relevance ({topic_score:.2f})")

        # ── Domain/category filter ────────────────────────────────
        domain = filters.get("domain")
        if domain:
            domain_score = _domain_match_score(paper, domain, db)
            filter_scores["domain"] = domain_score

        # ── Compute final score (average of all filter scores) ────
        if filter_scores:
            final_score = sum(filter_scores.values()) / len(filter_scores)
        else:
            final_score = 1.0  # No filters → pass by default

        passed = final_score >= threshold

        # ── Persist result ────────────────────────────────────────
        # Remove old result for same paper+criteria
        db.query(ScreeningResult).filter(
            ScreeningResult.paper_id == paper.id,
            ScreeningResult.criteria_id == criteria_id,
        ).delete()

        result = ScreeningResult(
            paper_id=paper.id,
            criteria_id=criteria_id,
            filter_scores=filter_scores,
            final_score=round(final_score, 4),
            passed=passed,
            exclusion_reason="; ".join(reasons) if reasons else None,
        )
        db.add(result)

        # Update paper status
        if passed:
            paper.status = PaperStatus.INCLUDED.value
            paper.exclusion_reason = None
        else:
            paper.status = PaperStatus.EXCLUDED.value
            paper.exclusion_reason = "; ".join(reasons) if reasons else "Below threshold"

        results.append({
            "paper_id": paper.id,
            "title": paper.title,
            "filter_scores": filter_scores,
            "final_score": round(final_score, 4),
            "passed": passed,
            "exclusion_reason": result.exclusion_reason,
        })

    db.commit()
    return results


# ── Helper functions ──────────────────────────────────────────────

def _detect_paper_type_score(
    paper: Paper,
    allowed_types: list[str],
    db: Session,
) -> float:
    """
    Detect paper type from title, abstract, and first chunks.
    Uses keyword heuristics — no LLM call needed for coarse screening.
    """
    # Build searchable text from title + abstract + first chunks
    search_text = (paper.title or "").lower()
    if paper.abstract:
        search_text += " " + paper.abstract.lower()
    else:
        # Fall back to first few chunks
        chunks = db.query(Chunk).filter(
            Chunk.paper_id == paper.id
        ).order_by(Chunk.chunk_index).limit(3).all()
        for c in chunks:
            search_text += " " + c.text.lower()

    type_indicators = {
        "review": ["systematic review", "literature review", "meta-analysis", "survey", "scoping review"],
        "slr": ["systematic literature review", "slr", "prisma", "systematic review"],
        "journal": ["journal", "article", "empirical study"],
        "conference": ["proceedings", "conference", "workshop", "symposium"],
        "book": ["book chapter", "book", "textbook", "monograph"],
        "thesis": ["thesis", "dissertation"],
        "preprint": ["preprint", "arxiv", "biorxiv", "medrxiv"],
    }

    best_score = 0.0
    for allowed_type in allowed_types:
        allowed_lower = allowed_type.lower()
        indicators = type_indicators.get(allowed_lower, [allowed_lower])
        matches = sum(1 for ind in indicators if ind in search_text)
        if matches > 0:
            score = min(1.0, matches / len(indicators) + 0.3)
            best_score = max(best_score, score)

    return round(best_score, 4)


def _keyword_match_score(
    paper: Paper,
    keywords: list[str],
    db: Session,
    required: bool = True,
) -> float:
    """Score based on how many required keywords are found."""
    search_text = (paper.title or "").lower()
    if paper.abstract:
        search_text += " " + paper.abstract.lower()
    else:
        chunks = db.query(Chunk).filter(
            Chunk.paper_id == paper.id
        ).order_by(Chunk.chunk_index).limit(5).all()
        for c in chunks:
            search_text += " " + c.text.lower()

    found = sum(1 for kw in keywords if kw.lower() in search_text)
    if not keywords:
        return 1.0
    return round(found / len(keywords), 4)


def _keyword_exclusion_score(
    paper: Paper,
    excluded_keywords: list[str],
    db: Session,
) -> float:
    """Score 1.0 if none of excluded keywords found, 0.0 if all found."""
    search_text = (paper.title or "").lower()
    if paper.abstract:
        search_text += " " + paper.abstract.lower()

    found = sum(1 for kw in excluded_keywords if kw.lower() in search_text)
    if not excluded_keywords:
        return 1.0
    return round(1.0 - (found / len(excluded_keywords)), 4)


def _page_count_score(
    paper: Paper,
    db: Session,
    min_pages: int | None,
    max_pages: int | None,
) -> float:
    """Score based on estimated page count from chunks."""
    # Estimate page count from max page_number in chunks
    from sqlalchemy import func
    max_page = db.query(func.max(Chunk.page_number)).filter(
        Chunk.paper_id == paper.id
    ).scalar()

    if max_page is None:
        return 0.5  # Unknown

    if min_pages and max_page < min_pages:
        return 0.0
    if max_pages and max_page > max_pages:
        return 0.0
    return 1.0


def _domain_match_score(
    paper: Paper,
    domain: str,
    db: Session,
) -> float:
    """Score domain match using title + abstract keyword matching."""
    search_text = (paper.title or "").lower()
    if paper.abstract:
        search_text += " " + paper.abstract.lower()

    domain_lower = domain.lower()
    domain_terms = domain_lower.split()

    found = sum(1 for term in domain_terms if term in search_text)
    if not domain_terms:
        return 1.0
    return round(found / len(domain_terms), 4)
