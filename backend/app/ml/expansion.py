"""Market-Expansion ROI Engine — Pertanyaan 5 (strategi ekspansi pasar).

Basis kasus:
  * GC Logistics market leader 20,6% (2024), 1,46 M paket 2024 (+28% YoY).
  * Table 1: 23 hub (kapasitas, utilisasi, outlets) → proxy densitas & headroom.
  * Table 3: net sales & biaya (untuk margin per paket).
  * E-commerce Indonesia Rp453,75 triliun (2023).

Engine menilai kelayakan ekspansi per hub/kota:
  1. Headroom kapasitas (kapasitas − beban) = ruang tumbuh tanpa capex.
  2. Skor permintaan (outlets × utilisasi) = tarikan pasar lokal.
  3. Unit economics: margin kontribusi per paket dari Table 3 (revenue − biaya).
  4. ROI ekspansi: capex tambahan (asumsi tim) vs laba inkremental dari headroom.
  5. Prioritas: taman bermain bertumbuh tinggi + headroom besar = "Expand now".

Semua koefisien non-kasus = ASUMSI TIM, dilabel.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load
from app.ml.metrics import UTIL_CRITICAL, UTIL_WARN, VARIABLE_COST_FRAC, clamp, unit_economics

# Capex ekspansi per hub (asumsi tim, IDR) — perluasan kapasitas/menambah outlet.
_CAPEX_PER_HUB_IDR = 50_000_000_000       # Rp50 M/hub (asumsi tim, pilot: hub+armada)
# Porsi biaya tetap vs variabel dari total biaya Table 3 → dari SATU sumber
# (metrics.VARIABLE_COST_FRAC) agar tak drift dgn sponsor.py.
# Target utilisasi aman pasca-ekspansi (headroom terserap sampai ini, asumsi tim).
_TARGET_UTIL = 0.75
# Laju tangkap headroom per tahun (asumsi tim): headroom tak terisi instan — dibatasi
# pertumbuhan permintaan (YoY kasus 2023→2024 ≈ +28%, dipakai konservatif 12%/th).
# Untuk ROI tahun-1 hanya porsi ini yang dianggap terealisasi.
_CAPTURE_RATE_PER_YEAR = 0.12


def _unit_economics() -> dict[str, float]:
    """Revenue & biaya per paket dari Table 3 & 4 (angka kasus).

    Catatan: margin bruto = net sales − (fulfilment + shipping), margin SEBELUM
    COGS/barang — dipakai sebagai proxy. Untuk ROI inkremental ekspansi, volume
    tambahan menambah BIAYA VARIABEL namun TIDAK menambah biaya tetap (sudah
    tercakup). Maka MARGIN KONTRIBUSI = revenue − (total_cost × porsi variabel),
    bukan (revenue − total_cost) × porsi (asumsi tim, dilabel).
    """
    ue = unit_economics()
    sales_per = ue["revenuePerParcelIdr"]
    cost_per = ue["costPerParcelIdr"]
    gross_margin = sales_per - cost_per
    variable_cost_per = cost_per * VARIABLE_COST_FRAC
    # Kontribusi: revenue − biaya VARIABEL inkremental (fixed cost tak berubah).
    contrib_margin = sales_per - variable_cost_per
    return {
        "revenuePerParcelIdr": sales_per,
        "costPerParcelIdr": cost_per,
        "variableCostPerParcelIdr": variable_cost_per,
        "grossMarginPerParcelIdr": gross_margin,
        "marginPerParcelIdr": contrib_margin,
    }


def expansion_roi(capex_per_hub_idr: float | None = None, target_util: float | None = None) -> dict[str, Any]:
    """Skor kelayakan ekspansi per hub + ROI inkremental.

    Args:
        capex_per_hub_idr: capex ekspansi per hub (IDR; default asumsi tim).
        target_util: target utilisasi pasca-ekspansi (0..1).
    """
    capex = clamp(capex_per_hub_idr, 1e9, 1e13, _CAPEX_PER_HUB_IDR)
    tgt = clamp(target_util if target_util is not None else _TARGET_UTIL, 0.0, 1.0, _TARGET_UTIL)

    data = load()
    econ = _unit_economics()
    margin = econ["marginPerParcelIdr"]

    rows: list[dict[str, Any]] = []
    for h in data["hubs"]:
        cap = h["capacityM"]                     # juta paket/hari
        util = h["utilizationPct"] / 100.0
        load_m = cap * util
        headroom_m = max(0.0, cap * tgt - load_m)   # ruang tumbuh s/d target util
        # Volume inkremental POTENSIAL tahunan (bila headroom penuh; juta paket/th).
        add_annual_m = headroom_m * 365.0
        # Realisasi tahun-1 dibatasi laju tangkap (pertumbuhan permintaan) → realistis.
        realized_annual_m = add_annual_m * _CAPTURE_RATE_PER_YEAR
        add_margin_idr = realized_annual_m * 1e6 * margin
        # ROI = laba inkremental tahun-1 ÷ capex (kali); payback = capex ÷ laba.
        roi = (add_margin_idr / capex) if capex else 0.0
        payback_yr = (capex / add_margin_idr) if add_margin_idr > 0 else 0.0
        # Skor tarikan pasar = outlets (densitas) × utilisasi (permintaan terpakai).
        demand_score = round(h["outlets"] * util, 1)

        # Klasifikasi prioritas memakai ambang utilisasi KANONIK (metrics), bukan
        # angka ajaib sendiri: near-saturated ≥ CRITICAL, prioritas ≥ WARN, nurture
        # bila jauh di bawah WARN. `util` = fraksi 0..1; ambang kanonik = persen.
        crit_f = UTIL_CRITICAL / 100.0
        warn_f = UTIL_WARN / 100.0
        if util >= crit_f:
            priority, note = "Perluas kapasitas", "Hampir jenuh — risiko overload"
        elif headroom_m > 0 and util >= warn_f:
            priority, note = "Ekspansi prioritas", "Headroom + permintaan sehat"
        elif util < warn_f - 0.10:
            priority, note = "Nurture permintaan", "Kapasitas menganggur"
        else:
            priority, note = "Optimalkan dulu", "Utilisasi sedang"

        rows.append({
            "hub": h["name"],
            "code": h["code"],
            "region": h["region"],
            "capacityM": cap,
            "utilizationPct": h["utilizationPct"],
            "outlets": h["outlets"],
            "headroomM": round(headroom_m, 4),
            "addAnnualM": round(add_annual_m, 2),
            "realizedAnnualM": round(realized_annual_m, 2),
            "addMarginIdrPerYear": round(add_margin_idr),
            "roiX": round(roi, 2),
            "paybackYears": round(payback_yr, 2),
            "demandScore": demand_score,
            "priority": priority,
            "note": note,
        })

    # Urutkan: ekspansi prioritas dengan ROI & skor permintaan tertinggi dulu.
    rows.sort(key=lambda r: (r["priority"] != "Ekspansi prioritas", -r["roiX"], -r["demandScore"]))

    top = [r for r in rows if r["priority"] == "Ekspansi prioritas"]
    total_add_m = round(sum(r["addAnnualM"] for r in top), 2)
    total_realized_m = round(sum(r["realizedAnnualM"] for r in top), 2)
    total_add_margin = round(sum(r["addMarginIdrPerYear"] for r in top))
    total_capex = round(capex * len(top))

    return {
        "engine": "Market-Expansion ROI (Table 1 headroom × unit-economics Table 3)",
        "note": (
            "Unit economics (margin kontribusi/paket) dari Table 3 & 4. Capex/hub, porsi "
            "biaya variabel, target utilisasi, dan laju tangkap tahun-1 = ASUMSI TIM "
            "(dilabel). Headroom dihitung s/d target utilisasi aman (bukan 100%), dan "
            "realisasi tahun-1 dibatasi laju tangkap pertumbuhan permintaan."
        ),
        "inputs": {"capexPerHubIdr": round(capex), "targetUtil": tgt, "captureRatePerYear": _CAPTURE_RATE_PER_YEAR},
        "unitEconomics": {
            "revenuePerParcelIdr": round(econ["revenuePerParcelIdr"]),
            "costPerParcelIdr": round(econ["costPerParcelIdr"]),
            "variableCostPerParcelIdr": round(econ["variableCostPerParcelIdr"]),
            "grossMarginPerParcelIdr": round(econ["grossMarginPerParcelIdr"]),
            "contributionMarginPerParcelIdr": round(margin),
        },
        "summary": {
            "priorityHubs": len(top),
            "totalAddAnnualM": total_add_m,
            "totalRealizedAnnualM": total_realized_m,
            "totalAddMarginIdrPerYear": total_add_margin,
            "totalCapexIdr": total_capex,
            "portfolioRoiX": round(total_add_margin / total_capex, 2) if total_capex else 0.0,
            "paybackYears": round(total_capex / total_add_margin, 2) if total_add_margin else 0.0,
        },
        "hubs": rows,
    }
