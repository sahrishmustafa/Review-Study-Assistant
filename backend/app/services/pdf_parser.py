"""
PDF parser — extracts text from PDF files using PyMuPDF.
"""
import fitz  # PyMuPDF
from typing import TypedDict


class PageData(TypedDict):
    page_number: int
    text: str


def parse_pdf(pdf_path: str) -> list[PageData]:
    """
    Extract text from each page of a PDF.

    Returns:
        List of dicts with 'page_number' (1-indexed) and 'text'.
    """
    pages: list[PageData] = []

    try:
        doc = fitz.open(pdf_path)
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            text = page.get_text("text")
            if text.strip():
                pages.append({
                    "page_number": page_num + 1,
                    "text": text.strip(),
                })
        doc.close()
    except Exception as e:
        raise RuntimeError(f"Failed to parse PDF '{pdf_path}': {e}")

    return pages


def extract_metadata_from_pdf(pdf_path: str) -> dict:
    """
    Extract basic metadata from PDF properties.
    """
    try:
        doc = fitz.open(pdf_path)
        metadata = doc.metadata or {}
        doc.close()
        return {
            "title": metadata.get("title", ""),
            "author": metadata.get("author", ""),
            "subject": metadata.get("subject", ""),
            "creation_date": metadata.get("creationDate", ""),
        }
    except Exception:
        return {}
