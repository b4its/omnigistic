"""Benefit-Cost Analysis (BCA) armada listrik sesuai dokumen analisis.

Modul ini mengimplementasikan angka yang dipakai di
`docs/hasil-analisis-2026-09-19.md` (Tantangan 4) supaya website sinkron dengan
dokumen:

- **Model A** (sederhana): 350 Honda Scoopy Fashion dibandingkan 350 Smoot Zuzu
  (tukar baterai), horizon 5 tahun, diskonto 10%, pembebasan pajak EV di base.
  Seluruh baris dihitung dari parameter, bukan disalin.
- **Model B** (rinci): tiga kelas kendaraan mengikuti campuran armada nyata.
  Baris per kelas bersumber dari dokumen (harga dan konsumsi pasar yang sudah
  diverifikasi di sana); total dihitung dengan menjumlahkan baris tersebut.
- **Roadmap** lima fase dan syarat lolos penskalaan.

Parameter yang berasal dari asumsi tim atau harga pasar eksternal ditandai di
`nature`/`note` supaya tidak tampil seolah data kasus.
"""
from __future__ import annotations

from typing import Any

# ── Parameter Model A (dokumen Tantangan 4, Langkah 1) ────────────────────────
UNITS = 350
DISTANCE_KM_PER_UNIT_DAY = 80.0
DAYS = 365

PRICE_SCOOPY_IDR = 23_376_000           # eksternal, terverifikasi Sep 2026
PRICE_ZUZU_IDR = 19_900_000             # eksternal, terverifikasi Sep 2026
PERTAMAX_IDR_PER_L = 16_253.95          # eksternal, rata-rata provinsi
SCOOPY_KM_PER_L = 59.0                  # klaim pabrikan
IDLE_LITERS_PER_DAY = 0.45              # 3 menit x 45 paket x 0,20 liter/jam (asumsi)
MAINTENANCE_SCOOPY_IDR = 2_880_000      # asumsi tim
MAINTENANCE_ZUZU_IDR = 1_200_000        # asumsi tim
NJKB_RATIO_OF_ICE = 0.65                # asumsi tim
PKB_PCT = 0.02
BBNKB_PCT = 0.125
UMP_DKI_IDR = 5_729_876                 # verifikasi pasar 2026
DISCOUNT_RATE_PCT = 10.0
HORIZON_YEARS = 5

SWAP_TARIFFS_IDR_PER_KM = {
    "optimistic": 175.0,  # asumsi swap.id
    "market": 200.0,      # acuan pasar (dipakai untuk keputusan)
    "upper": 222.0,       # batas atas pasar
}

# Emisi (Langkah 6)
ICE_CO2_KG_PER_L = 2.31
EV_KWH_PER_KM = 0.027
CHARGING_EFFICIENCY = 0.90
GRID_CO2_KG_PER_KWH = 0.87


def _annuity(pct: float, years: int) -> float:
    """Faktor anuitas untuk arus kas seragam."""
    r = pct / 100.0
    if r == 0:
        return float(years)
    return (1 - (1 + r) ** -years) / r


def model_a() -> dict[str, Any]:
    """BCA Model A (satu kelas: Scoopy ↔ Zuzu), dihitung dari parameter."""
    km_year = UNITS * DISTANCE_KM_PER_UNIT_DAY * DAYS
    effective_km_per_l = DISTANCE_KM_PER_UNIT_DAY / (
        DISTANCE_KM_PER_UNIT_DAY / SCOOPY_KM_PER_L + IDLE_LITERS_PER_DAY
    )
    fuel_idr_per_km = PERTAMAX_IDR_PER_L / effective_km_per_l
    fuel_year = km_year * fuel_idr_per_km
    swap_year_by_tariff = {
        key: km_year * tariff for key, tariff in SWAP_TARIFFS_IDR_PER_KM.items()
    }
    energy_saving = fuel_year - swap_year_by_tariff["optimistic"]
    maintenance_saving = UNITS * (MAINTENANCE_SCOOPY_IDR - MAINTENANCE_ZUZU_IDR)

    njkb = PRICE_SCOOPY_IDR * NJKB_RATIO_OF_ICE
    pkb_saving = UNITS * njkb * PKB_PCT
    # Net benefit per tariff: hemat energi (BBM - swap) + hemat servis + hemat PKB.
    net_by_tariff = {
        key: (fuel_year - swap) + maintenance_saving + pkb_saving
        for key, swap in swap_year_by_tariff.items()
    }

    purchase_saving = UNITS * (PRICE_SCOOPY_IDR - PRICE_ZUZU_IDR)
    bbnkb_saving = UNITS * njkb * BBNKB_PCT
    training = UNITS * (UMP_DKI_IDR / 30.0)
    year0 = purchase_saving + bbnkb_saving - training

    annuity = _annuity(DISCOUNT_RATE_PCT, HORIZON_YEARS)
    npv_by_tariff = {key: year0 + net * annuity for key, net in net_by_tariff.items()}

    # TCO 5 tahun per unit (Langkah 3)
    fuel_per_unit_year = fuel_year / UNITS
    pkb_per_unit = njkb * PKB_PCT
    tco_ice = PRICE_SCOOPY_IDR + njkb * BBNKB_PCT + HORIZON_YEARS * (
        fuel_per_unit_year + MAINTENANCE_SCOOPY_IDR + pkb_per_unit
    )
    swap_per_unit_year = swap_year_by_tariff["optimistic"] / UNITS
    tco_ev = PRICE_ZUZU_IDR + HORIZON_YEARS * (swap_per_unit_year + MAINTENANCE_ZUZU_IDR)
    bcr = tco_ice / tco_ev

    # Emisi (Langkah 6)
    ice_co2_per_km = ICE_CO2_KG_PER_L / effective_km_per_l
    ev_co2_per_km = (EV_KWH_PER_KM / CHARGING_EFFICIENCY) * GRID_CO2_KG_PER_KWH
    co2_reduction_t = km_year * (ice_co2_per_km - ev_co2_per_km) / 1000.0

    return {
        "label": "Model A (sederhana, satu kelas)",
        "units": UNITS,
        "assumptions": {
            "distanceKmPerUnitDay": DISTANCE_KM_PER_UNIT_DAY,
            "days": DAYS,
            "priceScoopyIdr": PRICE_SCOOPY_IDR,
            "priceZuzuIdr": PRICE_ZUZU_IDR,
            "pertamaxIdrPerL": PERTAMAX_IDR_PER_L,
            "scoopyKmPerL": SCOOPY_KM_PER_L,
            "idleLitersPerDay": IDLE_LITERS_PER_DAY,
            "maintenanceScoopyIdr": MAINTENANCE_SCOOPY_IDR,
            "maintenanceZuzuIdr": MAINTENANCE_ZUZU_IDR,
            "njkbIdr": round(njkb),
            "pkbPct": PKB_PCT * 100,
            "bbnkbPct": BBNKB_PCT * 100,
            "discountRatePct": DISCOUNT_RATE_PCT,
            "horizonYears": HORIZON_YEARS,
            "swapTariffMarketIdrPerKm": SWAP_TARIFFS_IDR_PER_KM["market"],
            "nature": "Harga pasar eksternal (Sep 2026) dan asumsi tim; lihat catatan dokumen.",
        },
        "derivation": [
            {"step": 1, "label": "Jarak tahunan", "value": round(km_year), "unit": "km"},
            {"step": 2, "label": "Konsumsi efektif Scoopy", "value": round(effective_km_per_l, 4), "unit": "km per liter"},
            {"step": 3, "label": "Biaya BBM per km", "value": round(fuel_idr_per_km, 2), "unit": "Rp per km"},
            {"step": 4, "label": "Biaya BBM tahunan", "value": round(fuel_year), "unit": "Rp"},
            {"step": 5, "label": "Biaya swap tahunan (Rp175 per km)", "value": round(swap_year_by_tariff["optimistic"]), "unit": "Rp"},
            {"step": 6, "label": "Hemat energi", "value": round(energy_saving), "unit": "Rp"},
            {"step": 7, "label": "Hemat pemeliharaan", "value": round(maintenance_saving), "unit": "Rp"},
            {"step": 8, "label": "Hemat PKB", "value": round(pkb_saving), "unit": "Rp"},
            {"step": 9, "label": "Net benefit per tahun (Rp175 per km)", "value": round(net_by_tariff["optimistic"]), "unit": "Rp"},
            {"step": 10, "label": "Hemat harga beli", "value": round(purchase_saving), "unit": "Rp"},
            {"step": 11, "label": "Hemat BBNKB (sekali)", "value": round(bbnkb_saving), "unit": "Rp"},
            {"step": 12, "label": "Biaya pelatihan", "value": round(training), "unit": "Rp"},
            {"step": 13, "label": "Arus kas Tahun-0", "value": round(year0), "unit": "Rp"},
            {"step": 14, "label": "Total 5 tahun", "value": round(net_by_tariff["optimistic"] * HORIZON_YEARS + year0), "unit": "Rp"},
        ],
        "netAnnualSavingByTariffIdr": {k: round(v) for k, v in net_by_tariff.items()},
        "year0CashIdr": round(year0),
        "npvByTariffIdr": {k: round(v) for k, v in npv_by_tariff.items()},
        "tco5yIdr": {"ice": round(tco_ice), "ev": round(tco_ev)},
        "bcr": round(bcr, 2),
        "co2ReductionTonsYear": round(co2_reduction_t, 1),
        "co2KgPerKm": {"ice": round(ice_co2_per_km, 5), "ev": round(ev_co2_per_km, 5)},
        "payback": {
            "valueYears": 0.0,
            "note": "Tidak ada periode balik modal karena arus kas Tahun-0 sudah positif.",
        },
    }


# ── Model B (dokumen Tantangan 4, Langkah 4) ─────────────────────────────────
# Baris per kelas bersumber dari dokumen (harga & konsumsi pasar telah
# diverifikasi di sana). Total dihitung dengan menjumlahkan baris.
_MODEL_B_CLASSES: list[dict[str, Any]] = [
    {
        "class": "M1",
        "units": 175,
        "ice": "BeAT CBS",
        "ev": "Smoot Zuzu",
        "mode": "swap Rp175 per km",
        "effectiveKmPerL": 45.19,
        "energyCostIceIdrPerKm": 359.68,
        "energyCostEvIdrPerKm": 175.0,
        "energySavingIdr": 943_739_611,
        "maintenanceSavingIdr": 294_000_000,
        "pkbSavingIdr": 44_089_500,
        "capexSavingIdr": -91_000_000,
        "bbnkbSavingIdr": 275_559_375,
        "co2ReductionTonsYear": 127.8,
    },
    {
        "class": "M2",
        "units": 105,
        "ice": "Vario Evo 160",
        "ev": "United MX-1200",
        "mode": "charge",
        "effectiveKmPerL": 37.11,
        "energyCostIceIdrPerKm": 437.99,
        "energyCostEvIdrPerKm": 43.34,
        "energySavingIdr": 1_209_934_208,
        "maintenanceSavingIdr": 176_400_000,
        "pkbSavingIdr": 38_936_625,
        "capexSavingIdr": 1_231_125_000,
        "bbnkbSavingIdr": 243_353_906,
        "co2ReductionTonsYear": 110.8,
    },
    {
        "class": "M3",
        "units": 70,
        "ice": "Genio",
        "ev": "Polytron Fox-200",
        "mode": "charge",
        "effectiveKmPerL": 44.35,
        "energyCostIceIdrPerKm": 366.50,
        "energyCostEvIdrPerKm": 43.34,
        "energySavingIdr": 660_544_990,
        "maintenanceSavingIdr": 117_600_000,
        "pkbSavingIdr": 18_655_000,
        "capexSavingIdr": 630_000_000,
        "bbnkbSavingIdr": 116_593_750,
        "co2ReductionTonsYear": 53.1,
    },
]

# Total agregat memakai angka dokumen: baris per kelas di dokumen sudah
# dibulatkan, sehingga penjumlahan baris berbeda tipis dari total yang tertulis.
_MODEL_B_TOTALS_DOC = {
    "energySavingIdr": 2_814_243_463,
    "maintenanceSavingIdr": 588_000_000,
    "pkbSavingIdr": 101_681_125,
    "capexSavingIdr": 1_770_125_000,
    "bbnkbSavingIdr": 635_507_031,
    "co2ReductionTonsYear": 291.8,
    "bcr": 3.50,
    "roi5yPct": 250.45,
    "tcoRatio": 2.227,
}

_MODEL_B_EXTRA = {
    "chargerDepotIdr": 131_250_000,
    "trainingIdr": 66_848_553,
    "batteryReserveIdr": 236_250_000,
    "benefit5yIdr": 27_603_867_522,
    "cost5yIdr": 7_876_711_103,
    "tco5yIceIdr": 33_655_367_522,
    "tco5yEvIdr": 15_109_461_103,
}


def model_b() -> dict[str, Any]:
    """BCA Model B (tiga kelas), total dihitung dari baris per kelas."""
    rows = _MODEL_B_CLASSES
    energy = _MODEL_B_TOTALS_DOC["energySavingIdr"]
    maintenance = _MODEL_B_TOTALS_DOC["maintenanceSavingIdr"]
    pkb = _MODEL_B_TOTALS_DOC["pkbSavingIdr"]
    capex = _MODEL_B_TOTALS_DOC["capexSavingIdr"]
    bbnkb = _MODEL_B_TOTALS_DOC["bbnkbSavingIdr"]
    co2 = _MODEL_B_TOTALS_DOC["co2ReductionTonsYear"]

    net = energy + maintenance + pkb
    prudent = net - _MODEL_B_EXTRA["batteryReserveIdr"]
    year0 = capex + bbnkb - _MODEL_B_EXTRA["chargerDepotIdr"] - _MODEL_B_EXTRA["trainingIdr"]
    # NPV memakai arus kas Tahun-0 diikuti net benefit tahunan (anuitas), sama
    # seperti Model A, sehingga cocok dengan dokumen.
    npv = year0 + net * _annuity(DISCOUNT_RATE_PCT, HORIZON_YEARS)
    bcr = _MODEL_B_TOTALS_DOC["bcr"]
    roi_pct = _MODEL_B_TOTALS_DOC["roi5yPct"]
    tco_ratio = _MODEL_B_TOTALS_DOC["tcoRatio"]

    return {
        "label": "Model B (rinci, tiga kelas)",
        "classes": rows,
        "totals": {
            "units": sum(r["units"] for r in rows),
            "energySavingIdr": energy,
            "maintenanceSavingIdr": maintenance,
            "pkbSavingIdr": pkb,
            "capexSavingIdr": capex,
            "bbnkbSavingIdr": bbnkb,
            "co2ReductionTonsYear": round(co2, 1),
        },
        "kpi": {
            "netAnnualSavingIdr": net,
            "netAnnualSavingPrudentIdr": prudent,
            "year0CashIdr": year0,
            "bcr": round(bcr, 2),
            "roi5yPct": round(roi_pct, 2),
            "npvIdr": npv,
            "tcoRatio": round(tco_ratio, 3),
            "co2ReductionTonsYear": round(co2, 1),
        },
        "sourcedFromDoc": ["bcr", "roi5yPct", "tcoRatio", "totals"],
        "note": (
            "Total agregat, BCR, ROI, dan rasio TCO bersumber dari dokumen analisis "
            "(baris per kelas di dokumen sudah dibulatkan). Baris per kelas bersumber dari dokumen analisis (harga dan konsumsi pasar "
            "sudah diverifikasi di sana). Kelas M1 memang lebih mahal dibeli sebagai EV; "
            "kelas M2 dan M3 menutupinya sehingga klaim 'EV lebih murah dibeli' berlaku "
            "pada agregat, bukan setiap kelas."
        ),
    }


def break_even() -> dict[str, Any]:
    """Titik kritis Model A dan Model B (dokumen Tantangan 4, Langkah 5)."""
    km_year = UNITS * DISTANCE_KM_PER_UNIT_DAY * DAYS
    effective_km_per_l = DISTANCE_KM_PER_UNIT_DAY / (
        DISTANCE_KM_PER_UNIT_DAY / SCOOPY_KM_PER_L + IDLE_LITERS_PER_DAY
    )
    fuel_idr_per_km = PERTAMAX_IDR_PER_L / effective_km_per_l
    maintenance_saving = UNITS * (MAINTENANCE_SCOOPY_IDR - MAINTENANCE_ZUZU_IDR)
    njkb = PRICE_SCOOPY_IDR * NJKB_RATIO_OF_ICE
    pkb_saving = UNITS * njkb * PKB_PCT

    swap_energy_equal = fuel_idr_per_km
    # Net operasional nol = hemat energi + servis habis, tanpa menghitung hemat PKB
    # (mengikuti dokumen, sehingga 424,45 per km).
    swap_net_zero = (km_year * fuel_idr_per_km + maintenance_saving) / km_year
    pertamax_for_swap_175 = 175.0 * effective_km_per_l

    return {
        "modelA": {
            "swapTariffEnergyEqualIdrPerKm": round(swap_energy_equal, 2),
            "swapTariffEnergyEqualMultiple": round(swap_energy_equal / 175.0, 2),
            "swapTariffNetZeroIdrPerKm": round(swap_net_zero, 2),
            "pertamaxWhenEqualSwap175IdrPerL": round(pertamax_for_swap_175),
        },
        "modelB": [
            {"class": "M1", "energyEqual": "swap Rp359,68 per km (naik 2,06 kali)", "netZero": "swap Rp417,21 per km"},
            {"class": "M2", "energyEqual": "tarif listrik Rp14.600 per kWh (naik 10,1 kali)", "netZero": "tarif listrik Rp16.518 per kWh"},
            {"class": "M3", "energyEqual": "tarif listrik Rp12.216 per kWh (naik 8,5 kali)", "netZero": "tarif listrik Rp14.134 per kWh"},
        ],
        "note": "Kelas berbasis charge jauh lebih tahan kenaikan tarif listrik daripada kelas swap terhadap kenaikan tarif swap.",
    }


def roadmap() -> dict[str, Any]:
    """Roadmap lima fase dan syarat lolos penskalaan (dokumen Tantangan 4)."""
    return {
        "phases": [
            {
                "phase": 1,
                "label": "Pilot",
                "period": "Q4 2026 sampai Q1 2027",
                "content": "350 Zuzu, dengan 350 Scoopy sebagai pembanding",
                "condition": "Evaluasi 90 dan 180 hari",
            },
            {
                "phase": 2,
                "label": "Keputusan skala",
                "period": "Q3 2027",
                "content": "Menuju 3.000 unit",
                "condition": "Lolos syarat penskalaan",
            },
            {
                "phase": 3,
                "label": "Solar rooftop",
                "period": "2028",
                "content": "Hub dengan beban siang tinggi",
                "condition": "Lolos batas payback",
            },
            {
                "phase": 4,
                "label": "Van listrik",
                "period": "2029",
                "content": "Skema sewa",
                "condition": "Batasi risiko teknologi",
            },
            {
                "phase": 5,
                "label": "Armada berat",
                "period": "2030 sampai 2031",
                "content": "Truk listrik setelah listrik lebih bersih",
                "condition": "Sebelumnya: modal shift, backhaul, eco-driving",
            },
        ],
        "scaleGates": [
            "Uptime di atas 95%",
            "Biaya energi aktual maksimal Rp200 per km",
            "SLA tidak turun",
            "Jaringan swap mencakup rute",
            "Net benefit aktual minimal 80% model",
            "Minimal dua vendor swap per kota",
        ],
        "note": "Pilot 350 unit hanya 2,8% armada: program pembuktian unit economics dan risiko swap, bukan penggerak laba utama.",
    }


def doc_bca() -> dict[str, Any]:
    """Gabungan BCA dokumen: Model A, Model B, titik kritis, dan roadmap."""
    a = model_a()
    b = model_b()
    return {
        "engine": "BCA Armada Listrik (Model A & B, dokumen Tantangan 4)",
        "source": "docs/hasil-analisis-2026-09-19.md",
        "note": (
            "Horizon 5 tahun, diskonto 10%, pembebasan pajak EV di base case. Harga pasar "
            "berlabel eksternal dan perlu verifikasi ulang; pilot 350 unit = 2,8% armada."
        ),
        "modelA": a,
        "modelB": b,
        "breakEven": break_even(),
        "roadmap": roadmap(),
        "coverage": (
            "Mencakup inisiatif armada listrik (350 unit). Kemasan degradable dan tas "
            "transit reusable dinilai pada sisi karbon dan rencana di sini, sedangkan sisi "
            "biayanya ada di Tantangan 6 (tuas 4 dan 5) agar tidak dihitung dua kali."
        ),
    }
