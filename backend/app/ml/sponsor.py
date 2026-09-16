"""Direct-vs-Sponsor Comparator — menjawab Pertanyaan 1 studi kasus secara kuantitatif.

Masalah kasus: "Should the Direct Operation Model be shifted to the Regional
Sponsored Model?" Model Regional Sponsor = kemitraan lokal dengan partisipasi
ekuitas signifikan + independensi operasional; HQ tidak bisa mendikte harga,
akuisisi pelanggan, atau penyesuaian operasional di pasar yang tidak dipahami.

Pendekatan (berbasis DATA KASUS, asumsi tim dilabel eksplisit):
  1. Biaya operasional per paket (unit cost) diturunkan dari Tabel 3:
     (fulfilment + shipping) 2023 = 99,54 T IDR untuk 1.110 juta paket (Tabel 4)
     → unit cost rata-rata nasional. Biaya per region diskalakan relatif terhadap
     utilisasi (makin rendah utilisasi → biaya tetap tersebar ke lebih sedikit
     paket → unit cost lebih tinggi).
  2. Bandingkan DUA model per region:
     a. DIRECT  : HQ menanggung 100% biaya tetap + capex; margin = revenue − cost.
     b. SPONSOR : mitra lokal pegang ekuitas (asumsi ekuitasHQ%), HQ hanya
        mengakui porsi laba sesuai ekuitas, TAPI biaya tetap wilayah bergeser
        ke mitra (shared risk) → capex exposure HQ turun.
  3. Kontrol: Direct skor kontrol 100; Sponsor turun sebesar (1 − ekuitasHQ)
     dikali bobot kontrol (harga/akuisisi/operasi) — mengukur "loss of control"
     yang disebut kasus.
  4. Keputusan per region: skor komposit (capex saving, margin HQ, risiko
     kontrol) → rekomendasi Direct / Sponsor bertahap / Sponsor penuh.

Semua parameter asumsi (ekuitas, margin lokal, porsi tetap) diberi label
"assumption" dan dapat di-override lewat API untuk eksplorasi (Digital Twin nyata).
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load

# ── Parameter default (asumsi tim — dapat di-override via API) ──────────────
# Porsi biaya tetap (dari total unit cost) yang bergeser ke mitra pada model sponsor.
DEFAULT_FIXED_SHARE = 0.45
# Porsi ekuitas yang dipertahankan HQ di entitas sponsor (0..1).
DEFAULT_HQ_EQUITY = 0.30
# Margin operasional lokal kotor sebagai fraksi revenue (sebelum bagi hasil).
DEFAULT_LOCAL_MARGIN = 0.14
# Bobot kontrol HQ yang hilang pada model sponsor (harga, akuisisi, operasi).
CONTROL_WEIGHTS = {"pricing": 0.4, "customer_acquisition": 0.35, "operations": 0.25}

# Ambang utilisasi: di bawah ini, biaya tetap per paket mahal → kandidat sponsor.
SPONSOR_UTIL_THRESHOLD = 50.0
# Di atas ini, volume padat → skala ekonomi Direct lebih kuat.
DIRECT_UTIL_THRESHOLD = 65.0

# Bobot skor keputusan (jumlah = 1). Utilisasi diberi bobot dominan karena ini
# sinyal utama: hub padat (Java) → Direct; hub tipis (Maluku) → Sponsor. Komponen
# ekonomi jadi penentu di antara hub ber-utilisasi serupa. Dikalibrasi agar tier
# 'Sponsor penuh' TERJANGKAU (dulu maks ≈0,45 → tier itu mustahil).
DECISION_WEIGHTS = {"util": 0.55, "capex": 0.25, "profit": 0.20}
# Ambang tier rekomendasi (skor komposit 0..1).
SPONSOR_FULL_THRESHOLD = 0.60
SPONSOR_STAGED_THRESHOLD = 0.35


def _num(v: Any, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _national_unit_cost() -> dict[str, float]:
    """Unit cost nasional dari Tabel 3 & 4 (IDR per paket) — angka kasus."""
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    total_cost_t = _num(f2023.get("fulfilmentT")) + _num(f2023.get("shippingT"))  # triliun IDR
    parcels_m = sum(_num(d.get("totalM")) for d in data["monthlyDemand"])  # juta paket
    # triliun / juta = 1e12 / 1e6 = 1e6 IDR per paket
    per_parcel = (total_cost_t * 1e12) / (parcels_m * 1e6) if parcels_m else 0.0
    return {
        "year": f2023.get("year"),
        "totalCostT": round(total_cost_t, 2),
        "parcelsM": round(parcels_m, 1),
        "unitCostIdr": round(per_parcel),
    }


def _revenue_per_parcel() -> float:
    """Revenue rata-rata per paket (net sales Tabel 3 ÷ volume Tabel 4)."""
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    sales_t = _num(f2023.get("netSalesT"))
    parcels_m = sum(_num(d.get("totalM")) for d in data["monthlyDemand"])
    return (sales_t * 1e12) / (parcels_m * 1e6) if parcels_m else 0.0


def _region_metrics() -> list[dict[str, Any]]:
    """Agregat region + unit cost yang disesuaikan utilisasi + revenue + volume."""
    data = load()
    national_unit = _national_unit_cost()["unitCostIdr"]
    rev_per_parcel = _revenue_per_parcel()
    # Utilisasi rata-rata nasional sebagai basis penyesuaian.
    all_hubs = data["hubs"]
    nat_util = sum(_num(h.get("utilizationPct")) for h in all_hubs) / len(all_hubs) if all_hubs else 60.0

    regions = data["regions"]
    out: list[dict[str, Any]] = []
    for region in regions:
        hubs = [h for h in all_hubs if h.get("region") == region]
        if not hubs:
            continue
        cap = sum(_num(h.get("capacityM")) for h in hubs)
        util = sum(_num(h.get("utilizationPct")) for h in hubs) / len(hubs)
        outlets = sum(int(_num(h.get("outlets"))) for h in hubs)
        volume_m = sum(_num(h.get("capacityM")) * _num(h.get("utilizationPct")) / 100 for h in hubs)

        # Biaya tetap tersebar ke volume → makin rendah utilisasi, makin mahal/paket.
        # Faktor = nat_util / util (dibatasi agar tidak ekstrem). Util rendah → faktor > 1.
        adjust = (nat_util / util) if util > 0 else 1.0
        cost_ratio = 0.7 + 0.3 * adjust  # 70% biaya variabel, 30% tetap terdampak utilisasi
        unit_cost = round(national_unit * cost_ratio)

        out.append(
            {
                "region": region,
                "hubs": len(hubs),
                "capacityM": round(cap, 3),
                "avgUtilizationPct": round(util, 1),
                "outlets": outlets,
                "volumeM": round(volume_m, 3),
                "unitCostIdr": unit_cost,
                "costRatio": round(cost_ratio, 3),
                "revenuePerParcelIdr": round(rev_per_parcel),
                "sponsorCandidate": util < SPONSOR_UTIL_THRESHOLD,
                "directStrength": util >= DIRECT_UTIL_THRESHOLD,
            }
        )
    return out


def compare_models(
    hq_equity: float = DEFAULT_HQ_EQUITY,
    fixed_share: float = DEFAULT_FIXED_SHARE,
    local_margin: float = DEFAULT_LOCAL_MARGIN,
) -> dict[str, Any]:
    """Bandingkan Direct vs Sponsor untuk SETIAP region dengan ekonomi nyata.

    Args:
        hq_equity: porsi ekuitas HQ di entitas sponsor (0..1).
        fixed_share: porsi biaya tetap yang bergeser ke mitra saat sponsor.
        local_margin: margin operasional lokal sebagai fraksi revenue.
    """
    hq_equity = min(1.0, max(0.0, hq_equity))
    fixed_share = min(1.0, max(0.0, fixed_share))
    local_margin = min(1.0, max(0.0, local_margin))

    regions = _region_metrics()
    rows: list[dict[str, Any]] = []
    for r in regions:
        unit = r["unitCostIdr"]
        vol = r["volumeM"]  # juta paket/hari (kapasitas efektif)
        rev_pp = r["revenuePerParcelIdr"]

        # ── DIRECT: HQ tanggung semua biaya tetap & variabel, dapat semua margin ──
        direct_cost_pp = unit
        direct_margin_pp = rev_pp - direct_cost_pp
        direct_profit = direct_margin_pp * vol * 1e6  # IDR/hari
        direct_capex_exposure = direct_cost_pp * fixed_share * vol * 1e6  # porsi tetap yang HQ tanggung
        direct_control = 100.0

        # ── SPONSOR: mitra tanggung biaya tetap, HQ dapat porsi laba sesuai ekuitas ──
        # Biaya tetap wilayah bergeser ke mitra → HQ tak menanggung capex itu.
        sponsor_cost_pp = unit * (1 - fixed_share)
        sponsor_margin_pp = rev_pp - sponsor_cost_pp
        # Margin wilayah sebelum bagi hasil = margin struktur sponsor, di-floor oleh
        # margin lokal (mitra lebih paham pasar → minimal margin operasional lokal).
        local_profit_pp = max(sponsor_margin_pp, rev_pp * local_margin)
        sponsor_profit = local_profit_pp * vol * 1e6 * hq_equity  # porsi HQ
        sponsor_capex_exposure = sponsor_cost_pp * fixed_share * vol * 1e6
        # Kontrol HQ turun sebesar (1 − ekuitas) dikali bobot kontrol total.
        control_loss = (1 - hq_equity) * sum(CONTROL_WEIGHTS.values()) * 100
        sponsor_control = round(max(0.0, 100 - control_loss), 1)

        capex_saving = direct_capex_exposure - sponsor_capex_exposure
        profit_delta = sponsor_profit - direct_profit

        # ── Skor komposit keputusan (0..1, makin tinggi = sponsor makin tepat) ──
        # Tiap komponen dinormalisasi ke MAKS teoretisnya agar skor benar-benar
        # menjangkau 0..1 (sebelumnya maks ≈0,57 → tier 'Sponsor penuh' mustahil).
        # 1) Capex: penghematan maks = fixed_share dari capex Direct (mitra tanggung
        #    porsi tetap penuh). Normalisasi → 0..1.
        capex_score = min(1.0, max(0.0, (capex_saving / (direct_capex_exposure or 1)) / (fixed_share or 1)))
        # 2) Laba: delta ≥0 = skor penuh; negatif → proporsional terhadap rugi.
        profit_score = 1.0 if profit_delta >= 0 else max(0.0, 1 + profit_delta / (abs(direct_profit) or 1))
        # 3) Util rendah → lebih cocok sponsor (0 di ≥direct threshold, 1 di 0%).
        util_span = DIRECT_UTIL_THRESHOLD or 1.0
        util_score = min(1.0, max(0.0, (DIRECT_UTIL_THRESHOLD - r["avgUtilizationPct"]) / util_span))
        decision_score = round(
            DECISION_WEIGHTS["util"] * util_score
            + DECISION_WEIGHTS["capex"] * capex_score
            + DECISION_WEIGHTS["profit"] * profit_score,
            3,
        )

        if decision_score >= SPONSOR_FULL_THRESHOLD:
            recommendation = "Sponsor penuh"
        elif decision_score >= SPONSOR_STAGED_THRESHOLD:
            recommendation = "Sponsor bertahap"
        else:
            recommendation = "Direct (pertahankan)"

        rows.append(
            {
                "region": r["region"],
                "avgUtilizationPct": r["avgUtilizationPct"],
                "volumeM": r["volumeM"],
                "unitCostIdr": unit,
                "revenuePerParcelIdr": rev_pp,
                "direct": {
                    "costPerParcelIdr": round(direct_cost_pp),
                    "profitPerDayIdr": round(direct_profit),
                    "capexExposurePerDayIdr": round(direct_capex_exposure),
                    "controlScore": direct_control,
                },
                "sponsor": {
                    "costPerParcelIdr": round(sponsor_cost_pp),
                    "profitPerDayIdr": round(sponsor_profit),
                    "capexExposurePerDayIdr": round(sponsor_capex_exposure),
                    "controlScore": sponsor_control,
                },
                "delta": {
                    "capexSavingPerDayIdr": round(capex_saving),
                    "profitDeltaPerDayIdr": round(profit_delta),
                    "controlLossPts": round(100 - sponsor_control, 1),
                },
                "decisionScore": decision_score,
                "recommendation": recommendation,
            }
        )

    # ── Ringkasan portfolio ──
    sponsor_regions = [r for r in rows if r["recommendation"].startswith("Sponsor")]
    direct_regions = [r for r in rows if r["recommendation"].startswith("Direct")]
    total_capex_saving = sum(r["delta"]["capexSavingPerDayIdr"] for r in sponsor_regions)
    total_profit_delta = sum(r["delta"]["profitDeltaPerDayIdr"] for r in rows)

    return {
        "engine": "Direct-vs-Sponsor Comparator (unit-cost model dari Tabel 3 & 4)",
        "note": (
            "Ekonomi dihitung dari angka kasus (biaya & volume). Porsi tetap, ekuitas HQ, "
            "dan margin lokal = ASUMSI TIM dan dapat diatur; bukan tarif nyata."
        ),
        "assumptions": {
            "hqEquity": round(hq_equity, 3),
            "fixedShare": round(fixed_share, 3),
            "localMargin": round(local_margin, 3),
            "sponsorUtilThreshold": SPONSOR_UTIL_THRESHOLD,
            "directUtilThreshold": DIRECT_UTIL_THRESHOLD,
            "controlWeights": CONTROL_WEIGHTS,
            "decisionWeights": DECISION_WEIGHTS,
            "tierThresholds": {"sponsorFull": SPONSOR_FULL_THRESHOLD, "sponsorStaged": SPONSOR_STAGED_THRESHOLD},
        },
        "nationalBasis": _national_unit_cost(),
        "summary": {
            "recommendSponsor": len(sponsor_regions),
            "recommendDirect": len(direct_regions),
            "totalCapexSavingPerDayIdr": round(total_capex_saving),
            "totalProfitDeltaPerDayIdr": round(total_profit_delta),
            "sponsorRegions": [r["region"] for r in sponsor_regions],
            "directRegions": [r["region"] for r in direct_regions],
        },
        "regions": sorted(rows, key=lambda r: -r["decisionScore"]),
    }


def sensitivity(base: dict[str, Any] | None = None) -> dict[str, Any]:
    """Uji sensitivitas: bagaimana jumlah region-sponsor berubah saat ekuitas HQ diubah.

    Menjawab "kalau HQ mempertahankan lebih banyak ekuitas, apakah masih layak?".
    """
    out = []
    for equity in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6):
        res = compare_models(hq_equity=equity)
        out.append(
            {
                "hqEquity": equity,
                "recommendSponsor": res["summary"]["recommendSponsor"],
                "totalCapexSavingPerDayIdr": res["summary"]["totalCapexSavingPerDayIdr"],
                "sponsorRegions": res["summary"]["sponsorRegions"],
            }
        )
    return {"engine": "sensitivity (hqEquity sweep)", "sweep": out}
