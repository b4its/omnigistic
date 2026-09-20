"""Unified Cost-Waterfall & P&L Impact Engine — Pertanyaan 6.

Model **jembatan cost-to-sales** kanonik (Pertanyaan 6, analisis tim):

  1. Basis kasus Table 3 (2023): Fulfilment 50,08T + Shipping 49,46T = 99,54T
     biaya; Net Sales 317,63T -> cost-to-sales 31,34%.
  2. Volume tumbuh +21,4% (1.110 -> 1.347,5 juta paket, Table 4) sehingga
     biaya tetap terabsorpsi: struktur lama ikut naik ke 120,84T, sedangkan
     biaya tetap konstan + variabel tumbuh = 113,39T (manfaat absorpsi 7,46T).
  3. Tujuh tuas efisiensi memangkas biaya variabel SETELAH tumbuh.
  4. Sponsor selektif (Tantangan 1) opsional sebagai lapis terakhir.

Perbedaan penting dari versi lama: biaya absolut NAIK karena volume naik.
Yang turun adalah cost-to-sales, karena pendapatan naik lebih cepat daripada
biaya. Karena itu "penghematan" selalu dinyatakan relatif terhadap skenario
tanpa tindakan (biaya ikut volume), bukan relatif terhadap biaya 2023.

Semua porsi tuas, porsi biaya tetap, dan koreksi tumpang tindih = ASUMSI TIM
(dilabel); hanya basis biaya dan volume yang berasal dari kasus.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load

# --- Parameter model (ASUMSI TIM, kecuali basis kasus) ------------------------
VOLUME_GROWTH_PCT = 21.4  # 1.110 -> 1.347,5 juta paket (Table 4, kasus)
FIXED_SHARE_PCT = 35.0  # porsi biaya tetap (ASUMSI TIM)
OVERLAP_CORRECTION_PP = 1.0  # koreksi tumpang tindih antar tuas (ASUMSI TIM)
SPONSOR_NET_T = 6.12  # net sponsor selektif, basis proyeksi (Tantangan 1)
HORIZON_YEARS = 5
DISCOUNT_RATE_PCT = 10.0


# Tujuh tuas efisiensi KANONIK (satu sumber kebenaran) — dipakai jembatan P&L
# DAN modalshift.cost_levers agar kedua UI tak saling bertentangan.
# `pctOfVariable` = persentase biaya variabel SETELAH tumbuh (ASUMSI TIM),
# selaras tabel tuas Tantangan 6. `dim` = dimensi biaya (naratif).
LEVERS: list[dict[str, Any]] = [
    {
        "lever": "Produktivitas last-mile dan COD",
        "dim": "shipping",
        "pctOfVariable": 3.0,
        "co2Pct": 12.0,
        "mechanism": "Insentif output + QRIS/konfirmasi pra-kedatangan menurunkan waktu per paket COD.",
        "evidence": "Tantangan 3: COD 17,25 -> 12,0 menit per paket; produktivitas 24,3 -> 35 per hari.",
    },
    {
        "lever": "Modal shift darat ke laut",
        "dim": "shipping",
        "pctOfVariable": 1.0,
        "co2Pct": 18.4,
        "mechanism": "Paket tidak mendesak dialihkan ke laut/kapal (murah + emisi rendah).",
        "evidence": "Modal-Shift Optimizer: hemat biaya & emisi pada koridor yang berpindah moda.",
    },
    {
        "lever": "Kualitas alamat dan gagal antar",
        "dim": "fulfilment",
        "pctOfVariable": 1.0,
        "co2Pct": 2.0,
        "mechanism": "Geotag + fuzzy matching menekan retur gagal-antar dan komplain.",
        "evidence": "Komplain 5,5/juta -> target <3/juta; tiap retur = 1 perjalanan terbuang.",
    },
    {
        "lever": "Right-size packaging",
        "dim": "fulfilment",
        "pctOfVariable": 0.5,
        "co2Pct": 4.0,
        "mechanism": "Kemasan sesuai ukuran menurunkan biaya material dan limbah.",
        "evidence": "Kemasan sekali-pakai salah satu driver biaya fulfilment & emisi material.",
    },
    {
        "lever": "Backhaul dan berbagi aset",
        "dim": "shipping",
        "pctOfVariable": 0.4,
        "co2Pct": 2.0,
        "mechanism": "Isi muatan balik dan berbagi kapasitas menurunkan trip kosong.",
        "evidence": "Load factor line-haul & kolaborasi kapasitas antar-operator.",
    },
    {
        "lever": "PUDO dan loker",
        "dim": "fulfilment",
        "pctOfVariable": 0.2,
        "co2Pct": 1.0,
        "mechanism": "Titik ambil/pengiriman menurunkan percobaan antar gagal.",
        "evidence": "PUDO saat hub di atas 85% (sistem lima lapis, Tantangan 2).",
    },
    {
        "lever": "Transisi energi armada",
        "dim": "shipping",
        "pctOfVariable": 0.1,
        "co2Pct": 12.0,
        "mechanism": "Motor listrik menggantikan BBM pada rute urban (hanya bila diskalakan).",
        "evidence": "Pilot 350 unit Tantangan 4 = sekitar 0,004% sampai 0,005% biaya variabel.",
    },
]


def _basis() -> dict[str, float]:
    """Ambil basis biaya & penjualan dari kasus (Table 3)."""
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


def cost_model(
    include_sustainability: bool = True,
    include_sponsor: bool = True,
) -> dict[str, Any]:
    """Hitung jembatan cost-to-sales kanonik (tanpa pembulatan berarti).

    Args:
        include_sustainability: ikutkan tuas sustainability (packaging, energi).
        include_sponsor: tambahkan lapis sponsor selektif (Tantangan 1).

    Returns:
        Dict berisi basis, absorpsi, langkah tuas, sponsor, jembatan, ringkasan.
    """
    b = _basis()
    cost = b["costT"]
    sales = b["netSalesT"]
    growth = 1 + VOLUME_GROWTH_PCT / 100
    fixed = cost * FIXED_SHARE_PCT / 100
    variable = cost - fixed

    sales_grown = sales * growth
    variable_grown = variable * growth
    cost_no_action = cost * growth
    cost_after_absorption = fixed + variable_grown
    absorption_benefit = cost_no_action - cost_after_absorption

    active = []
    for lv in LEVERS:
        if not include_sustainability and lv["lever"] in (
            "Right-size packaging",
            "Transisi energi armada",
        ):
            continue
        active.append(lv)

    running = cost_after_absorption
    steps: list[dict[str, Any]] = []
    for lv in active:
        saving = variable_grown * lv["pctOfVariable"] / 100
        running -= saving
        steps.append({
            "lever": lv["lever"],
            "dimension": lv["dim"],
            "savingPct": round(lv["pctOfVariable"], 1),  # % biaya variabel tumbuh
            "savingPctOfCost": round(saving / cost * 100, 2),
            "savingT": round(saving, 3),
            "costAfterT": round(running, 3),
            "co2Pct": lv["co2Pct"],
            "mechanism": lv["mechanism"],
            "evidence": lv["evidence"],
        })

    lever_gross = sum(s["savingT"] for s in steps)
    overlap = variable_grown * OVERLAP_CORRECTION_PP / 100
    lever_net = lever_gross - overlap
    cost_after_levers = cost_after_absorption - lever_net

    sponsor_saving = SPONSOR_NET_T if include_sponsor else 0.0
    cost_final = cost_after_levers - sponsor_saving

    def cts(cost_value: float) -> float:
        """Cost-to-sales (%) terhadap penjualan setelah tumbuh."""
        return (cost_value / sales_grown * 100) if sales_grown else 0.0

    bridge = [
        {"stage": "Baseline 2023", "costT": round(cost, 2), "costToSalesPct": round(b["costToSalesPct"], 2)},
        {"stage": "Setelah absorpsi volume", "costT": round(cost_after_absorption, 2), "costToSalesPct": round(cts(cost_after_absorption), 2)},
        {"stage": "Setelah tujuh tuas", "costT": round(cost_after_levers, 2), "costToSalesPct": round(cts(cost_after_levers), 2)},
    ]
    if include_sponsor:
        bridge.append({"stage": "Setelah sponsor selektif", "costT": round(cost_final, 2), "costToSalesPct": round(cts(cost_final), 2)})

    return {
        "basis": b,
        "params": {
            "volumeGrowthPct": VOLUME_GROWTH_PCT,
            "fixedSharePct": FIXED_SHARE_PCT,
            "overlapCorrectionPp": OVERLAP_CORRECTION_PP,
            "sponsorNetT": SPONSOR_NET_T,
            "horizonYears": HORIZON_YEARS,
            "discountRatePct": DISCOUNT_RATE_PCT,
        },
        "fixedCostT": round(fixed, 3),
        "variableCostT": round(variable, 3),
        "variableGrownT": round(variable_grown, 3),
        "salesGrownT": round(sales_grown, 2),
        "costNoActionT": round(cost_no_action, 3),
        "costAfterAbsorptionT": round(cost_after_absorption, 3),
        "absorptionBenefitT": round(absorption_benefit, 3),
        "steps": steps,
        "leverGrossT": round(lever_gross, 3),
        "overlapCorrectionT": round(overlap, 3),
        "leverNetT": round(lever_net, 3),
        "costAfterLeversT": round(cost_after_levers, 3),
        "sponsorSavingT": round(sponsor_saving, 3),
        "costFinalT": round(cost_final, 3),
        "costAvoidedWithoutSponsorT": round(absorption_benefit + lever_net, 3),
        "costAvoidedT": round(cost_no_action - cost_final, 3),
        "bridge": bridge,
    }


def lever_portfolio(include_sustainability: bool = True) -> dict[str, Any]:
    """Portofolio tuas kanonik (dipakai halaman Cost-Lever/multimodal)."""
    m = cost_model(include_sustainability=include_sustainability, include_sponsor=False)
    total_cost = m["basis"]["costT"]
    levers = [
        {
            "lever": s["lever"],
            "mechanism": s["mechanism"],
            "costImpactIdrT": s["savingT"],
            "costPct": s["savingPct"],
            "co2Pct": s["co2Pct"],
            "evidence": s["evidence"],
        }
        for s in m["steps"]
    ]
    return {
        "basisYear": m["basis"]["year"],
        "totalCostT": round(total_cost, 2),
        "variableGrownT": m["variableGrownT"],
        "levers": levers,
        "totalSavingIdrT": m["leverNetT"],
        "savingPctOfCost": round(m["leverNetT"] / total_cost * 100, 1) if total_cost else 0.0,
    }


def cost_waterfall(
    include_sustainability: bool = True,
    include_sponsor: bool = True,
) -> dict[str, Any]:
    """Jembatan cost-to-sales + langkah tuas, siap kirim ke API.

    Args:
        include_sustainability: ikutkan tuas sustainability (packaging, energi).
        include_sponsor: sertakan lapis sponsor selektif.
    """
    m = cost_model(include_sustainability, include_sponsor)
    b = m["basis"]
    base_sales = b["netSalesT"]
    base_cost = b["costT"]

    ebit_before = base_sales - base_cost
    ebit_after = m["salesGrownT"] - m["costFinalT"]

    return {
        "engine": "Unified Cost-Waterfall & P&L Impact (jembatan absorpsi + tuas)",
        "note": (
            "Basis biaya & penjualan dari Table 3 kasus; volume +21,4% dari Table 4. "
            "Porsi biaya tetap, porsi tuas, dan koreksi tumpang tindih = ASUMSI TIM "
            "(dilabel). Biaya absolut NAIK karena volume naik; yang turun adalah "
            "cost-to-sales. 'EBIT proxy' = penjualan − biaya logistik (bukan EBIT resmi)."
        ),
        "inputs": {
            "includeSustainability": include_sustainability,
            "includeSponsor": include_sponsor,
        },
        "params": m["params"],
        "basis": {
            "year": b["year"],
            "fulfilmentT": b["fulfilmentT"],
            "shippingT": b["shippingT"],
            "costT": round(base_cost, 2),
            "netSalesT": round(base_sales, 2),
            "costToSalesPct": round(b["costToSalesPct"], 1),
        },
        "absorption": {
            "volumeGrowthPct": m["params"]["volumeGrowthPct"],
            "fixedSharePct": m["params"]["fixedSharePct"],
            "fixedCostT": m["fixedCostT"],
            "variableCostT": m["variableCostT"],
            "variableGrownT": m["variableGrownT"],
            "salesGrownT": m["salesGrownT"],
            "costNoActionT": m["costNoActionT"],
            "costAfterAbsorptionT": m["costAfterAbsorptionT"],
            "benefitT": m["absorptionBenefitT"],
        },
        "waterfall": m["steps"],
        "overlapCorrectionT": m["overlapCorrectionT"],
        "sponsor": {"netSavingT": m["sponsorSavingT"]},
        "bridge": m["bridge"],
        "summary": {
            "baseCostT": round(base_cost, 2),
            "costNoActionT": m["costNoActionT"],
            "absorptionBenefitT": m["absorptionBenefitT"],
            "leverNetT": m["leverNetT"],
            "leverSavingPct": round(m["leverNetT"] / base_cost * 100, 1) if base_cost else 0.0,
            "sponsorSavingT": m["sponsorSavingT"],
            "finalCostT": m["costFinalT"],
            "costAvoidedWithoutSponsorT": m["costAvoidedWithoutSponsorT"],
            "costAvoidedT": m["costAvoidedT"],
            "totalSavingT": m["costAvoidedT"],  # alias kompatibilitas
            "totalSavingPct": round(m["costAvoidedT"] / m["costNoActionT"] * 100, 1) if m["costNoActionT"] else 0.0,
            "costToSalesBeforePct": round(b["costToSalesPct"], 1),
            "costToSalesAfterAbsorptionPct": m["bridge"][1]["costToSalesPct"],
            "costToSalesAfterLeversPct": m["bridge"][2]["costToSalesPct"],
            "costToSalesAfterPct": m["bridge"][-1]["costToSalesPct"],
            "ebitProxyBeforeT": round(ebit_before, 2),
            "ebitProxyAfterT": round(ebit_after, 2),
            "ebitProxyUpliftPct": round((ebit_after / ebit_before - 1) * 100, 1) if ebit_before else 0.0,
        },
    }
