"""
Vector Store — ChromaDB-backed semantic search for paper chunks.
Provides embedding storage, similarity search, and metadata filtering.
"""
from __future__ import annotations
import chromadb
from chromadb.config import Settings as ChromaSettings
from sentence_transformers import SentenceTransformer
from app.config import settings
import os
import numpy as np


# ── Singleton instances ── keep model + client in memory ──────────

_chroma_client: chromadb.PersistentClient | None = None
_embedding_model: SentenceTransformer | None = None


def _get_chroma_client() -> chromadb.PersistentClient:
    """Return (or create) a persistent ChromaDB client."""
    global _chroma_client
    if _chroma_client is None:
        # chroma_persist_dir could be relative, ensure absolute to avoid KeyError on reload
        persist_dir = os.path.abspath(settings.CHROMA_PERSIST_DIR)
        os.makedirs(persist_dir, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=persist_dir,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
    return _chroma_client


def _get_embedding_model() -> SentenceTransformer:
    """Return (or load) the sentence-transformers model."""
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model


# ── Collection helpers ────────────────────────────────────────────

COLLECTION_NAME = "slr_chunks"


def _get_collection() -> chromadb.Collection:
    """Get or create the main chunks collection."""
    client = _get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# ── Public API ────────────────────────────────────────────────────

def generate_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate embeddings using sentence-transformers (runs locally)."""
    model = _get_embedding_model()
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def add_chunks(
    paper_id: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    """
    Store chunks with their embeddings in ChromaDB.

    Each chunk dict must have: chunk_id, text, section, page_number
    """
    collection = _get_collection()

    ids = [c["chunk_id"] for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "paper_id": paper_id,
            "section": c.get("section") or "Other",
            "page_number": c.get("page_number", 0),
            "chunk_index": c.get("chunk_index", 0),
        }
        for c in chunks
    ]

    collection.add(
        ids=ids,
        embeddings=embeddings,
        documents=documents,
        metadatas=metadatas,
    )


def search(
    query_text: str,
    paper_ids: list[str] | None = None,
    top_k: int | None = None,
    section_filter: str | None = None,
) -> list[dict]:
    """
    Semantic search across chunks.

    Args:
        query_text: natural language query
        paper_ids: optional list of paper IDs to restrict search
        top_k: number of results (default from config)
        section_filter: optional section name to filter by

    Returns:
        List of dicts: {chunk_id, text, paper_id, section, page_number, score}
    """
    if top_k is None:
        top_k = settings.VECTOR_SEARCH_TOP_K

    collection = _get_collection()

    # Generate query embedding
    query_embedding = generate_embeddings([query_text])[0]

    # Build where filter
    where_filter = None
    conditions = []

    if paper_ids and len(paper_ids) == 1:
        conditions.append({"paper_id": {"$eq": paper_ids[0]}})
    elif paper_ids and len(paper_ids) > 1:
        conditions.append({"paper_id": {"$in": paper_ids}})

    if section_filter:
        conditions.append({"section": {"$eq": section_filter}})

    if len(conditions) == 1:
        where_filter = conditions[0]
    elif len(conditions) > 1:
        where_filter = {"$and": conditions}

    try:
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )
    except Exception:
        return []

    # Format results
    output = []
    if results and results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            distance = results["distances"][0][i] if results["distances"] else 1.0
            # ChromaDB cosine distance: 0 = identical, 2 = opposite
            # Convert to similarity score: 1 - (distance / 2)
            score = 1.0 - (distance / 2.0)

            output.append({
                "chunk_id": chunk_id,
                "text": results["documents"][0][i],
                "paper_id": results["metadatas"][0][i].get("paper_id"),
                "section": results["metadatas"][0][i].get("section"),
                "page_number": results["metadatas"][0][i].get("page_number"),
                "chunk_index": results["metadatas"][0][i].get("chunk_index"),
                "score": round(score, 4),
            })

    return output


def search_paper(
    paper_id: str,
    query_text: str,
    top_k: int | None = None,
) -> list[dict]:
    """Semantic search within a single paper."""
    return search(query_text, paper_ids=[paper_id], top_k=top_k)


def delete_paper(paper_id: str) -> None:
    """Remove all chunks for a paper from the vector store."""
    collection = _get_collection()
    try:
        # Get all chunk IDs for this paper
        results = collection.get(
            where={"paper_id": {"$eq": paper_id}},
            include=[],
        )
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception:
        pass


def delete_all_chunks() -> None:
    """Remove all chunks from the vector store collection."""
    collection = _get_collection()
    try:
        # Get all chunk IDs
        results = collection.get(include=[])
        if results["ids"]:
            collection.delete(ids=results["ids"])
    except Exception:
        pass


def get_paper_chunks(paper_id: str) -> list[dict]:
    """Retrieve all stored chunks for a paper from vector store."""
    collection = _get_collection()
    try:
        results = collection.get(
            where={"paper_id": {"$eq": paper_id}},
            include=["documents", "metadatas"],
        )
        output = []
        for i, chunk_id in enumerate(results["ids"]):
            output.append({
                "chunk_id": chunk_id,
                "text": results["documents"][i],
                "paper_id": results["metadatas"][i].get("paper_id"),
                "section": results["metadatas"][i].get("section"),
                "page_number": results["metadatas"][i].get("page_number"),
                "chunk_index": results["metadatas"][i].get("chunk_index"),
            })
        return output
    except Exception:
        return []


def compute_topic_similarity(paper_id: str, topic_query: str) -> float:
    """
    Compute how similar a paper is to a given topic query.
    Uses average similarity of top-k chunks to the query.
    """
    results = search_paper(paper_id, topic_query, top_k=5)
    if not results:
        return 0.0
    scores = [r["score"] for r in results]
    return round(float(np.mean(scores)), 4)
