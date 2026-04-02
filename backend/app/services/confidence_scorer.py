"""
Confidence scorer — computes confidence for extraction results.
"""


def compute_confidence(
    value,
    field_type: str,
    source_quote: str,
    num_relevant_chunks: int,
    reasoning: str = "",
) -> float:
    """
    Compute a confidence score (0.0 - 1.0) for an extracted value.

    Factors:
    - Whether a value was extracted
    - Source quote presence and length
    - Number of corroborating chunks
    - Type match quality
    - Reasoning quality indicators
    """
    if value is None:
        return 0.1

    score = 0.5  # Base score for having a value

    # Source quote quality
    if source_quote:
        quote_len = len(source_quote)
        if quote_len > 50:
            score += 0.15
        elif quote_len > 20:
            score += 0.10
        else:
            score += 0.05

    # Corroborating chunks
    if num_relevant_chunks >= 3:
        score += 0.15
    elif num_relevant_chunks >= 2:
        score += 0.10
    elif num_relevant_chunks >= 1:
        score += 0.05

    # Type match quality
    if field_type == "number" and isinstance(value, (int, float)):
        score += 0.10
    elif field_type == "string" and isinstance(value, str) and len(value) > 5:
        score += 0.05
    elif field_type == "boolean" and isinstance(value, bool):
        score += 0.10

    # Reasoning quality
    if reasoning:
        ambiguity_words = ["unclear", "ambiguous", "uncertain", "might", "possibly", "maybe"]
        if any(word in reasoning.lower() for word in ambiguity_words):
            score -= 0.15
        elif len(reasoning) > 20:
            score += 0.05

    return round(min(max(score, 0.05), 0.99), 2)
