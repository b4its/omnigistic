"""Insights per role — dibaca dari data-kas (fallbackInsights). Gate: validasi role."""
from __future__ import annotations
from fastapi import APIRouter, HTTPException

from app.db.loader import load

router = APIRouter(prefix="/api", tags=["insights"])
VALID = {"PUSAT", "HUB", "KURIR", "DATA"}


def get_insights(role: str) -> dict:
    role = role.upper()
    if role not in VALID:
        raise HTTPException(status_code=400, detail="invalid role")
    data = load()["fallbackInsights"].get(role)
    if not data:
        return {"greeting": "", "insights": []}
    return data


@router.get("/insights")
def insights(role: str):
    return get_insights(role)
