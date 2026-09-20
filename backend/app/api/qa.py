"""Fuzzy QA — keyword overlap vs DB (fallback_chat_qa); bila DB off, fallback ke data-kas.json."""
from __future__ import annotations
import json
from fastapi import APIRouter

from fastapi import HTTPException

from app.api.localized_route import LocalizedRoute
from sqlmodel import select
from app.db.models import FallbackChatQARow
from app.db.loader import load_localized
from app.i18n import normalize_lang, translate
from app.db.session import engine, db_available, Session

router = APIRouter(prefix="/api", tags=["qa"], route_class=LocalizedRoute)


def _from_json(role: str, query: str, lang: str = "id") -> dict | None:
    rows = load_localized(lang).get("fallbackChatQA", [])
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
        # Chat mengirim `lang` di BODY (bukan query), sehingga LocalizedRoute di
        # level router tidak ikut menerjemahkan. Terjemahkan di sini agar jalur
        # JSON sama perilakunya dengan jalur DB.
        if normalize_lang(lang) == "en":
            return {
                "id": best.get("id"),
                "role": best["role"],
                "question": translate(best["question"], lang),
                "answer": translate(best["answer"], lang),
                "followups": [translate(f, lang) for f in (best["followups"] or [])],
            }
        return {
            "id": best.get("id"),
            "role": best["role"],
            "question": best["question"],
            "answer": best["answer"],
            "followups": best["followups"],
        }
    return None


def match_chat_qa(role: str, query: str, lang: str = "id") -> dict | None:
    # Normalisasi role ke huruf besar agar jalur DB & JSON konsisten
    # (JSON path memakai .upper(); sebelumnya DB path case-sensitive → divergen).
    role_u = (role or "").upper()
    if db_available():
        try:
            with Session(engine()) as s:
                rows = s.exec(select(FallbackChatQARow).where(FallbackChatQARow.role == role_u)).all()
            best, best_score = None, -1
            for row in rows:
                kws = json.loads(row.keywords)
                score = sum(1 for k in kws if k.lower() in query.lower())
                if score > best_score:
                    best_score = score
                    best = row
            if best is not None and best_score >= 1:
                # Baris DB ikut diterjemahkan agar perilaku sama dengan jalur JSON.
                if normalize_lang(lang) == "en":
                    return {
                        "id": best.id,
                        "role": best.role,
                        "question": translate(best.question or "", lang),
                        "answer": translate(best.answer or "", lang),
                        "followups": [
                            translate(f, lang)
                            for f in (json.loads(best.followups) if best.followups else [])
                        ],
                    }
                return {
                    "id": best.id,
                    "role": best.role,
                    "question": best.question,
                    "answer": best.answer,
                    "followups": json.loads(best.followups) if best.followups else [],
                }
        except Exception:
            pass
    return _from_json(role, query, lang)


@router.get("/suggested")
def suggested(page: str, lang: str = "id"):
    """Pertanyaan kurasi untuk sebuah halaman; page tak dikenal → 404 (bukan [] bisu)."""
    rows = load_localized(lang)["suggestedQuestions"]
    known = {s["page"] for s in rows}
    if page not in known:
        raise HTTPException(status_code=404, detail=f"halaman '{page}' tidak punya pertanyaan kurasi")
    items = [s for s in rows if s["page"] == page]
    items.sort(key=lambda x: x["order"])
    return items