"""Unified Cost-Waterfall & P&L Impact Engine — Pertanyaan 6.

Menyatukan SEMUA tuas pengurangan biaya (dari modal-shift, load-balance, COD,
address, EV) menjadi SATU neraca dampak P&L dari Table 3 (angka kasus), plus
waterfall biaya sekarang → teroptimasi dan dampak margin/EBIT.

Basis kasus:
  * Table 3 (2023): Fulfilment 50,08T + Shipping 49,46T = 99,54T biaya;
    Net Sales 317,63T → cost-to-sales 31,3%.
  * Semua persentase tuas = ASUMSI TIM (dilabel); hanya basis biaya yang kasus.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load


def _basis() -> dict[str, float]:
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    fulfilment = float(f2023["fulfilmentT"])
    shipping = float(f2023["shippingT"])
    sales = float(f2023["netSalesT"])
    cost = fulfilment + shipping
    return {
        "year": f2023.get("year", 2023),
        "fulfilmentT": fulfilment,
        "shippingT": shipping,
        "costT": cost,
        "netSalesT": sales,
        "costToSalesPct": (cost / sales * 100) if sales else 0.0,
    }


# Tuas pengurangan biaya KANONIK (satu sumber kebenaran) — dipakai cost_waterfall
# (P&L) DAN modalshift.cost_levers agar kedua UI tak saling bertentangan.
# Porsi = ASUMSI TIM sebagai fraksi biaya kasus (Table 3). `dim` = basis mana yang
# dipangkas: "shipping" | "fulfilment" | "cost". `mechanism`/`evidence` = narasi.
LEVERS: list[dict[str, Any]] = [
    {
        "lever": "Modal shift laut-udara (rute jauh)",
        "dim": "shipping",
        "frac": 0.045,
        "co2Pct": 18.4,
        "mechanism": "Rute non-ekspres dialihkan ke laut/kapal (murah + emisi rendah).",
        "evidence": "Modal-Shift Optimizer: hemat biaya & emisi pada 11 koridor.",
    },
    {
        "lever": "Hilangkan idle time COD",
        "dim": "shipping",
        "frac": 0.022,
        "co2Pct": 3.0,
        "mechanism": "Pre-payment/PUDO/slot → kurir tidak menunggu; kapasitas naik tanpa armada baru.",
        "evidence": "COD Intelligence: ketidakefisienan COD (138 vs 75 mnt) dipangkas.",
    },
    {
        "lever": "Address Intelligence (tekan komplain & retur)",
        "dim": "fulfilment",
        "frac": 0.020,
        "co2Pct": 2.0,
        "mechanism": "Geotag + fuzzy matching → alamat presisi, retur gagal-antar turun.",
        "evidence": "Komplain 5,5/juta → target <3/juta; tiap retur = 1 perjalanan terbuang.",
    },
    {
        "lever": "Load balancing antar-hub",
        "dim": "cost",
        "frac": 0.012,
        "co2Pct": 2.5,
        "mechanism": "Alihkan overflow hub padat ke hub ber-headroom; hindari lembur & sortasi darurat.",
        "evidence": "Network Optimizer: pindahkan overflow tanpa menciptakan overload baru.",
    },
    {
        "lever": "Elektrifikasi armada last-mile (EV)",
        "dim": "shipping",
        "frac": 0.030,
        "co2Pct": 12.0,
        "mechanism": "200 EV menggantikan motor BBM pada rute urban → BBM & O&M turun.",
        "evidence": "EV = 1,41% armada (pilot); emisi per paket target −20% per 2027.",
    },
    {
        "lever": "Kemasan reusable & degradable",
        "dim": "fulfilment",
        "frac": 0.015,
        "co2Pct": 4.0,
        "mechanism": "Ganti sekali-pakai → kurangi biaya material & limbah; reusable transit bag.",
        "evidence": "Kemasan sekali-pakai salah satu driver biaya fulfilment & emisi material.",
    },
    {
        "lever": "Konsolidasi line-haul & rute",
        "dim": "shipping",
        "frac": 0.018,
        "co2Pct": 2.0,
        "mechanism": "Konsolidasi muatan line-haul & rute kurir → utilisasi truk naik, trip kosong turun.",
        "evidence": "Load factor line-haul & cluster rute (Optimizer rute).",
    },
]


def cost_waterfall(include_sustainability: bool = True) -> dict[str, Any]:
    """Waterfall biaya sekarang → teroptimasi + dampak P&L.

    Args:
        include_sustainability: ikutkan tuas sustainability (EV, kemasan).
    """
    basis = _basis()
    base_cost = basis["costT"]
    base_sales = basis["netSalesT"]

    steps: list[dict[str, Any]] = []
    running = base_cost
    for lever in LEVERS:
        name, dim, frac = lever["lever"], lever["dim"], lever["frac"]
        if not include_sustainability and dim == "fulfilment" and "Kemasan" in name:
            continue
        if not include_sustainability and "EV" in name:
            continue
        base = basis["shippingT"] if dim == "shipping" else basis["fulfilmentT"] if dim == "fulfilment" else base_cost
        saving = base * frac
        running -= saving
        steps.append({
            "lever": name,
            "dimension": dim,
            "savingPct": round(frac * 100, 1),
            "savingT": round(saving, 3),
            "costAfterT": round(running, 3),
        })

    optimized_cost = running
    total_saving = base_cost - optimized_cost
    cost_to_sales_after = (optimized_cost / base_sales * 100) if base_sales else 0.0

    # EBIT proxy (net sales − biaya) — bukan EBIT resmi (tanpa biaya lain).
    ebit_before = base_sales - base_cost
    ebit_after = base_sales - optimized_cost

    return {
        "engine": "Unified Cost-Waterfall & P&L Impact (basis Table 3)",
        "note": (
            "Basis biaya (fulfilment/shipping/net sales) dari Table 3 kasus. Porsi "
            "penghematan per tuas = ASUMSI TIM (dilabel); 'EBIT proxy' = net sales − "
            "biaya logistik (bukan EBIT resmi, biaya lain tak dimodelkan)."
        ),
        "inputs": {"includeSustainability": include_sustainability},
        "basis": {
            "year": basis["year"],
            "fulfilmentT": basis["fulfilmentT"],
            "shippingT": basis["shippingT"],
            "costT": round(base_cost, 2),
            "netSalesT": round(base_sales, 2),
            "costToSalesPct": round(basis["costToSalesPct"], 1),
        },
        "waterfall": steps,
        "summary": {
            "baseCostT": round(base_cost, 2),
            "optimizedCostT": round(optimized_cost, 2),
            "totalSavingT": round(total_saving, 2),
            "totalSavingPct": round(total_saving / base_cost * 100, 1) if base_cost else 0.0,
            "costToSalesBeforePct": round(basis["costToSalesPct"], 1),
            "costToSalesAfterPct": round(cost_to_sales_after, 1),
            "ebitProxyBeforeT": round(ebit_before, 2),
            "ebitProxyAfterT": round(ebit_after, 2),
            "ebitProxyUpliftPct": round((ebit_after / ebit_before - 1) * 100, 1) if ebit_before else 0.0,
        },
    }
