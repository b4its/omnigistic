"""Demand forecast — seasonal decomposition + linear trend (robust utk 12 titik) + event flags.
   Prototipe presentasi: proyeksi 2024 diekstrapolasi dari pola 2023 + kalender promo/regulasi.
"""
from __future__ import annotations
from typing import Any

from app.db.loader import load

_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

# Event dari kasus: promo/regulasi yang membentuk demand
_EVENTS = [
    {"label": "Harbolnas", "months": ["Nov"], "boost": 1.04},
    {"label": "TikTok Shop Suspension", "months": ["Oct"], "boost": 0.82},
    {"label": "Pemulihan pasca-shock", "months": ["Nov","Dec"], "boost": 1.05},
]


def _base_series() -> list[float]:
    data = load()
    return [float(d["totalM"]) for d in data["monthlyDemand"]]


def _seasonal_decomp(series: list[float], horizon: int) -> list[float]:
    """Ekstrak indeks musiman per bulan dari 2023, proyeksi 2024 = rata2 tahunan * indeks musiman + tren."""
    mean = sum(series) / len(series)
    seasonal = [s / mean for s in series]                       # indeks baseline per bulan
    trend_factor = 1.012  # ~+1.2%/6bln — ekstrapolasi tren 2023 (78→91)

    out = []
    for i in range(horizon):
        month = (i + 1) % 12
        base2024 = mean * (trend_factor ** (i / 6))
        v = base2024 * seasonal[month]
        out.append(v)
    return out


def _apply_events(vals: list[float]) -> list[dict]:
    proj = []
    for i, v in enumerate(vals):
        m = _MONTHS[(i + 1) % 12]
        # label tahun: 2024 untuk semua horizon (kasus)
        y = 2024
        flags: list[str] = []
        for e in _EVENTS:
            if m in e["months"]:
                flags.append(e["label"])
                v *= e["boost"]
        proj.append({"month": m, "label": f"{m} {y}", "totalM": round(v, 1), "events": flags})
    return proj


def forecast_next_12(horizon: int = 12) -> dict[str, Any]:
    series = _base_series()
    vals = _seasonal_decomp(series, horizon)
    proj = _apply_events(vals)
    peak = max(proj, key=lambda x: x["totalM"])
    trough = min(proj, key=lambda x: x["totalM"])
    return {
        "model": "seasonal-index + trend + event-flags",
        "note": "Prototipe presentasi — 12 titik 2023 + kalender promo/regulasi; proyeksi indikatif 2024.",
        "dataPoints": len(series),
        "projection": proj,
        "peak": {"month": peak["month"], "label": peak["label"], "totalM": peak["totalM"]},
        "trough": {"month": trough["month"], "label": trough["label"], "totalM": trough["totalM"]},
        "fluctuationPct": round((max(vals) - min(vals)) / min(vals) * 100, 1),
    }


def demand_actual_tiktok() -> dict:
    data = load()
    rows = data["monthlyDemand"]
    out = []
    for d in rows:
        flags = []
        if d["month"] in ("Sep", "Oct", "Nov", "Dec"):
            flags.append("Pasca-TikTok-Suspension")
        out.append({**d, "events": flags})
    return {"year": 2023, "rows": out}
