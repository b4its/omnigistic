"""COD Cash-Reconciliation Risk Engine — Pertanyaan 3 (sistem COD).

Basis kasus (Figure 2 & narasi COD):
  * COD: 8 paket / ±5,3 km / ±138 menit vs non-COD 75 menit.
  * "A regional hub manages the cash management system, but the process is complex,
     time-consuming, and prone to human error."
  * Kurir mengumpulkan tunai → dicatat → direkonsiliasi → settlement ke merchant.

Engine memodelkan risiko rekonsiliasi kas COD sebagai fungsi dari:
  1. Volume COD harian (dari Table 4 e-commerce share & porsi COD asumsi).
  2. Nilai kas beredar (float) = paket COD × nilai rata-rata paket.
  3. Risiko human-error per transaksi (asumsi tim) → ekspektasi selisih kas.
  4. Dampak intervensi digital (rekonsiliasi otomatis, e-wallet, escrow) →
     memangkas error & waktu settlement.

Semua koefisien non-kasus = ASUMSI TIM, dilabel eksplisit.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load

# Porsi paket COD dari total (asumsi tim; kasus: COD "large portion").
_COD_SHARE = 0.45
# Waktu rekonsiliasi manual per transaksi kas (asumsi tim, menit).
_MANUAL_RECON_MIN_PER_PKG = 1.5
# Probabilitas human-error per transaksi manual (asumsi tim).
_MANUAL_ERROR_RATE = 0.012
# Biaya penanganan per selisih kas (investigasi + koreksi), IDR (asumsi tim).
_DISCREPANCY_COST_IDR = 25_000
# Nilai rata-rata paket COD (IDR) — proxy dari net sales/paket (Table 3&4).
# Dihitung dinamis; konstanta ini hanya fallback.
_FALLBACK_AOV_IDR = 286_000

# Intervensi digital & dampaknya (asumsi tim): (pemangkasan error, pemangkasan waktu).
INTERVENTIONS = {
    "auto_reconciliation": {"label": "Rekonsiliasi otomatis (scan + ledger)", "err_cut": 0.70, "time_cut": 0.60},
    "ewallet_settlement": {"label": "Settlement e-wallet (kurangi uang fisik)", "err_cut": 0.55, "time_cut": 0.35},
    "escrow_prepay": {"label": "Escrow / pre-pay untuk paket berisiko", "err_cut": 0.80, "time_cut": 0.25},
    "courier_cash_limit": {"label": "Batas kas per kurir + setor berkala", "err_cut": 0.40, "time_cut": 0.15},
}


def _avg_order_value() -> float:
    """Nilai rata-rata per paket dari net sales Tabel 3 ÷ volume Tabel 4."""
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    sales = float(f2023.get("netSalesT", 0)) * 1e12
    parcels = sum(float(d["totalM"]) for d in data["monthlyDemand"]) * 1e6
    return (sales / parcels) if parcels else _FALLBACK_AOV_IDR


def _daily_cod_parcels() -> float:
    """Perkiraan paket COD nasional per hari (juta) dari Table 4."""
    data = load()
    total_m = sum(float(d["totalM"]) for d in data["monthlyDemand"])
    daily = total_m / 365.0  # juta paket/hari
    return daily * _COD_SHARE


def cod_cash_risk(
    cod_share_pct: float = _COD_SHARE * 100,
    interventions: list[str] | None = None,
) -> dict[str, Any]:
    """Analisis risiko rekonsiliasi kas COD + dampak intervensi digital.

    Args:
        cod_share_pct: porsi paket COD dari total (dijepit 0..100).
        interventions: daftar kunci intervensi digital yang diaktifkan.
    """
    cod_share_pct = min(100.0, max(0.0, float(cod_share_pct)))
    interventions = [k for k in (interventions or []) if k in INTERVENTIONS]

    data = load()
    total_daily_m = sum(float(d["totalM"]) for d in data["monthlyDemand"]) / 365.0  # juta/hari
    aov = _avg_order_value()

    cod_daily_m = total_daily_m * (cod_share_pct / 100)
    cod_daily = cod_daily_m * 1e6                     # paket/hari (unit)
    cash_float = cod_daily * aov                       # IDR/hari beredar sebagai kas

    # Error terkuat (pakai max cut per dimensi, konservatif — konsisten cod_intel).
    err_cut = max((INTERVENTIONS[k]["err_cut"] for k in interventions), default=0.0)
    time_cut = max((INTERVENTIONS[k]["time_cut"] for k in interventions), default=0.0)

    err_before = cod_daily * _MANUAL_ERROR_RATE
    err_after = err_before * (1 - err_cut)
    disc_before = round(err_before * _DISCREPANCY_COST_IDR)          # IDR/hari
    disc_after = round(err_after * _DISCREPANCY_COST_IDR)

    minutes_before = cod_daily * _MANUAL_RECON_MIN_PER_PKG
    minutes_after = minutes_before * (1 - time_cut)
    hours_saved = (minutes_before - minutes_after) / 60.0

    return {
        "engine": "COD Cash-Reconciliation Risk (Table 4 volume × asumsi error kas)",
        "note": (
            "Volume COD dari Table 4 (e-commerce share) × porsi COD asumsi. "
            "Laju human-error, waktu rekonsiliasi, biaya selisih, AOV, dan dampak "
            "intervensi = ASUMSI TIM (dilabel) — dokumen hanya menyatakan proses "
            "'complex, time-consuming, prone to human error'."
        ),
        "input": {
            "codSharePct": cod_share_pct,
            "interventions": interventions,
            "errorCutPct": round(err_cut * 100, 1),
            "timeCutPct": round(time_cut * 100, 1),
        },
        "basis": {
            "totalDailyM": round(total_daily_m, 4),
            "codDailyM": round(cod_daily_m, 4),
            "avgOrderValueIdr": round(aov),
            "manualErrorRatePct": round(_MANUAL_ERROR_RATE * 100, 2),
            "manualReconMinPerPkg": _MANUAL_RECON_MIN_PER_PKG,
        },
        "cashFloatIdr": round(cash_float),
        "risk": {
            "discrepanciesPerDayBefore": round(err_before, 1),
            "discrepanciesPerDayAfter": round(err_after, 1),
            "discrepancyCostIdrBefore": disc_before,
            "discrepancyCostIdrAfter": disc_after,
            "discrepancyCostSavedIdr": disc_before - disc_after,
            "reconMinutesBefore": round(minutes_before),
            "reconMinutesAfter": round(minutes_after),
            "reconHoursSavedPerDay": round(hours_saved, 1),
            "riskReductionPct": round((1 - err_after / err_before) * 100, 1) if err_before else 0.0,
        },
        "interventionCatalog": [
            {"key": k, "label": v["label"], "errCutPct": round(v["err_cut"] * 100), "timeCutPct": round(v["time_cut"] * 100)}
            for k, v in INTERVENTIONS.items()
        ],
    }


def default_scenarios() -> dict[str, Any]:
    """Skenario preset untuk auto-demo (non-interaktif)."""
    return {
        "Baseline saat ini (manual)": cod_cash_risk(_COD_SHARE * 100, []),
        "Rekonsiliasi otomatis": cod_cash_risk(_COD_SHARE * 100, ["auto_reconciliation"]),
        "Otomatis + settlement e-wallet": cod_cash_risk(_COD_SHARE * 100, ["auto_reconciliation", "ewallet_settlement"]),
        "Paket lengkap digital": cod_cash_risk(_COD_SHARE * 100, list(INTERVENTIONS.keys())),
    }
