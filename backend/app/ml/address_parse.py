"""Address Intelligence — tokenizer + rapidfuzz fuzzy matching ke data kasus (Figure 1).

Resolver: alamat ambigu → kandidat koordinat terskor; feed Leaflet map + ETA.
Kandidat DIBACA dari ``shared/data-kas.json['ambiguousAddresses']`` (satu sumber
kebenaran), bukan tabel hardcode — agar engine tak melenceng bila data kasus berubah.
"""
from __future__ import annotations

from math import asin, cos, radians, sin, sqrt
from typing import Any

from app.db.loader import load

try:
    from rapidfuzz import fuzz
    HAVE_RAPIDFUZZ = True
except Exception:
    HAVE_RAPIDFUZZ = False

# Origin pengantaran = hub Jakarta (kasus: 3 alamat ambigu berada di Jabodetabek).
_ORIGIN_LATLON = (-6.2088, 106.8456)
_LAST_MILE_KMH = 22.0  # asumsi kecepatan last-mile (dilabel)
# Ambang kecocokan minimum: di bawah ini → tidak ada kandidat terpilih
# (mencegah false-positive geocoding untuk alamat yang tak dikenal).
_MATCH_MIN_SCORE = 0.5


def _candidates() -> list[dict]:
    """Kandidat dari sumber kebenaran; fallback aman bila field kosong."""
    rows = load().get("ambiguousAddresses", [])
    out = []
    for r in rows:
        if r.get("city") and r.get("coordinate"):
            out.append({
                "city": r["city"],
                "district": r.get("district", ""),
                # Normalisasi: JSON memakai "lat, lon" (dengan spasi) → "lat,lon".
                "coordinate": ",".join(p.strip() for p in str(r["coordinate"]).split(",")),
            })
    return out


def _ratio(a: str, b: str) -> float:
    la, lb = a.lower(), b.lower()
    if HAVE_RAPIDFUZZ:
        return float(fuzz.partial_ratio(la, lb)) / 100
    # fallback: overlap token
    sa, sb = set(la.split()), set(lb.split())
    return len(sa & sb) / max(1, len(sa))


def _eta_for(coordinate: str) -> tuple[float | None, int | None]:
    try:
        lat1, lon1 = _ORIGIN_LATLON
        lat2, lon2 = map(float, coordinate.split(","))
        dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
        a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
        distance_km = round(2 * 6371.0 * asin(sqrt(a)), 1)
        return distance_km, round(distance_km / _LAST_MILE_KMH * 60)
    except Exception:
        return None, None


def parse_address(address: str) -> dict[str, Any]:
    """Skor kandidat alamat; kembalikan best + ETA bila skor ≥ ambang."""
    normalized = (address or "").lower()
    cands = []
    for c in _candidates():
        score_city = _ratio(normalized, c["city"])
        score_dist = _ratio(normalized, c["district"]) if c["district"] else 0.0
        bonus = 0.3 if c["district"] and c["district"].lower() in normalized else 0.0
        score = round(max(score_city, score_dist) * 0.7 + bonus, 3)
        cands.append({**c, "score": score})

    cands.sort(key=lambda x: -x["score"])
    best = cands[0] if cands else None
    # Tak ada kandidat yang cukup yakin → jangan klaim best (hindari false-confidence).
    if not best or best["score"] < _MATCH_MIN_SCORE:
        return {
            "query": address,
            "candidates": cands,
            "best": None,
            "distanceKm": None,
            "etaMin": None,
            "matched": False,
            "matchThreshold": _MATCH_MIN_SCORE,
        }
    distance_km, eta_min = _eta_for(best["coordinate"])
    return {
        "query": address,
        "candidates": cands,
        "best": best,
        "distanceKm": distance_km,
        "etaMin": eta_min,
        "matched": True,
        "matchThreshold": _MATCH_MIN_SCORE,
    }


def demo_address() -> dict:
    """Contoh alamat ambigu (street + lokasi) — lokasi dari sumber kebenaran."""
    rows = load().get("ambiguousAddresses", [])
    locations = [
        {
            "city": r.get("city", ""),
            "district": r.get("district", ""),
            "coordinate": ",".join(p.strip() for p in str(r.get("coordinate", "")).split(",")),
        }
        for r in rows
    ]
    return {
        "street": (rows[0]["street"] if rows else "Jl. Raya Jakarta-Bogor No.12"),
        "locations": locations,
    }
