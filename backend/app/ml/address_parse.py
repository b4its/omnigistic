"""Address Intelligence — tokenizer + rapidfuzz fuzzy matching ke data kasus (Figure 1).
   Resolver: alamat ambigu → kandidat koordinat terskor; feed Leaflet map + ETA.
"""
from __future__ import annotations
from typing import Any

try:
    from rapidfuzz import fuzz
    HAVE_RAPIDFUZZ = True
except Exception:
    HAVE_RAPIDFUZZ = False



# Origin pengantaran = hub Jakarta (kasus: 3 alamat ambigu berada di Jabodetabek).
_ORIGIN_LATLON = (-6.2088, 106.8456)
_LAST_MILE_KMH = 22.0  # asumsi kecepatan last-mile (dilabel)

_CITY_TABLE = [
    {"city": "Kabupaten Bogor", "district": "Cibinong", "coordinate": "-6.4817, 106.8526"},
    {"city": "Kota Depok", "district": "Sukamaju", "coordinate": "-6.4035, 106.8174"},
    {"city": "Kota Tangerang Selatan", "district": "Rempoa", "coordinate": "-6.2934, 106.7551"},
]


def _ratio(a: str, b: str) -> float:
    la, lb = a.lower(), b.lower()
    if HAVE_RAPIDFUZZ:
        return float(fuzz.partial_ratio(la, lb)) / 100
    # fallback: overlap token
    sa, sb = set(la.split()), set(lb.split())
    return len(sa & sb) / max(1, len(sa))


def parse_address(address: str) -> dict[str, Any]:
    """Return list of scored candidate locations + best + ETA mid."""
    normalized = (address or "").lower()
    cands = []
    for c in _CITY_TABLE:
        score_city = _ratio(normalized, c["city"])
        score_dist = _ratio(normalized, c["district"])
        score = round(max(score_city, score_dist) * 0.7 + (0.3 if c["district"].lower() in normalized else 0), 3)
        cands.append({"city": c["city"], "district": c["district"], "coordinate": c["coordinate"], "score": score})

    cands.sort(key=lambda x: -x["score"])
    best = cands[0] if cands else None
    # Jika tak ada kandidat yang cocok (skor 0), jangan klaim "best" — hindari
    # false-confidence; FE menampilkan pesan "belum ada kecocokan".
    if best and best["score"] <= 0:
        return {
            "query": address,
            "candidates": cands,
            "best": None,
            "distanceKm": None,
            "etaMin": None,
            "matched": False,
        }
    eta_min = None
    distance_km = None
    if best and best["score"] > 0:
        try:
            lat1, lon1 = _ORIGIN_LATLON
            lat2, lon2 = map(float, best["coordinate"].split(","))
            from math import radians, sin, cos, asin, sqrt
            R = 6371.0
            dlat, dlon = radians(lat2 - lat1), radians(lon2 - lon1)
            a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
            distance_km = round(2 * R * asin(sqrt(a)), 1)
            eta_min = round(distance_km / _LAST_MILE_KMH * 60)
        except Exception:
            eta_min = None
    return {
        "query": address,
        "candidates": cands,
        "best": best,
        "distanceKm": distance_km,
        "etaMin": eta_min,
        "matched": True,
    }


def demo_address() -> dict:
    return {
        "street": "Jl. Raya Jakarta-Bogor No.12",
        "locations": [
            {"city": "Kabupaten Bogor", "district": "Cibinong", "coordinate": "-6.4817, 106.8526"},
            {"city": "Kota Depok", "district": "Sukamaju", "coordinate": "-6.4035, 106.8174"},
            {"city": "Kota Tangerang Selatan", "district": "Rempoa", "coordinate": "-6.2934, 106.7551"},
        ],
    }
