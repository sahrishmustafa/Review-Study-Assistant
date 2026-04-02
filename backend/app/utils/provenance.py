"""
Provenance utilities — helpers for source tracking and traceability.
"""


def build_provenance_record(
    chunk_id: str,
    chunk_text: str,
    page_number: int,
    source_quote: str,
    confidence: float,
) -> dict:
    """Build a standardized provenance record."""
    return {
        "chunk_id": chunk_id,
        "page_number": page_number,
        "source_quote": source_quote,
        "full_chunk_text": chunk_text,
        "confidence": confidence,
    }


def highlight_source_in_text(full_text: str, source_quote: str) -> dict:
    """
    Find the position of a source quote in the full text.
    Returns start/end character positions for frontend highlighting.
    """
    if not source_quote or not full_text:
        return {"found": False}

    # Normalize whitespace for matching
    import re
    normalized_quote = re.sub(r"\s+", " ", source_quote.strip())
    normalized_text = re.sub(r"\s+", " ", full_text)

    start = normalized_text.lower().find(normalized_quote.lower())
    if start >= 0:
        return {
            "found": True,
            "start": start,
            "end": start + len(normalized_quote),
            "matched_text": normalized_text[start : start + len(normalized_quote)],
        }

    # Fuzzy match: try first 50 chars of quote
    short_quote = normalized_quote[:50]
    start = normalized_text.lower().find(short_quote.lower())
    if start >= 0:
        return {
            "found": True,
            "start": start,
            "end": start + len(normalized_quote),
            "matched_text": normalized_text[start : start + len(normalized_quote)],
            "fuzzy": True,
        }

    return {"found": False}
