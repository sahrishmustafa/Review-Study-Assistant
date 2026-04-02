"""
Chunker — splits PDF page text into overlapping chunks with heading detection.
"""
import re
from typing import TypedDict


class ChunkData(TypedDict):
    text: str
    page_number: int
    chunk_index: int
    section: str | None


# Heading patterns for academic papers
HEADING_PATTERNS = [
    re.compile(r"^\d+\.?\s+(Introduction|Background)", re.IGNORECASE),
    re.compile(r"^\d+\.?\s+(Method|Methodology|Materials|Approach)", re.IGNORECASE),
    re.compile(r"^\d+\.?\s+(Result|Finding|Experiment)", re.IGNORECASE),
    re.compile(r"^\d+\.?\s+(Discussion|Analysis|Interpretation)", re.IGNORECASE),
    re.compile(r"^\d+\.?\s+(Conclusion|Summary|Future)", re.IGNORECASE),
    re.compile(r"^\d+\.?\s+(Related\s+Work|Literature\s+Review)", re.IGNORECASE),
    re.compile(r"^(Abstract)", re.IGNORECASE),
    re.compile(r"^(References|Bibliography)", re.IGNORECASE),
]

SECTION_MAP = {
    "introduction": "Introduction",
    "background": "Introduction",
    "method": "Methods",
    "methodology": "Methods",
    "materials": "Methods",
    "approach": "Methods",
    "result": "Results",
    "finding": "Results",
    "experiment": "Results",
    "discussion": "Discussion",
    "analysis": "Discussion",
    "interpretation": "Discussion",
    "conclusion": "Discussion",
    "summary": "Discussion",
    "future": "Discussion",
    "related work": "Introduction",
    "literature review": "Introduction",
    "abstract": "Introduction",
    "references": "Other",
    "bibliography": "Other",
}


def detect_section(text: str) -> str | None:
    """Try to detect section heading from the first few lines of text."""
    first_lines = text[:200].strip().split("\n")
    for line in first_lines[:3]:
        line = line.strip()
        for pattern in HEADING_PATTERNS:
            match = pattern.match(line)
            if match:
                heading = match.group(1).lower().split()[0] if match.lastindex else line.lower()
                for key, section in SECTION_MAP.items():
                    if key in heading:
                        return section
    return None


def create_chunks(
    pages: list[dict],
    paper_id: str,
    chunk_size: int = 1500,
    overlap: int = 300,
) -> list[ChunkData]:
    """
    Split page texts into overlapping chunks.

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

        # Split page text into chunks
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            # Try to break at sentence boundary
            if end < len(text):
                last_period = chunk_text.rfind(".")
                last_newline = chunk_text.rfind("\n")
                break_point = max(last_period, last_newline)
                if break_point > chunk_size * 0.5:
                    chunk_text = chunk_text[: break_point + 1]
                    end = start + break_point + 1

            if chunk_text.strip():
                chunks.append({
                    "text": chunk_text.strip(),
                    "page_number": page_num,
                    "chunk_index": chunk_index,
                    "section": current_section,
                })
                chunk_index += 1

            start = end - overlap if end < len(text) else len(text)

    return chunks
