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
  * Rekomendasi = jalur TERCEPAT (waktu minimum); jalur TEREFISIEN diekspos
    terpisah sebagai `mostEfficientKey` untuk perbandingan.

Semua angka kepadatan/kecepatan/konsumsi = ASUMSI TIM (dilabel), bukan data lalu
lintas live. Jarak antar kota memakai `shared/data-kas.json` (koordinat hub) bila
tersedia, kalau tidak memakai jarak yang dikirim klien.
"""
from __future__ import annotations

import math
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
    # Normalisasi override SEKALI: None/NaN/Inf → None (tanpa override); nilai lain
    # dijepit 0..1. Di-echo dari hasil normalisasi (bukan nilai mentah) → cegah
    # NaN/Inf merusak serialisasi JSON.
    override: float | None = None
    if density_override is not None:
        cand = clamp(density_override, 0.0, 1.0, float("nan"))
        override = None if not math.isfinite(cand) else cand

    candidates: list[dict[str, Any]] = []
    for p in _CANDIDATE_PROFILES:
        # Kepadatan efektif: override menggeser seluruh kandidat, tapi jalur
        # berkapadatan dasar lebih rendah tetap relatif lebih lengang.
        if override is not None:
            # pertahankan gradien antar-kandidat di sekitar override.
            density = clamp((override + p["density"]) / 2, 0.0, 1.0, p["density"])
        else:
            density = p["density"]

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
            "densityOverride": override,
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


# ── Simulasi Pengantaran Riil (Telemetry, Weather, Traffic, EV Fleet) ────
_WEATHER_FACTORS: dict[str, dict[str, Any]] = {
    "cerah": {"speed": 1.00, "delayPct": 0, "label": "Cerah"},
    "hujan": {"speed": 0.80, "delayPct": 25, "label": "Hujan"},
    "badai": {"speed": 0.60, "delayPct": 50, "label": "Hujan lebat / badai"},
}

_TRAFFIC_DENSITIES: dict[str, float] = {
    "lancar": 0.28,
    "sedang": 0.52,
    "macet": 0.84,
}

_EV_KWH_PER_KM = 0.042       # Motor EV last-mile (~24 km/kWh)
_EV_BATTERY_KWH = 2.8        # Kapasitas baterai motor EV (~67 km)
_ICE_ML_PER_KM = 23.8        # Konsumsi bensin motor (~42 km/liter)


def simulate_delivery(
    distance_km: float = 38.4,
    city: str = "Bogor",
    weather: str = "cerah",
    traffic: str = "lancar",
    vehicle: str = "ev_motor",
    pudo_divert: bool = False,
    steps_count: int = 20,
) -> dict[str, Any]:
    """Simulasi pengantaran riil pada rute kurir dengan telemetri & kondisi lapangan.

    Menghasilkan serangkaian titik telemetri (waypoints), fluktuasi kecepatan alami,
    estimasi ETA dinamis, konsumsi baterai/BBM, emisi CO2, serta respons cuaca & macet.
    """
    base_km = clamp(distance_km, 0.5, 1_000.0, 38.4)
    steps = int(clamp(steps_count, 5, 50, 20))
    clean_city = str(city).strip() or "Bogor"

    w_key = str(weather).lower().strip()
    if w_key not in _WEATHER_FACTORS:
        w_key = "cerah"
    w_meta = _WEATHER_FACTORS[w_key]

    t_key = str(traffic).lower().strip()
    if t_key not in _TRAFFIC_DENSITIES:
        t_key = "lancar"
    density = _TRAFFIC_DENSITIES[t_key]

    v_key = "ice_motor" if "ice" in str(vehicle).lower() else "ev_motor"

    # Pengalihan ke PUDO menghemat jarak last-mile (±15% atau min 1.5 km)
    diverted = bool(pudo_divert)
    effective_km = round(max(0.4, base_km * 0.85 if diverted else base_km), 2)
    saved_distance_km = round(base_km - effective_km, 2) if diverted else 0.0

    bpr_factor = _bpr_speed_factor(density)
    weather_factor = float(w_meta["speed"])

    cruising_speed = _BASE_SPEED_KMH * 1.55  # ~34 km/jam
    eff_speed = max(8.0, cruising_speed * bpr_factor * weather_factor)
    total_duration_min = round((effective_km / eff_speed) * 60.0, 1)

    co2_saved_g = round(effective_km * _CO2_G_PER_KM, 1) if v_key == "ev_motor" else 0.0
    energy_kwh = round(effective_km * _EV_KWH_PER_KM, 3) if v_key == "ev_motor" else 0.0
    fuel_l = round((effective_km * _ICE_ML_PER_KM) / 1000.0, 3) if v_key == "ice_motor" else 0.0

    start_battery = 96.0
    total_battery_drop = (effective_km * _EV_KWH_PER_KM / _EV_BATTERY_KWH) * 100.0

    waypoints: list[dict[str, Any]] = []
    for i in range(steps):
        frac = i / (steps - 1) if steps > 1 else 1.0
        dist_covered = round(effective_km * frac, 2)
        dist_remaining = round(max(0.0, effective_km - dist_covered), 2)
        elapsed_min = round(total_duration_min * frac, 1)
        eta_left_min = round(max(0.0, total_duration_min - elapsed_min), 1)

        # Fluktuasi kecepatan realistis per segmen jalan
        if frac < 0.12:
            speed_mult = 0.75  # keluar area hub
            phase = f"Keberangkatan dari Hub Jakarta ({clean_city})"
        elif frac < 0.35:
            speed_mult = 1.05  # arteri
            phase = "Jalur Arteri Utama & Penghubung Tol"
        elif frac < 0.70:
            speed_mult = 1.15  # koridor cepat
            phase = "Koridor Cepat Tol / Jalur Bebas Hambatan"
        elif frac < 0.90:
            speed_mult = 0.90  # masuk kota tujuan
            phase = f"Memasuki Wilayah {clean_city}"
        elif frac < 1.0:
            speed_mult = 0.70  # jalan perumahan/kolektor
            phase = "Jalan Kolektor & Area Permukiman"
        else:
            speed_mult = 0.0
            phase = f"Tiba di Gerai Mitra PUDO ({clean_city})" if diverted else f"Tiba di Alamat Penerima ({clean_city})"

        curr_speed = round(max(0.0, eff_speed * speed_mult), 1) if frac < 1.0 else 0.0
        batt_pct = round(max(5.0, start_battery - (total_battery_drop * frac)), 1)

        event: str | None = None
        if i == 0:
            event = "Kurir memulai perjalanan dari Hub Jakarta. Paket dalam pemantauan realtime."
        elif 0.30 <= frac <= 0.40 and w_key != "cerah":
            event = f"Kondisi cuaca {w_meta['label']}: kurir menjaga batas aman kecepatan."
        elif 0.45 <= frac <= 0.55 and t_key == "macet":
            event = "Kepadatan lalu lintas meningkat; rute otomatis diarahkan ke jalur paling efisien."
        elif diverted and 0.55 <= frac <= 0.65:
            event = "Penerima tidak di tempat: rute dialihkan otomatis ke gerai PUDO terdekat."
        elif i == steps - 1:
            event = "Kurir telah tiba di titik tujuan! Siap serah terima paket." if not diverted else "Kurir tiba di gerai PUDO. Paket siap dititipkan."

        waypoints.append({
            "step": i,
            "progress": round(frac, 3),
            "distanceCoveredKm": dist_covered,
            "distanceRemainingKm": dist_remaining,
            "speedKmh": curr_speed,
            "elapsedMin": elapsed_min,
            "etaRemainingMin": eta_left_min,
            "batteryPct": batt_pct if v_key == "ev_motor" else None,
            "phase": phase,
            "event": event,
        })

    return {
        "engine": "Courier Real Delivery Simulator (telemetry + weather + traffic + EV fleet)",
        "note": (
            "Simulasi telemetri kurir realistis berdasarkan kurva BPR, model cuaca, "
            "dan profil konsumsi energi kendaraan listrik (EV) / BBM last-mile."
        ),
        "inputs": {
            "city": clean_city,
            "distanceKm": base_km,
            "effectiveKm": effective_km,
            "savedDistanceKm": saved_distance_km,
            "weather": w_key,
            "traffic": t_key,
            "vehicle": v_key,
            "pudoDiverted": diverted,
            "stepsCount": steps,
        },
        "summary": {
            "totalDistanceKm": effective_km,
            "totalDurationMin": total_duration_min,
            "effectiveSpeedKmh": round(eff_speed, 1),
            "energyKwhUsed": energy_kwh,
            "fuelLitersUsed": fuel_l,
            "co2SavedG": co2_saved_g,
            "weatherLabel": w_meta["label"],
            "trafficDensity": density,
            "pudoDiverted": diverted,
        },
        "waypoints": waypoints,
    }

