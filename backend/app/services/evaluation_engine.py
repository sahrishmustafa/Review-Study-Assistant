from __future__ import annotations
"""
Evaluation Engine — RAG-based deep paper evaluation using research questions.

Replaces the old extraction_engine.py with a provenance-tracked,
vector-search-based evaluation pipeline.

Pipeline:
  1. User defines research questions (RQs)
  2. For each paper × each RQ:
     a. Vector search top-k chunks relevant to the RQ
     b. Feed chunks to LLM with strict provenance prompt
     c. Extract: answer, source_quote, score (0-1)
  3. Compute composite score per paper
  4. Threshold filter: papers below threshold marked excluded
"""
import json
from sqlalchemy.orm import Session
from app.models.paper import Paper, PaperStatus
from app.models.evaluation import ResearchQuestion, EvaluationResult
from app.models.audit_log import AuditLog
from app.services.llm_client import call_llm_sync, extract_json_from_response
from app.services.vector_store import search_paper
from app.config import settings

DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001"


def run_evaluation(
    db: Session,
    paper_id: str,
    question_ids: list[str] | None = None,
) -> dict:
    """
    Run RAG-based evaluation for a paper against research questions.

    Returns:
        {
            "paper_id": "...",
            "scores": {"RQ1": 0.8, "RQ2": 0.6},
            "final_score": 0.7,
            "results": [...]
        }
    """
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    # Get research questions
    if question_ids:
        questions = db.query(ResearchQuestion).filter(
            ResearchQuestion.id.in_(question_ids)
        ).all()
    else:
        questions = db.query(ResearchQuestion).all()

    if not questions:
        raise ValueError("No research questions defined. Create research questions first.")

    results = []
    scores = {}
    total_weight = 0.0

    for rq in questions:
        # ── Step 1: Vector search for relevant chunks ─────────
        retrieved_chunks = search_paper(paper_id, rq.question_text, top_k=5)

        if not retrieved_chunks:
            # No chunks found — paper may not be processed
            result = EvaluationResult(
                paper_id=paper_id,
                question_id=rq.id,
                answer="No relevant content found in this paper.",
                score=0.1,
                source_chunk_id=None,
                source_quote=None,
                source_page=None,
                reasoning="No chunks matched the research question.",
                context_chunk_ids=[],
            )
            db.add(result)
            results.append(result)
            scores[rq.question_text[:50]] = 0.1
            total_weight += rq.weight
            continue

        # ── Step 2: Build context from retrieved chunks ───────
        context_parts = []
        for chunk in retrieved_chunks:
            context_parts.append(
                f"[Chunk {chunk['chunk_id'][:8]} | Page {chunk['page_number']} | {chunk['section']}]\n"
                f"{chunk['text']}"
            )
        context_text = "\n\n---\n\n".join(context_parts)

        # ── Step 3: LLM evaluation with strict provenance prompt ──
        prompt = f"""You are evaluating an academic paper against a research question.

RESEARCH QUESTION: {rq.question_text}

PAPER CONTENT (retrieved sections):
{context_text[:6000]}

INSTRUCTIONS:
1. Answer the research question based ONLY on the provided paper content.
2. You MUST provide an exact quote from the text that supports your answer.
3. If the paper does not address this question, say so explicitly.
4. Rate how well this paper addresses the question on a scale of 0.0 to 1.0.

Respond in JSON format:
{{
  "answer": "<your answer based on the paper content>",
  "source_quote": "<exact quote from the paper that supports your answer>",
  "score": <float between 0.0 and 1.0>,
  "reasoning": "<brief explanation of your scoring>"
}}"""

        try:
            response = call_llm_sync(prompt)
            extracted = extract_json_from_response(response)
        except Exception as e:
            extracted = {
                "answer": f"Evaluation error: {str(e)}",
                "source_quote": None,
                "score": 0.1,
                "reasoning": str(e),
            }

        # ── Step 4: Extract and validate results ──────────────
        answer = extracted.get("answer", "")
        source_quote = extracted.get("source_quote", "")
        score = float(extracted.get("score", 0.1))
        reasoning = extracted.get("reasoning", "")

        # Clamp score to valid range
        score = max(0.0, min(1.0, score))

        # Find the best matching source chunk for provenance
        best_chunk = retrieved_chunks[0] if retrieved_chunks else None

        # If source_quote is provided, try to find which chunk it came from
        if source_quote and len(source_quote) > 10:
            for chunk in retrieved_chunks:
                if source_quote.lower()[:50] in chunk["text"].lower():
                    best_chunk = chunk
                    break

        # ── Step 5: Remove old results and persist ────────────
        db.query(EvaluationResult).filter(
            EvaluationResult.paper_id == paper_id,
            EvaluationResult.question_id == rq.id,
        ).delete()

        result = EvaluationResult(
            paper_id=paper_id,
            question_id=rq.id,
            answer=answer,
            score=score,
            source_chunk_id=best_chunk["chunk_id"] if best_chunk else None,
            source_quote=source_quote if source_quote else None,
            source_page=best_chunk["page_number"] if best_chunk else None,
            reasoning=reasoning,
            context_chunk_ids=[c["chunk_id"] for c in retrieved_chunks],
        )
        db.add(result)
        results.append(result)

        scores[rq.question_text[:50]] = score
        total_weight += rq.weight

        # ── Audit log ─────────────────────────────────────────
        audit = AuditLog(
            action="evaluation",
            paper_id=paper_id,
            prompt_text=prompt[:2000],
            model_used=settings.LLM_MODEL,
            response_text=json.dumps(extracted)[:2000],
            user_id=DEFAULT_USER_ID,
        )
        db.add(audit)

    # ── Compute composite score ───────────────────────────────
    if questions and total_weight > 0:
        weighted_sum = sum(
            r.score * next(q.weight for q in questions if q.id == r.question_id)
            for r in results
        )
        final_score = round(weighted_sum / total_weight, 4)
    else:
        final_score = 0.0

    db.commit()

    for r in results:
        db.refresh(r)

    return {
        "paper_id": paper_id,
        "title": paper.title,
        "scores": scores,
        "final_score": final_score,
        "passed": final_score >= settings.EVALUATION_THRESHOLD,
        "results": results,
    }


def run_evaluation_batch(
    db: Session,
    paper_ids: list[str],
    question_ids: list[str] | None = None,
    apply_threshold: bool = True,
) -> list[dict]:
    """
    Run evaluation on multiple papers and optionally apply threshold filtering.
    """
    all_results = []

    for paper_id in paper_ids:
        try:
            result = run_evaluation(db, paper_id, question_ids)

            # Apply threshold filtering
            if apply_threshold:
                paper = db.query(Paper).filter(Paper.id == paper_id).first()
                if paper:
                    if result["final_score"] >= settings.EVALUATION_THRESHOLD:
                        paper.status = PaperStatus.INCLUDED.value
                        paper.exclusion_reason = None
                    else:
                        paper.status = PaperStatus.EXCLUDED.value
                        paper.exclusion_reason = f"Evaluation score {result['final_score']:.2f} below threshold {settings.EVALUATION_THRESHOLD}"

            all_results.append(result)
        except Exception as e:
            all_results.append({
                "paper_id": paper_id,
                "title": "Error",
                "scores": {},
                "final_score": 0.0,
                "passed": False,
                "error": str(e),
                "results": [],
            })

    db.commit()
    return all_results


def get_paper_evaluation_summary(db: Session, paper_id: str) -> dict:
    """Get evaluation summary for a specific paper with all provenance data."""
    paper = db.query(Paper).filter(Paper.id == paper_id).first()
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")

    eval_results = db.query(EvaluationResult).filter(
        EvaluationResult.paper_id == paper_id
    ).all()

    rq_results = []
    for er in eval_results:
        rq = db.query(ResearchQuestion).filter(
            ResearchQuestion.id == er.question_id
        ).first()

        rq_results.append({
            "question": rq.question_text if rq else "Unknown",
            "answer": er.answer,
            "score": er.score,
            "source_quote": er.source_quote,
            "source_page": er.source_page,
            "source_chunk_id": er.source_chunk_id,
            "reasoning": er.reasoning,
        })

    # Compute overall score
    if eval_results:
        final_score = sum(r.score for r in eval_results) / len(eval_results)
    else:
        final_score = 0.0

    return {
        "paper_id": paper_id,
        "title": paper.title,
        "final_score": round(final_score, 4),
        "passed": final_score >= settings.EVALUATION_THRESHOLD,
        "evaluations": rq_results,
    }
