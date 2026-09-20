"""Insights per role — dibaca dari data-kas (fallbackInsights). Gate: validasi role."""
from __future__ import annotations
from fastapi import APIRouter

from fastapi import HTTPException

from app.api.localized_route import LocalizedRoute

from app.db.loader import load_localized

router = APIRouter(prefix="/api", tags=["insights"], route_class=LocalizedRoute)
VALID = {"PUSAT", "HUB", "KURIR", "DATA", "CUSTOMER", "SELLER"}


def get_insights(role: str, lang: str = "id") -> dict:
    role = role.upper()
    if role not in VALID:
        raise HTTPException(status_code=400, detail="invalid role")
    data = load_localized(lang)["fallbackInsights"].get(role)
    if not data:
        return {"greeting": "", "insights": []}
    return data


@router.get("/insights")
def insights(role: str, lang: str = "id"):
    return get_insights(role, lang)
