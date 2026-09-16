"""Demand forecast — seasonal decomposition + linear trend (robust utk 12 titik) + event flags.
   Prototipe presentasi: proyeksi 2024 diekstrapolasi dari pola 2023 + kalender promo/regulasi.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load
from app.ml.metrics import clamp

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


def _moving_average(series: list[float], window: int = 12) -> float:
    """Rata-rata bergerak sederhana untuk memisahkan level/trend dari musiman."""
    n = len(series)
    w = min(window, n)
    tail = series[-w:]
    return sum(tail) / len(tail)


def _seasonal_decomp(series: list[float], horizon: int) -> list[float]:
    """Dekomposisi musiman klasik (rata-rata per bulan) + tren linear.

    Perbaikan dari versi sebelumnya:
      * Indeks musiman = rata-rata tiap bulan / rata-rata keseluruhan (sentris),
        bukan nilai mentah/mean.
      * Proyeksi mulai dari JANUARI tahun berikutnya (indeks bulan ke-(i%12)),
        bukan (i+1)%12 yang membuat horizon meleset satu bulan.
      * Tren linear dari regresi pada 12 titik, bukan konstanta ajaib.
    """
    n = len(series)
    overall = sum(series) / n if n else 0.0
    # Indeks musiman per bulan (1 = rata-rata). Dengan 12 titik: bulan m → series[m].
    seasonal = [(v / overall) if overall else 1.0 for v in series]

    # Tren linear (least squares) atas indeks waktu 0..n-1.
    xs = list(range(n))
    mean_x = sum(xs) / n if n else 0.0
    denom = sum((x - mean_x) ** 2 for x in xs) or 1.0
    slope = sum((x - mean_x) * (series[i] - overall) for i, x in enumerate(xs)) / denom
    intercept = overall - slope * mean_x

    out = []
    for i in range(horizon):
        step = n + i                      # titik waktu masa depan (lanjutan)
        trend_level = intercept + slope * step
        month_idx = i % 12                 # mulai Januari tahun proyeksi
        v = max(0.0, trend_level * seasonal[month_idx])
        out.append(v)
    return out


def _selftest(forecast: dict) -> dict:
    """Backtest sederhana: rekonstruksi 12 titik 2023 dari model, hitung MAPE.

    Metode 'in-sample': model diuji apakah mampu mereproduksi pola historis
    (bukan hold-out, karena hanya ada 12 titik). Jujur dilabeli prototipe.
    """
    series = _base_series()
    n = len(series)
    overall = sum(series) / n if n else 0.0
    seasonal = [(v / overall) if overall else 1.0 for v in series]
    xs = list(range(n))
    mean_x = sum(xs) / n
    denom = sum((x - mean_x) ** 2 for x in xs) or 1.0
    slope = sum((x - mean_x) * (series[i] - overall) for i, x in enumerate(xs)) / denom
    intercept = overall - slope * mean_x
    errs = []
    for i, actual in enumerate(series):
        pred = max(0.0, (intercept + slope * i) * seasonal[i])
        errs.append(abs(pred - actual) / actual if actual else 0.0)
    mape = sum(errs) / len(errs) * 100 if errs else 0.0
    return {"mapePct": round(mape, 1), "method": "in-sample seasonal+trend"}


def _apply_events(vals: list[float], event_scale: dict[str, float] | None = None, base_year: int = 2024) -> list[dict]:
    """Terapkan event flags. ``event_scale`` (opsional) men-SKALA boost per label
    (simulasi: 1.0 = boost kasus apa adanya, 0 = event dimatikan)."""
    event_scale = event_scale or {}
    proj = []
    for i, v in enumerate(vals):
        m = _MONTHS[i % 12]
        y = base_year
        flags: list[str] = []
        for e in _EVENTS:
            if m in e["months"]:
                scale = float(event_scale.get(e["label"], 1.0))
                # Skala pada DELTA boost (boost-1), sehingga scale=0 → tanpa efek.
                v *= 1.0 + (e["boost"] - 1.0) * scale
                # Label tetap tampil walau efek dinolkan, agar jejak audit jelas.
                flags.append(e["label"] if scale != 0 else f"{e['label']} (nonaktif)")
        proj.append({"month": m, "label": f"{m} {y}", "totalM": round(v, 1), "events": flags})
    return proj


def forecast_next_12(
    horizon: int = 12,
    event_scale: dict[str, float] | None = None,
    base_year: int = 2024,
) -> dict[str, Any]:
    horizon = int(clamp(horizon, 1, 24, 12))
    series = _base_series()
    vals = _seasonal_decomp(series, horizon)
    proj = _apply_events(vals, event_scale, base_year)
    peak = max(proj, key=lambda x: x["totalM"])
    trough = min(proj, key=lambda x: x["totalM"])
    totals = [p["totalM"] for p in proj]
    return {
        "model": "seasonal-index (centered) + linear-trend (OLS) + event-flags",
        "note": "Prototipe presentasi — 12 titik 2023 + kalender promo/regulasi; proyeksi indikatif 2024.",
        "dataPoints": len(series),
        "horizon": horizon,
        "eventScale": event_scale or {e["label"]: 1.0 for e in _EVENTS},
        "eventCatalog": [{"label": e["label"], "months": e["months"], "boost": e["boost"]} for e in _EVENTS],
        "projection": proj,
        "peak": {"month": peak["month"], "label": peak["label"], "totalM": peak["totalM"]},
        "trough": {"month": trough["month"], "label": trough["label"], "totalM": trough["totalM"]},
        "fluctuationPct": round((max(totals) - min(totals)) / min(totals) * 100, 1) if min(totals) else 0.0,
        "backtest": _selftest({"projection": proj}),
    }


def demand_actual_tiktok() -> dict:
    data = load()
    rows = data["monthlyDemand"]
    out = []
    for d in rows:
        flags = []
        # TikTok Shop suspension terjadi pada OKTOBER (kasus, Figure); bulan
        # berikutnya diberi label pemulihan yang berbeda agar tak menyesatkan.
        if d["month"] == "Oct":
            flags.append("TikTok-Suspension")
        elif d["month"] in ("Nov", "Dec"):
            flags.append("Pemulihan pasca-shock")
        out.append({**d, "events": flags})
    return {"year": 2023, "rows": out}
