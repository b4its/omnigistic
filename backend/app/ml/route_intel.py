"""Route Intelligence — pendeteksi jalur tercepat berbasis kepadatan & efisiensi.

Kontek satuan tugas (kasus, Pertanyaan 2 & 3):
  * Rute kurir harus efisien; kemacetan/keramaian jalan menambah waktu tempuh.
  * Kasus: motor dominan last-mile (70% kota besar), COD menambah waktu tunggu.

Model:
  * Untuk tiap pasangan (asal, tujuan) dibangkitkan beberapa KANDIDAT jalur
    (arteri utama, jalan tol, jalur alternatif) dengan profil berbeda:
    jarak, batas kecepatan, dan TINGKAT KEPADATAN (0..1, makin tinggi makin macet).
  * Waktu tempuh efektif = jarak / (kecepatan × faktor_kepadatan), faktor turun
    saat padat (model BPR sederhana: 1 / (1 + a·(v/c)^b)).
  * EFEKTIVITAS jalur = kombinasi waktu tempuh + konsumsi bahan bakar + emisi +
    keandalan (variabilitas kepadatan), menghasilkan SKOR.
  * Jalur TERCEPAT = waktu tempuh minimum; jalur TEREFISIEN = skor tertinggi.
  * Rekomendasi = jalur dengan waktu tercepat dgn mempertimbangkan efisiensi.

Semua angka kepadatan/kecepatan/konsumsi = ASUMSI TIM (dilabel), bukan data lalu
lintas live. Jarak antar kota memakai `shared/data-kas.json` (koordinat hub) bila
tersedia, kalau tidak memakai jarak yang dikirim klien.
"""
from __future__ import annotations

from typing import Any

from app.ml.metrics import clamp

# ── Profil kandidat jalur (asumsi tim) ───────────────────────────────────
# factor_speed: pengali batas kecepatan kota (1.0 = arteri normal).
# density: tingkat kepadatan dasar 0..1 (makin tinggi makin macet).
# toll: apakah berbayar (tambah biaya, kurangi kepadatan).
# variability: seberapa tak-pasti kepadatan (0..1) → mempengaruhi keandalan.
_CANDIDATE_PROFILES = [
    {"key": "arteri",    "label": "Arteri utama",     "speedFactor": 1.00, "density": 0.72, "toll": 0, "variability": 0.18, "extraKm": 1.00},
    {"key": "tol",       "label": "Jalan tol",        "speedFactor": 1.45, "density": 0.35, "toll": 1, "variability": 0.10, "extraKm": 1.08},
    {"key": "alternatif","label": "Jalur alternatif", "speedFactor": 0.85, "density": 0.42, "toll": 0, "variability": 0.28, "extraKm": 1.14},
]

# Kecepatan dasar last-mile (km/jam) — sinkron logistics.ts (~22 km/jam motor).
_BASE_SPEED_KMH = 22.0
# Parameter BPR (Bureau of Public Roads): delay ∝ a·(v/c)^b.
_BPR_A = 0.90
_BPR_B = 4.0
# Biaya tol per km (asumsi tim, IDR) & konsumsi BBM (km/L motor).
_TOLL_IDR_PER_KM = 900
_FUEL_KM_PER_L = 42.0
_FUEL_IDR_PER_L = 10_000
# Emisi CO2 motor (gram/km) — proxy (asumsi tim).
_CO2_G_PER_KM = 72.0


def _bpr_speed_factor(density: float) -> float:
    """Faktor kecepatan BPR: 1.0 saat lengang, turun saat kepadatan tinggi."""
    d = clamp(density, 0.0, 1.0, 0.5)
    return 1.0 / (1.0 + _BPR_A * (d ** _BPR_B))


def plan_route(
    distance_km: float,
    density_override: float | None = None,
    base_speed_kmh: float = _BASE_SPEED_KMH,
) -> dict[str, Any]:
    """Rencanakan rute tercepat + daftar kandidat jalur dengan skor.

    Args:
        distance_km: jarak dasar (garis lurus/ruas) dalam km.
        density_override: bila diisi (0..1), paksa kepadatan yang sama untuk semua
            kandidat (simulasi "jam sibuk" vs "lengang").
        base_speed_kmh: kecepatan dasar (default last-mile motor).
    """
    base_km = clamp(distance_km, 0.1, 5_000.0, 10.0)
    base_speed = clamp(base_speed_kmh, 5.0, 120.0, _BASE_SPEED_KMH)

    candidates: list[dict[str, Any]] = []
    for p in _CANDIDATE_PROFILES:
        # Kepadatan efektif: override menggeser seluruh kandidat, tapi jalur
        # berkapadatan dasar lebih rendah tetap relatif lebih lengang.
        density = clamp(density_override, 0.0, 1.0, p["density"]) if density_override is not None else p["density"]
        if density_override is not None:
            # pertahankan gradien antar-kandidat di sekitar override.
            density = clamp((density + p["density"]) / 2, 0.0, 1.0, p["density"])

        route_km = base_km * p["extraKm"]
        free_speed = base_speed * p["speedFactor"]
        eff_speed = free_speed * _bpr_speed_factor(density)
        time_min = (route_km / eff_speed) * 60.0

        fuel_cost = (route_km / _FUEL_KM_PER_L) * _FUEL_IDR_PER_L
        toll_cost = route_km * _TOLL_IDR_PER_KM if p["toll"] else 0
        cost_idr = fuel_cost + toll_cost
        co2_g = route_km * _CO2_G_PER_KM
        # Keandalan: kepadatan tinggi + variabilitas tinggi = kurang andal (0..1).
        reliability = clamp(1.0 - density * (0.5 + p["variability"]), 0.0, 1.0, 0.5)

        candidates.append({
            "key": p["key"],
            "label": p["label"],
            "distanceKm": round(route_km, 2),
            "density": round(density, 2),
            "freeSpeedKmh": round(free_speed, 1),
            "effectiveSpeedKmh": round(eff_speed, 1),
            "timeMin": round(time_min, 1),
            "costIdr": round(cost_idr),
            "co2G": round(co2_g, 1),
            "reliability": round(reliability, 2),
            "toll": bool(p["toll"]),
        })

    # Jalur tercepat = waktu minimum. Jalur terefisiensi = biaya-terbobot skor.
    fastest = min(candidates, key=lambda c: c["timeMin"])
    # Skor efisiensi (0..1, makin tinggi makin baik): normalisasi min-max.
    times = [c["timeMin"] for c in candidates]
    costs = [c["costIdr"] for c in candidates]
    co2s = [c["co2G"] for c in candidates]
    tmin, tmax = min(times), max(times)
    cmin, cmax = min(costs), max(costs)
    emin, emax = min(co2s), max(co2s)

    def _norm_low_better(v: float, lo: float, hi: float) -> float:
        return 1.0 if hi == lo else 1.0 - (v - lo) / (hi - lo)

    for c in candidates:
        score = (
            0.55 * _norm_low_better(c["timeMin"], tmin, tmax)
            + 0.20 * _norm_low_better(c["costIdr"], cmin, cmax)
            + 0.15 * _norm_low_better(c["co2G"], emin, emax)
            + 0.10 * c["reliability"]
        )
        c["efficiencyScore"] = round(score, 3)

    most_efficient = max(candidates, key=lambda c: c["efficiencyScore"])
    sorted_candidates = sorted(candidates, key=lambda c: -c["efficiencyScore"])

    baseline_min = (base_km / base_speed) * 60.0
    recommended = fastest

    return {
        "engine": "Route Intelligence (kepadatan BPR + efisiensi biaya/waktu/emisi)",
        "note": (
            "Tingkat kepadatan, kecepatan, biaya tol, konsumsi BBM, dan emisi = "
            "ASUMSI TIM (dilabel) — bukan data lalu lintas live. Model waktu tempuh "
            "memakai kurva BPR (delay ∝ a·(v/c)^b)."
        ),
        "inputs": {
            "distanceKm": round(base_km, 2),
            "baseSpeedKmh": round(base_speed, 1),
            "densityOverride": density_override,
        },
        "recommended": recommended["key"],
        "fastestKey": fastest["key"],
        "mostEfficientKey": most_efficient["key"],
        "summary": {
            "fastestTimeMin": fastest["timeMin"],
            "fastestLabel": fastest["label"],
            "baselineTimeMin": round(baseline_min, 1),
            "timeSavedMin": round(baseline_min - fastest["timeMin"], 1),
            "efficientLabel": most_efficient["label"],
        },
        "candidates": sorted_candidates,
    }
