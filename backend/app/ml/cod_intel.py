"""COD Decision Intelligence — dampak keputusan COD pada produktivitas kurir per shift.

Berbasiskan angka Figure 2 (kasus):
  * Non-COD: 8 paket / 5,3 km / ~75 menit  → 6,4 paket/jam
  * COD    : 8 paket / 5,3 km / ~138 menit → 3,48 paket/jam  (+84% waktu)

Model: setiap paket COD menambah waktu tunggu (waiting) karena verifikasi +
pembayaran + inspeksi. Intervensi digital (pre-payment link, PUDO, slot) memangkas
waiting sebagian, dengan porsi berbeda per intervensi. Engine menghitung per-shift
kapasitas kurir, biaya lembur yang dihindari, slot tambahan, dan biaya CO2 proxy
dari idle time.

Semua parameter intervensi = asumsi tim (dinyatakan), bukan angka dokumen.
"""
from __future__ import annotations

from typing import Any

from app.ml.metrics import clamp

# Angka kasus (Figure 2) — jangan diubah tanpa sumber kasus.
NON_COD = {"packages": 8, "distanceKm": 5.3, "durationMin": 75}
COD = {"packages": 8, "distanceKm": 5.3, "durationMin": 138}

# Asumsi biaya operasional kurir (prototipe; IDR).
COURIER_HOURLY_IDR = 30_000       # upah efektif per jam (asumsi)
IDLE_CO2_G_PER_MIN = 12.0         # gram CO2 idle motor per menit (asumsi)

# Porsi pemangkasan waiting per intervensi (0..1) — asumsi tim.
INTERVENTIONS = {
    "prepayment_link": {"label": "Link pre-payment (bayar sebelum kurir datang)", "cut": 0.55},
    "pudo_pickup": {"label": "PUDO / ambil di gerai (kurir tak menunggu rumah)", "cut": 0.75},
    "slot_confirmation": {"label": "Konfirmasi slot jam (penerima siap)", "cut": 0.35},
    "cod_cluster": {"label": "Clustering rute paket COD sejenis (zero idle antar rumah)", "cut": 0.20},
}


def analyze_cod_impact(
    cod_share_pct: float = 60.0,
    interventions: list[str] | None = None,
    packages_per_shift: int = 40,
) -> dict[str, Any]:
    """Analisis dampak COD pada satu shift kurir (default 40 paket/shift).

    Args:
        cod_share_pct: porsi paket COD dari total shift (dijepit 0..100).
        interventions: daftar kunci intervensi digital yang diaktifkan (tak dikenal diabaikan).
        packages_per_shift: total paket dalam satu shift (dijepit ≥ 0).
    """
    # Jepit input ke rentang sah agar tak ada paket negatif / porsi tak wajar.
    cod_share_pct = clamp(cod_share_pct, 0.0, 100.0, 60.0)
    packages_per_shift = int(clamp(packages_per_shift, 0, 1_000_000, 40))
    interventions = [k for k in (interventions or []) if k in INTERVENTIONS]
    # Komponen waktu tunggu COD murni = durasi COD - durasi non-COD (per 8 paket).
    base_wait = COD["durationMin"] - NON_COD["durationMin"]  # 63 menit / 8 paket
    wait_per_pkg = base_wait / COD["packages"]               # ~7,875 menit/paket COD

    # Pangkas waiting oleh intervensi terkuat (pakai max cut, bukan aditif, agar konservatif).
    cut = max((INTERVENTIONS[k]["cut"] for k in interventions if k in INTERVENTIONS), default=0.0)
    effective_wait_per_pkg = wait_per_pkg * (1 - cut)

    cod_pkgs = round(packages_per_shift * cod_share_pct / 100, 1)
    non_cod_pkgs = round(packages_per_shift - cod_pkgs, 1)

    # Durasi shift = waktu dasar (paket * tempo non-COD) + waiting COD.
    base_min = packages_per_shift * (NON_COD["durationMin"] / NON_COD["packages"])
    wait_before = cod_pkgs * wait_per_pkg
    wait_after = cod_pkgs * effective_wait_per_pkg

    dur_before = round(base_min + wait_before, 1)
    dur_after = round(base_min + wait_after, 1)
    saved_min = round(dur_before - dur_after, 1)

    # Paket ekstra yang bisa diantar dengan waktu yang dihemat.
    tempo_after = dur_after / packages_per_shift if packages_per_shift else 0.0
    extra_pkgs = round(saved_min / tempo_after, 1) if tempo_after else 0.0

    # Nilai rupiah & CO2 (proxy).
    saved_idr = round(saved_min / 60 * COURIER_HOURLY_IDR)
    saved_co2_g = round(saved_min * IDLE_CO2_G_PER_MIN)

    return {
        "engine": "COD shift-impact model (berbasis Figure 2)",
        "note": "Angka dasar 75 vs 138 menit dari dokumen kasus; biaya kurir, CO2 idle, dan porsi intervensi = asumsi tim (prototipe).",
        "caseFigures": {"nonCod": NON_COD, "cod": COD},
        "input": {
            "codSharePct": cod_share_pct,
            "interventions": interventions,
            "interventionCutPct": round(cut * 100, 1),
            "packagesPerShift": packages_per_shift,
        },
        "split": {"codPackages": cod_pkgs, "nonCodPackages": non_cod_pkgs},
        "baseline": {"shiftDurationMin": dur_before, "waitPerCodPkgMin": round(wait_per_pkg, 2)},
        "optimized": {"shiftDurationMin": dur_after, "waitPerCodPkgMin": round(effective_wait_per_pkg, 2)},
        "impact": {
            "minutesSavedPerShift": saved_min,
            "extraPackagesPerShift": extra_pkgs,
            "extraCapacityPct": round(extra_pkgs / packages_per_shift * 100, 1) if packages_per_shift else 0.0,
            "savedIdrPerShift": saved_idr,
            "savedCo2GramPerShift": saved_co2_g,
            "hoursSavedPer100Couriers": round(saved_min * 100 / 60, 1),
        },
        "interventionCatalog": [
            {"key": k, "label": v["label"], "cutPct": round(v["cut"] * 100)} for k, v in INTERVENTIONS.items()
        ],
    }


def default_scenarios() -> dict[str, Any]:
    """Skenario preset untuk auto-demo (non-interaktif).

    Setiap skenario membawa `label` sendiri: kunci dict tidak ikut diterjemahkan
    oleh lapisan i18n (hanya nilai), sehingga klien memakai `label` untuk
    menampilkan nama skenario.
    """
    scenarios = {
        "Tanpa intervensi (baseline)": analyze_cod_impact(60.0, []),
        "Pre-payment + slot": analyze_cod_impact(60.0, ["prepayment_link", "slot_confirmation"]),
        "Semua intervensi aktif": analyze_cod_impact(
            60.0, ["prepayment_link", "pudo_pickup", "slot_confirmation", "cod_cluster"]
        ),
    }
    for name, payload in scenarios.items():
        payload["label"] = name
    return scenarios
