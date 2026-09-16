"""Fuzzy QA — keyword overlap vs DB (fallback_chat_qa); bila DB off, fallback ke data-kas.json."""
from __future__ import annotations
import json
from fastapi import APIRouter, HTTPException
from sqlmodel import select
from app.db.models import FallbackChatQARow
from app.db.loader import load
from app.db.session import engine, db_available, Session

router = APIRouter(prefix="/api", tags=["qa"])


def _from_json(role: str, query: str) -> dict | None:
    rows = load().get("fallbackChatQA", [])
    best = None
    best_score = -1
    for row in rows:
        if row["role"].upper() != role.upper():
            continue
        score = sum(1 for k in row["keywords"] if k.lower() in query.lower())
        if score > best_score:
            best_score = score
            best = row
    if best is not None and best_score >= 1:
        return {
            "id": best.get("id"),
            "role": best["role"],
            "question": best["question"],
            "answer": best["answer"],
            "followups": best["followups"],
        }
    return None


def match_chat_qa(role: str, query: str) -> dict | None:
    if db_available():
        try:
            with Session(engine()) as s:
                rows = s.exec(select(FallbackChatQARow).where(FallbackChatQARow.role == role)).all()
            best, best_score = None, -1
            for row in rows:
                kws = json.loads(row.keywords)
                score = sum(1 for k in kws if k.lower() in query.lower())
                if score > best_score:
                    best_score = score
                    best = row
            if best is not None and best_score >= 1:
                return {
                    "id": best.id,
                    "role": best.role,
                    "question": best.question,
                    "answer": best.answer,
                    "followups": json.loads(best.followups) if best.followups else [],
                }
        except Exception:
            pass
    return _from_json(role, query)


@router.get("/suggested")
def suggested(page: str):
    """Pertanyaan kurasi untuk sebuah halaman; page tak dikenal → 404 (bukan [] bisu)."""
    rows = load()["suggestedQuestions"]
    known = {s["page"] for s in rows}
    if page not in known:
        raise HTTPException(status_code=404, detail=f"halaman '{page}' tidak punya pertanyaan kurasi")
    items = [s for s in rows if s["page"] == page]
    items.sort(key=lambda x: x["order"])
    return items