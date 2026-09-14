"""Seed Neon/Postgres dari shared/data-kas.json — idempotent (delete + create).
   Jika DB tidak terjangkau, log & skip (API fallback ke JSON; bukan crash server)."""
from __future__ import annotations
import json
import logging
from sqlmodel import Session, select

from .loader import load
from .models import FallbackInsightRow, FallbackChatQARow, SuggestedQuestionRow
from .session import engine, db_available, init_db

log = logging.getLogger("omnigistic")


def seed() -> dict:
    if not db_available():
        log.info("[db] DATABASE_URL kosong → skip (API serve dari shared/data-kas.json via JSON fallback)")
        return {"skipped": True}
    try:
        init_db()
    except Exception as e:
        log.info(f"[seed] init_db gagal ({e!r}) → skip. API tetap hidup via JSON fallback.")
        return {"skipped": True, "error": str(e)}

    data = load()
    try:
        with Session(engine()) as session:
            for m in (FallbackInsightRow, FallbackChatQARow, SuggestedQuestionRow):
                for row in session.exec(select(m)).all():
                    session.delete(row)
            session.commit()

            n_in = n_qa = n_sq = 0
            for role, v in data["fallbackInsights"].items():
                session.add(FallbackInsightRow(role=role, greeting=v["greeting"], insights=json.dumps(v["insights"])))
                n_in += 1
            for qa in data["fallbackChatQA"]:
                session.add(FallbackChatQARow(
                    role=qa["role"],
                    keywords=json.dumps(qa["keywords"]),
                    question=qa["question"],
                    answer=qa["answer"],
                    followups=json.dumps(qa["followups"]),
                ))
                n_qa += 1
            for sq in data["suggestedQuestions"]:
                session.add(SuggestedQuestionRow(
                    page=sq["page"], question=sq["question"],
                    followups=json.dumps(sq["followups"]), order=sq["order"],
                ))
                n_sq += 1
            session.commit()
            return {"insights": n_in, "chat_qa": n_qa, "suggested": n_sq}
    except Exception as e:
        log.info(f"[seed] seed error ({e!r}) → API fallback tetap berfungsi.")
        return {"skipped": True, "error": str(e)}


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    log.info("%s", seed())
