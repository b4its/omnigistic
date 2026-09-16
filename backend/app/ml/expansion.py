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

# Capex ekspansi per hub (asumsi tim, IDR) — perluasan kapasitas/menambah outlet.
_CAPEX_PER_HUB_IDR = 50_000_000_000       # Rp50 M/hub (asumsi tim, pilot: hub+armada)
# Porsi biaya tetap vs variabel dari total biaya Table 3 (asumsi tim).
_VARIABLE_COST_FRAC = 0.70
# Target utilisasi aman pasca-ekspansi (headroom terserap sampai ini, asumsi tim).
_TARGET_UTIL = 0.75


def _unit_economics() -> dict[str, float]:
    """Revenue & biaya per paket dari Table 3 & 4 (angka kasus).

    Catatan: margin di sini = net sales − (fulfilment + shipping), yaitu margin
    SEBELUM COGS/barang — dipakai sebagai proxy. Untuk ROI inkremental ekspansi,
    volume tambahan memakai MARGIN KONTRIBUSI = margin × porsi (1−biaya variabel
    yang sudah tercakup), agar tak melebih-lebihkan (asumsi tim, dilabel).
    """
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    parcels = sum(float(d["totalM"]) for d in data["monthlyDemand"]) * 1e6  # paket/tahun
    sales_per = (float(f2023["netSalesT"]) * 1e12 / parcels) if parcels else 0.0
    cost_per = ((float(f2023["fulfilmentT"]) + float(f2023["shippingT"])) * 1e12 / parcels) if parcels else 0.0
    gross_margin = sales_per - cost_per
    # Kontribusi: sebagian margin tertutup biaya variabel inkremental.
    contrib_margin = gross_margin * (1 - _VARIABLE_COST_FRAC)
    return {
        "revenuePerParcelIdr": sales_per,
        "costPerParcelIdr": cost_per,
        "grossMarginPerParcelIdr": gross_margin,
        "marginPerParcelIdr": contrib_margin,
    }


def expansion_roi(capex_per_hub_idr: float | None = None, target_util: float | None = None) -> dict[str, Any]:
    """Skor kelayakan ekspansi per hub + ROI inkremental.

    Args:
        capex_per_hub_idr: capex ekspansi per hub (IDR; default asumsi tim).
        target_util: target utilisasi pasca-ekspansi (0..1).
    """
    capex = max(0.0, float(capex_per_hub_idr if capex_per_hub_idr is not None else _CAPEX_PER_HUB_IDR))
    tgt = min(1.0, max(0.0, float(target_util if target_util is not None else _TARGET_UTIL)))

    data = load()
    econ = _unit_economics()
    margin = econ["marginPerParcelIdr"]

    rows: list[dict[str, Any]] = []
    for h in data["hubs"]:
        cap = h["capacityM"]                     # juta paket/hari
        util = h["utilizationPct"] / 100.0
        load_m = cap * util
        headroom_m = max(0.0, cap * tgt - load_m)   # ruang tumbuh s/d target util
        # Volume inkremental tahunan yang bisa ditampung headroom (juta paket/tahun).
        add_annual_m = headroom_m * 365.0
        add_margin_idr = add_annual_m * 1e6 * margin
        # ROI = laba inkremental tahunan ÷ capex (kali); payback = capex ÷ laba.
        roi = (add_margin_idr / capex) if capex else 0.0
        payback_yr = (capex / add_margin_idr) if add_margin_idr > 0 else 0.0
        # Skor tarikan pasar = outlets (densitas) × utilisasi (permintaan terpakai).
        demand_score = round(h["outlets"] * util, 1)

        if util >= 0.90:
            priority, note = "Perluas kapasitas", "Hampir jenuh — risiko overload"
        elif headroom_m > 0 and util >= 0.55:
            priority, note = "Ekspansi prioritas", "Headroom + permintaan sehat"
        elif util < 0.45:
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
    total_add_margin = round(sum(r["addMarginIdrPerYear"] for r in top))
    total_capex = round(capex * len(top))

    return {
        "engine": "Market-Expansion ROI (Table 1 headroom × unit-economics Table 3)",
        "note": (
            "Unit economics (margin/paket) dari Table 3 & 4. Capex/hub, porsi biaya, "
            "dan target utilisasi = ASUMSI TIM (dilabel). Headroom dihitung s/d target "
            "utilisasi aman, bukan 100%."
        ),
        "inputs": {"capexPerHubIdr": round(capex), "targetUtil": tgt},
        "unitEconomics": {
            "revenuePerParcelIdr": round(econ["revenuePerParcelIdr"]),
            "costPerParcelIdr": round(econ["costPerParcelIdr"]),
            "grossMarginPerParcelIdr": round(econ["grossMarginPerParcelIdr"]),
            "contributionMarginPerParcelIdr": round(margin),
        },
        "summary": {
            "priorityHubs": len(top),
            "totalAddAnnualM": total_add_m,
            "totalAddMarginIdrPerYear": total_add_margin,
            "totalCapexIdr": total_capex,
            "portfolioRoiX": round(total_add_margin / total_capex, 2) if total_capex else 0.0,
            "paybackYears": round(total_capex / total_add_margin, 2) if total_add_margin else 0.0,
        },
        "hubs": rows,
    }
