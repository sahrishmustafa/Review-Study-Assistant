"""
Multi-pass extraction engine.

Pipeline:
  Pass 1: Retrieve relevant chunks per field
  Pass 2: LLM extracts structured values from chunks
  Pass 3: Validate, normalize, and score confidence
  Pass 4: Attach provenance and persist results
"""
import json
from sqlalchemy.orm import Session
from app.models.chunk import Chunk
from app.models.extraction import ExtractionSchema, ExtractionResult
from app.models.paper import Paper
from app.models.audit_log import AuditLog
from app.services.llm_client import call_llm_sync, extract_json_from_response
from app.services.confidence_scorer import compute_confidence

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


def run_extraction_pipeline(
    db: Session,
    paper_id: str,
    schema: ExtractionSchema,
) -> list[ExtractionResult]:
    """
    Run the full multi-pass extraction pipeline for one paper.
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    chunks = (
        db.query(Chunk)
        .filter(Chunk.paper_id == paper_id)
        .order_by(Chunk.chunk_index)
        .all()
    )

    if not chunks:
        raise ValueError(f"No chunks found for paper {paper_id}. Process the paper first.")

    fields = schema.fields_definition
    results = []

    for field_def in fields:
        field_name = field_def["name"]
        field_type = field_def.get("type", "string")
        field_desc = field_def.get("description", field_name)

        # ── Pass 1: Retrieve relevant chunks ──────────────────────
        relevant_chunks = _retrieve_relevant_chunks(chunks, field_name, field_desc)

        if not relevant_chunks:
            # No relevant chunks → low confidence null result
            result = ExtractionResult(
                paper_id=paper_id,
                schema_id=schema.id,
                field_name=field_name,
                value=None,
                confidence=0.1,
                source_text=None,
                source_page=None,
                source_chunk_id=None,
            )
            db.add(result)
            results.append(result)
            continue

        # ── Pass 2: LLM extraction ───────────────────────────────
        combined_text = "\n---\n".join(
            [f"[Page {c.page_number}] {c.text}" for c in relevant_chunks[:5]]
        )

        prompt = f"""Extract the following field from the academic paper text below.

Field: {field_name}
Type: {field_type}
Description: {field_desc}

Paper text:
{combined_text[:4000]}

Respond in JSON format:
{{
  "value": <extracted value or null if not found>,
  "source_quote": "<exact quote from the text that supports this value>",
  "reasoning": "<brief explanation>"
}}"""

        try:
            response = call_llm_sync(prompt)
            extracted = extract_json_from_response(response)
        except Exception as e:
            extracted = {"value": None, "source_quote": None, "reasoning": str(e)}

        # ── Pass 3: Validate and normalize ────────────────────────
        value = extracted.get("value")
        source_quote = extracted.get("source_quote", "")

        if value is not None:
            value = _normalize_value(value, field_type)

        # ── Confidence scoring ────────────────────────────────────
        confidence = compute_confidence(
            value=value,
            field_type=field_type,
            source_quote=source_quote,
            num_relevant_chunks=len(relevant_chunks),
            reasoning=extracted.get("reasoning", ""),
        )

        # ── Pass 4: Attach provenance ─────────────────────────────
        source_chunk = relevant_chunks[0] if relevant_chunks else None

        result = ExtractionResult(
            paper_id=paper_id,
            schema_id=schema.id,
            field_name=field_name,
            value=str(value) if value is not None else None,
            confidence=confidence,
            source_text=source_quote,
            source_page=source_chunk.page_number if source_chunk else None,
            source_chunk_id=source_chunk.id if source_chunk else None,
        )
        db.add(result)
        results.append(result)

        # ── Audit log ────────────────────────────────────────────
        audit = AuditLog(
            action="extraction",
            paper_id=paper_id,
            prompt_text=prompt[:2000],
            model_used="configured",
            response_text=json.dumps(extracted)[:2000],
            user_id=DEFAULT_USER_ID,
        )
        db.add(audit)

    db.commit()

    for r in results:
        db.refresh(r)

    return results


def _retrieve_relevant_chunks(
    chunks: list[Chunk],
    field_name: str,
    field_desc: str,
) -> list[Chunk]:
    """
    Pass 1: Retrieve chunks most relevant to the field using keyword matching.
    Falls back to section-based selection if no keyword matches.
    """
    keywords = set()
    keywords.add(field_name.lower().replace("_", " "))
    keywords.update(field_desc.lower().split())
    # Remove common stop words
    keywords -= {"the", "a", "an", "of", "in", "for", "and", "or", "is", "to", "with"}

    scored = []
    for chunk in chunks:
        text_lower = chunk.text.lower()
        score = sum(1 for kw in keywords if kw in text_lower)
        if score > 0:
            scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)

    if scored:
        return [chunk for _, chunk in scored[:5]]

    # Fallback: use Methods/Results sections
    section_chunks = [c for c in chunks if c.section in ("Methods", "Results")]
    if section_chunks:
        return section_chunks[:5]

    # Last resort: first 5 chunks
    return chunks[:5]


def _normalize_value(value, field_type: str):
    """Normalize extracted value to the expected type."""
    if value is None:
        return None

    if field_type == "number":
        try:
            # Handle strings like "120 participants"
            if isinstance(value, str):
                import re
                numbers = re.findall(r"[\d,]+\.?\d*", value.replace(",", ""))
                if numbers:
                    return float(numbers[0])
            return float(value)
        except (ValueError, TypeError):
            return value

    if field_type == "boolean":
        if isinstance(value, bool):
            return value
        return str(value).lower() in ("true", "yes", "1")

    if field_type == "list":
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            return [v.strip() for v in value.split(",")]
        return [value]

    return str(value) if value is not None else None
