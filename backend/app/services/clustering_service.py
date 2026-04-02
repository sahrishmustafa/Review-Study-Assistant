"""
Clustering service — semantic paper clustering using FAISS.
"""
import numpy as np
from sqlalchemy.orm import Session
from app.models.chunk import Chunk
from app.models.paper import Paper

# Cache for latest clustering results
_cached_clusters = None


def cluster_papers(db: Session, num_clusters: int = 5) -> list[dict]:
    """
    Cluster papers based on their chunk embeddings.
    Uses FAISS for k-means clustering.
    """
    global _cached_clusters

    papers = db.query(Paper).all()
    if len(papers) < num_clusters:
        num_clusters = max(1, len(papers))

    # Compute paper-level embeddings by averaging chunk embeddings
    paper_embeddings = {}
    for paper in papers:
        chunks = db.query(Chunk).filter(
            Chunk.paper_id == paper.id,
            Chunk.embedding.isnot(None),
        ).all()

        if chunks:
            embeddings = [np.array(c.embedding) for c in chunks if c.embedding]
            if embeddings:
                paper_embeddings[paper.id] = {
                    "embedding": np.mean(embeddings, axis=0),
                    "title": paper.title,
                }

    if len(paper_embeddings) < 2:
        # Not enough papers with embeddings — use simple single cluster
        _cached_clusters = [{
            "cluster_id": 0,
            "label": "All Papers",
            "paper_ids": [p.id for p in papers],
            "size": len(papers),
        }]
        return _cached_clusters

    # Build matrix
    paper_ids = list(paper_embeddings.keys())
    matrix = np.array([paper_embeddings[pid]["embedding"] for pid in paper_ids]).astype("float32")

    try:
        import faiss

        # K-means clustering
        d = matrix.shape[1]
        kmeans = faiss.Kmeans(d, num_clusters, niter=20, verbose=False)
        kmeans.train(matrix)
        _, labels = kmeans.assign(matrix)

        # Group papers by cluster
        clusters_map: dict[int, list[str]] = {}
        for idx, label in enumerate(labels.flatten()):
            label_int = int(label)
            if label_int not in clusters_map:
                clusters_map[label_int] = []
            clusters_map[label_int].append(paper_ids[idx])

        clusters = []
        for cluster_id, pids in sorted(clusters_map.items()):
            clusters.append({
                "cluster_id": cluster_id,
                "label": f"Topic Cluster {cluster_id + 1}",
                "paper_ids": pids,
                "size": len(pids),
            })

    except ImportError:
        # Fallback: scikit-learn KMeans
        from sklearn.cluster import KMeans

        km = KMeans(n_clusters=num_clusters, random_state=42, n_init=10)
        labels = km.fit_predict(matrix)

        clusters_map: dict[int, list[str]] = {}
        for idx, label in enumerate(labels):
            if label not in clusters_map:
                clusters_map[label] = []
            clusters_map[label].append(paper_ids[idx])

        clusters = []
        for cluster_id, pids in sorted(clusters_map.items()):
            clusters.append({
                "cluster_id": cluster_id,
                "label": f"Topic Cluster {cluster_id + 1}",
                "paper_ids": pids,
                "size": len(pids),
            })

    _cached_clusters = clusters
    return clusters


def get_cached_clusters():
    """Return cached clustering results."""
    return _cached_clusters
