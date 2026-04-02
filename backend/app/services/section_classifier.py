"""
Section classifier — classifies chunks into Introduction, Methods, Results, Discussion.
Uses rule-based heading detection first, then LLM fallback.
"""

SECTION_KEYWORDS = {
    "Introduction": [
        "introduction", "background", "motivation", "overview",
        "context", "purpose", "objective", "aim", "scope",
    ],
    "Methods": [
        "method", "methodology", "approach", "design", "procedure",
        "implementation", "algorithm", "framework", "setup",
        "experiment setup", "data collection", "materials",
    ],
    "Results": [
        "result", "finding", "outcome", "experiment", "evaluation",
        "performance", "accuracy", "comparison", "analysis",
        "empirical", "observation", "measurement",
    ],
    "Discussion": [
        "discussion", "implication", "limitation", "future",
        "conclusion", "summary", "interpretation", "significance",
        "contribution", "threat", "validity",
    ],
}


def classify_chunk_rule_based(text: str) -> str | None:
    """Classify chunk section using keyword frequency."""
    text_lower = text.lower()
    scores = {}
    for section, keywords in SECTION_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scores[section] = score

    if scores:
        return max(scores, key=scores.get)
    return None


def classify_sections(chunks: list[dict]) -> list[dict]:
    """
    Classify sections for chunks that don't already have one assigned.
    Uses rule-based classification with LLM fallback capability.
    """
    current_section = None

    for chunk in chunks:
        # If section already detected by heading parser, keep it
        if chunk.get("section"):
            current_section = chunk["section"]
            continue

        # Try rule-based classification
        detected = classify_chunk_rule_based(chunk["text"])
        if detected:
            current_section = detected
            chunk["section"] = detected
        elif current_section:
            # Inherit from previous chunk (papers are sequential)
            chunk["section"] = current_section
        else:
            chunk["section"] = "Other"

    return chunks


async def classify_sections_with_llm(chunks: list[dict]) -> list[dict]:
    """
    LLM-enhanced section classification for chunks that couldn't be classified
    by rule-based methods. Called asynchronously.
    """
    from app.services.llm_client import call_llm

    unclassified = [c for c in chunks if c.get("section") in (None, "Other")]

    if not unclassified:
        return chunks

    for chunk in unclassified:
        prompt = f"""Classify the following academic paper text into one of these sections:
- Introduction
- Methods
- Results
- Discussion
- Other

Text (first 500 chars):
{chunk['text'][:500]}

Respond with only the section name."""

        try:
            response = await call_llm(prompt)
            section = response.strip()
            if section in ("Introduction", "Methods", "Results", "Discussion"):
                chunk["section"] = section
            else:
                chunk["section"] = "Other"
        except Exception:
            chunk["section"] = "Other"

    return chunks
