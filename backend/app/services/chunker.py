from __future__ import annotations
"""
Chunker — splits PDF page text into overlapping chunks with robust section detection.
Uses fixed character-size chunking with overlaps (standard RAG approach).
Breaks at sentence boundaries when possible for cleaner chunks.
"""
import re
from typing import TypedDict


class ChunkData(TypedDict):
    text: str
    page_number: int
    chunk_index: int
    section: str | None


# ── Section Detection ─────────────────────────────────────────────

# Known section headings in academic papers
SECTION_PATTERNS = [
    # Numbered headings: "1. Introduction", "2 Methods"
    re.compile(r"^\s*\d+\.?\s+(Introduction|Background|Overview|Motivation)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Method|Methodology|Materials|Approach|Design|Procedure|Framework)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Result|Finding|Experiment|Evaluation|Performance|Outcome)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Discussion|Analysis|Interpretation|Implication)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Conclusion|Summary|Future)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Related\s+Work|Literature\s+Review|Prior\s+Work)", re.IGNORECASE),
    re.compile(r"^\s*\d+\.?\s+(Limitation|Threat)", re.IGNORECASE),
    # Unnumbered headings (typically ALL CAPS or standalone)
    re.compile(r"^(Abstract)\s*$", re.IGNORECASE),
    re.compile(r"^(ABSTRACT)\s*$"),
    re.compile(r"^(References|Bibliography)\s*$", re.IGNORECASE),
    re.compile(r"^(Acknowledgement|Acknowledgment)", re.IGNORECASE),
]

SECTION_MAP = {
    "introduction": "Introduction",
    "background": "Introduction",
    "overview": "Introduction",
    "motivation": "Introduction",
    "method": "Methods",
    "methodology": "Methods",
    "materials": "Methods",
    "approach": "Methods",
    "design": "Methods",
    "procedure": "Methods",
    "framework": "Methods",
    "result": "Results",
    "finding": "Results",
    "experiment": "Results",
    "evaluation": "Results",
    "performance": "Results",
    "outcome": "Results",
    "discussion": "Discussion",
    "analysis": "Discussion",
    "interpretation": "Discussion",
    "implication": "Discussion",
    "conclusion": "Discussion",
    "summary": "Discussion",
    "future": "Discussion",
    "limitation": "Discussion",
    "threat": "Discussion",
    "related work": "Introduction",
    "literature review": "Introduction",
    "prior work": "Introduction",
    "abstract": "Abstract",
    "references": "References",
    "bibliography": "References",
    "acknowledgement": "Other",
    "acknowledgment": "Other",
}


def detect_section(text: str) -> str | None:
    """Detect section heading from text looking at the first few lines."""
    first_lines = text[:300].strip().split("\n")
    for line in first_lines[:5]:
        line = line.strip()
        if not line:
            continue
        for pattern in SECTION_PATTERNS:
            match = pattern.match(line)
            if match:
                # Extract the first significant word from the match
                captured = match.group(1).lower().strip()
                first_word = captured.split()[0]
                for key, section in SECTION_MAP.items():
                    if key in captured or first_word.startswith(key[:5]):
                        return section
    return None


def create_chunks(
    pages: list[dict],
    paper_id: str,
    chunk_size: int = 1500,
    overlap: int = 300,
) -> list[ChunkData]:
    """
    Split page texts into overlapping chunks with section tracking.

    Uses fixed character-size chunking with sentence-boundary breaks.
    Each chunk inherits the most recently detected section heading.

    Args:
        pages: List of {'page_number': int, 'text': str}
        paper_id: ID of the paper (for reference)
        chunk_size: Target chunk size in characters
        overlap: Overlap between chunks in characters
    """
    chunks: list[ChunkData] = []
    chunk_index = 0
    current_section = None

    for page in pages:
        text = page["text"]
        page_num = page["page_number"]

        # Detect section from this page
        detected = detect_section(text)
        if detected:
            current_section = detected

        # Split page text into fixed-size overlapping chunks
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            # Try to break at sentence boundary for cleaner chunks
            if end < len(text):
                # Look for sentence boundaries: period, newline
                last_period = chunk_text.rfind(". ")
                last_newline = chunk_text.rfind("\n")
                break_point = max(last_period, last_newline)

                # Only break here if we're past half the chunk size
                if break_point > chunk_size * 0.5:
                    chunk_text = chunk_text[:break_point + 1]
                    end = start + break_point + 1

            chunk_text = chunk_text.strip()
            if chunk_text and len(chunk_text) > 50:  # Skip tiny fragments
                # Check if this chunk starts a new section
                section_in_chunk = detect_section(chunk_text)
                if section_in_chunk:
                    current_section = section_in_chunk

                chunks.append({
                    "text": chunk_text,
                    "page_number": page_num,
                    "chunk_index": chunk_index,
                    "section": current_section,
                })
                chunk_index += 1

            start = end - overlap if end < len(text) else len(text)

    return chunks
