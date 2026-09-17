"""EV Fleet Benefit-Cost Analysis (BCA) — konversi armada ICE → EV.

Menjawab permintaan studi kasus akan "roadmap + benefit-cost analysis" untuk
inisiatif sustainability (kpiTargets: "Armada bersih 0% → roadmap 3 fase;
14.180 basis"). Engine ini dibangun dengan prinsip: **data nyata pasar
dipisahkan dari asumsi operasional**.

Prinsip perekayasaan angka (lihat `references`):
  1. Harga BBM nasional = Pertamax **capacity-weighted** atas footprint 23 hub
     GC (bukan harga satu provinsi yang dipilih arbitrer). Basis kapasitas
     Table 1 (5,098 jt paket/hari) → satu benchmark turunan jaringan.
  2. Tarif listrik nasional = PLN golongan bisnis B-2/TR (berlaku nasional).
  3. Benchmark kendaraan dari harga pasar Indonesia: EV (Polytron Fox 200) &
     ICE (Honda BeAT) sebagai referensi, BUKAN quotation fleet GC.
  4. Skema **Battery-as-a-Service (BaaS)**: baterai disewa (recurring cost),
     sehingga risiko penggantian baterai masuk operating cost — tidak
     dihilangkan maupun dikarang sebagai "battery replacement Year 5".
  5. Semua parameter operasional (utilisasi, efisiensi, charging loss,
     discount rate) = **ASUMSI TIM**, di-skema-test (bukan dipresentasikan
     sebagai fakta). Maintenance saving di luar headline (=0) karena data
     aktual fleet tidak tersedia.

Output:
  * 3 skenario (Conservative/Base/Upside) dengan arus kas **per tahun Y0–Y5**.
  * BCR (simple & discounted), NPV, ROI, payback, break-even utilisasi.
  * CO₂ operasional tahunan & 5-tahunan.
  * Stress-test `replacement` vs `incremental` (fleet tambahan) untuk ketiga
    skenario + tabel sensitivitas utilisasi (break-even).
  * **Roadmap 3 fase** konversi parsial armada kasus (12.500 motor) — menghubung-
    kan rekomendasi ke basis armada nyata.

Catatan epistemik: nilai benchmark pasar dapat berbeda per waktu/vendor; semua
angka non-kasus berlabel dan dapat di-override via API untuk eksplorasi.
"""
from __future__ import annotations

import math
from typing import Any

from app.db.loader import load
from app.ml.metrics import clamp

# ── 1. Benchmark nasional (data pasar — bukan asumsi operasional) ─────────────
# Harga Pertamax regional (IDR/L, Sep 2026, rentang nasional Rp15.950–16.650).
# Nilai per region = midpoint region; di-weight oleh kapasitas hub (Table 1)
# sehingga menghasilkan SATU benchmark jaringan GC (bukan harga provinsi).
PERTAMAX_BY_REGION_IDR = {
    "Java": 16150.0,
    "Bali & Nusa Tenggara": 16300.0,
    "Sumatra": 16500.0,
    "Kalimantan": 16400.0,
    "Sulawesi": 16350.0,
    "Maluku & Papua": 16650.0,
}
# Fallback bila region tak terpetakan (midpoint rentang nasional).
PERTAMAX_FALLBACK_IDR = 16250.0

# Tarif listrik PLN bisnis B-2/TR 6.600 VA–200 kVA (berlaku nasional, Jul 2026).
PLN_TARIFF_IDR_PER_KWH = 1444.70

# Benchmark kendaraan (harga pasar referensi, OTR, sebelum diskon).
# EV = Polytron Fox 200 (rata-rata harga regional resmi).
EV_UNIT_PRICE_IDR = 19_225_000.0
EV_BATTERY_KWH = 1.94
EV_CLAIMED_RANGE_KM = 85.0
# ICE = Honda BeAT current starting price (OTR Jakarta/Tangerang).
ICE_UNIT_PRICE_IDR = 19_577_000.0

# Battery-as-a-Service: sewa baterai Fox 200 (pasar: Rp125.000/bln).
BATTERY_LEASE_IDR_PER_MONTH = 125_000.0
BATTERY_LEASE_IDR_PER_YEAR = BATTERY_LEASE_IDR_PER_MONTH * 12.0  # Rp1,5 jt/unit/th

# ── 2. Faktor emisi (data publik) ────────────────────────────────────────────
# IPCC 2006 motor gasoline ≈ 2,30 kgCO2/L (well-scope operational, bukan LCA).
GASOLINE_CO2_KG_PER_L = 2.30
# Intensitas emisi pembangkitan listrik PLN 2024 ≈ 0,774 tCO2e/MWh = 0,774 kg/kWh.
GRID_CO2_KG_PER_KWH = 0.774

# ── 3. Asumsi operasional (ASUMSI TIM — di-skema-test, dilabel) ───────────────
# Tiap skenario: jarak/unit/hari, efisiensi ICE (km/L), konsumsi EV (Wh/km),
# charging loss (fraksi). Discount rate & hari operasi sama lintas skenario.
SCENARIO_ASSUMPTIONS: dict[str, dict[str, float]] = {
    "conservative": {"distanceKmDay": 40.0, "iceEfficiencyKmPerL": 45.0, "evWhPerKm": 27.0, "chargingLoss": 0.20},
    "base": {"distanceKmDay": 60.0, "iceEfficiencyKmPerL": 50.0, "evWhPerKm": 23.0, "chargingLoss": 0.15},
    "upside": {"distanceKmDay": 80.0, "iceEfficiencyKmPerL": 55.0, "evWhPerKm": 22.0, "chargingLoss": 0.10},
}
SCENARIO_LABEL = {"conservative": "Konservatif", "base": "Base", "upside": "Upside"}
SCENARIO_ORDER = ("conservative", "base", "upside")
OPERATING_DAYS = 365.0            # kasus menyebut 365-day operation
DISCOUNT_RATE = 0.10              # asumsi tim (uniform)
HORIZON_YEARS = 5

# Unit EV default = target clean-energy armada kasus (fleet.evTarget = 200).
DEFAULT_EV_UNITS = 200.0
# Titik charging engineer allowance per titik (IDR, asumsi tim — BUKAN quotation
# vendor). Rp100 jt untuk ~60 titik → dipatok per-titik agar biaya infra SKALA
# dengan jumlah titik (bukan flat), sehingga sensitif terhadap utilisasi/unit.
CHARGING_POINT_COST_IDR = 100_000_000.0 / 60.0
# Implementasi + pelatihan (IDR, asumsi tim).
IMPLEMENTATION_TRAINING_IDR = 30_000_000.0
# Charger Fox 200 (450 W) & jendela charging 12 jam (spesifikasi produk).
CHARGER_KW = 0.45
CHARGING_WINDOW_HOURS = 12.0

# Optional upside maintenance (benchmark publik, DI LUAR headline karena data
# maintenance aktual fleet GC tidak tersedia). Rp720.000/unit/tahun.
MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR = 720_000.0

# ── 4. Roadmap 3 fase (basis armada kasus) ───────────────────────────────────
# Kasus: kpiTargets "Armada bersih 0% → roadmap 3 fase"; fleet.motorcycles=12.500.
# Fase = target kumulatif unit EV pada akhir fase (fraksi dari basis motor).
ROADMAP_PHASES = (
    {"phase": 1, "label": "Pilot", "monthFrom": 0, "monthTo": 12, "cumulativeUnitsFrac": 0.05,
     "note": "Pilot 1 kota padat (Jadetabek) — validasi utilisasi, charging, BaaS."},
    {"phase": 2, "label": "Scale", "monthFrom": 12, "monthTo": 30, "cumulativeUnitsFrac": 0.20,
     "note": "Replikasi ke kota besar ber-utilisasi tinggi (Jawa, Sumatra)."},
    {"phase": 3, "label": "Broaden", "monthFrom": 30, "monthTo": 60, "cumulativeUnitsFrac": 0.40,
     "note": "Perluasan bertahap ke hub regional; sisanya menunggu utilisasi tervalidasi."},
)


def _pertamax_national() -> dict[str, Any]:
    """Harga Pertamax nasional = rata-rata berbobot kapasitas hub (Table 1).

    P_national = Σ(capacity_i × harga_i) / Σ(capacity_i). Ini benchmark turunan
    footprint jaringan GC, bukan harga resmi tunggal Pertamax nasional.
    """
    hubs = load()["hubs"]
    total_cap = sum(float(h.get("capacityM", 0.0)) for h in hubs) or 1.0
    weighted = 0.0
    by_region: dict[str, float] = {}
    for h in hubs:
        cap = float(h.get("capacityM", 0.0))
        price = PERTAMAX_BY_REGION_IDR.get(h.get("region", ""), PERTAMAX_FALLBACK_IDR)
        weighted += cap * price
        by_region[h.get("region", "")] = by_region.get(h.get("region", ""), 0.0) + cap
    return {
        "priceIdrPerL": round(weighted / total_cap, 0),
        "totalCapacityM": round(total_cap, 3),
        "method": "capacity-weighted across 23 national hubs (Table 1)",
        "rangeNationalIdrPerL": [15950, 16650],
        "byRegionCapacityM": {k: round(v, 3) for k, v in by_region.items()},
    }


def _fleet_basis() -> dict[str, Any]:
    """Basis armada dari data kasus (untuk konteks roadmap)."""
    fleet = load()["fleet"]
    moto = int(fleet.get("motorcycles", 0))
    ev_target = int(fleet.get("evTarget", 0))
    return {
        "motorcycles": moto,
        "totalArmada": int(fleet.get("totalArmada", 0)),
        "evTarget": ev_target,
        "evTargetPctOfMotor": round(ev_target / moto * 100, 2) if moto else 0.0,
        "lastMileMotorPct": fleet.get("lastMileMotorPct", 0),
    }


def _cashflow_series(initial_investment: float, net_annual: float, discount: float) -> dict[str, Any]:
    """Arus kas per tahun Y0..Yn (nominal + diskon) & kumulatif.

    Y0 = −initialInvestment (murni capex, operasi belum berjalan); Y1..n =
    netAnnualSaving. Mengembalikan baris per tahun untuk tabel/grafik frontend.
    """
    rows: list[dict[str, Any]] = [
        {"year": 0, "netCashFlowIdr": round(-initial_investment, 0), "discountedIdr": round(-initial_investment, 0), "cumulativeIdr": round(-initial_investment, 0)}
    ]
    cum_nominal = -initial_investment
    cum_disc = -initial_investment
    for y in range(1, HORIZON_YEARS + 1):
        disc = net_annual / (1.0 + discount) ** y
        cum_nominal += net_annual
        cum_disc += disc
        rows.append(
            {
                "year": y,
                "netCashFlowIdr": round(net_annual, 0),
                "discountedIdr": round(disc, 0),
                "cumulativeIdr": round(cum_nominal, 0),
                "cumulativeDiscountedIdr": round(cum_disc, 0),
            }
        )
    return {
        "rows": rows,
        "totalNetIdr": round(cum_nominal, 0),
        "npvIdr": round(cum_disc, 0),
    }


def _scenario(
    key: str,
    units: float,
    pertamax: float,
    include_maintenance: bool,
    replacement: bool,
    distance_override: float | None = None,
    *,
    discount: float = DISCOUNT_RATE,
    tariff: float = PLN_TARIFF_IDR_PER_KWH,
    battery_lease_year: float = BATTERY_LEASE_IDR_PER_YEAR,
    ev_price: float = EV_UNIT_PRICE_IDR,
    ice_price: float = ICE_UNIT_PRICE_IDR,
) -> dict[str, Any]:
    """Hitung satu skenario operasional penuh (annual → 5-tahun → KPI)."""
    a = SCENARIO_ASSUMPTIONS[key]
    dist_day = distance_override if distance_override is not None else a["distanceKmDay"]
    ice_kmpl = a["iceEfficiencyKmPerL"]
    ev_wh_km = a["evWhPerKm"]
    loss = a["chargingLoss"]

    # ── Jarak tahunan ──
    annual_km = units * dist_day * OPERATING_DAYS

    # ── Sisi ICE (benefit = fuel cost yang dihindari) ──
    ice_liters = annual_km / ice_kmpl if ice_kmpl else 0.0
    ice_fuel_cost = ice_liters * pertamax

    # ── Sisi EV (biaya energi) ──
    ev_kwh = annual_km * (ev_wh_km / 1000.0) * (1.0 + loss)
    ev_energy_cost = ev_kwh * tariff

    # ── BaaS battery lease (recurring, sudah termasuk risiko penggantian) ──
    battery_lease = units * battery_lease_year

    # ── Maintenance opsional (di luar headline) ──
    maintenance_saving = units * MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR if include_maintenance else 0.0

    net_annual_saving = ice_fuel_cost - ev_energy_cost - battery_lease + maintenance_saving

    # ── Initial investment ──
    # Replacement counterfactual: EV menggantikan ICE yang memang akan dibeli →
    # selisih harga kendaraan = exposure inkremental (bisa negatif bila EV
    # benchmark lebih murah). Incremental: tak ada ICE yang dihindari → seluruh
    # harga EV jadi capex.
    ev_vehicle_cost = units * ev_price
    ice_vehicle_avoided = units * ice_price if replacement else 0.0
    vehicle_delta = ev_vehicle_cost - ice_vehicle_avoided
    # Titik charging diskalakan dari kebutuhan energi harian skenario ini.
    daily_kwh = ev_kwh / OPERATING_DAYS if OPERATING_DAYS else 0.0
    charge_points = max(1, _ceil(daily_kwh / (CHARGER_KW * CHARGING_WINDOW_HOURS)))
    infra = charge_points * CHARGING_POINT_COST_IDR
    initial_investment = vehicle_delta + infra + IMPLEMENTATION_TRAINING_IDR

    # ── BCR (simple, tanpa diskon) ──
    fuel_benefit_5y = ice_fuel_cost * HORIZON_YEARS
    total_cost_5y = initial_investment + (ev_energy_cost + battery_lease) * HORIZON_YEARS
    bcr_simple = _safe_div(fuel_benefit_5y, total_cost_5y)

    # ── Discounted BCR & NPV ──
    pv_factor = sum(1.0 / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
    pv_recurring_cost = (ev_energy_cost + battery_lease) * pv_factor
    pv_fuel_benefit = ice_fuel_cost * pv_factor
    pv_cost = initial_investment + pv_recurring_cost
    bcr_discounted = _safe_div(pv_fuel_benefit, pv_cost)
    npv = -initial_investment + net_annual_saving * pv_factor

    # ── ROI 5-tahun ──
    total_benefit_5y = fuel_benefit_5y + maintenance_saving * HORIZON_YEARS
    roi_5y = _safe_div(total_benefit_5y - total_cost_5y, total_cost_5y) * 100.0

    # ── Payback (tahun; bulan = ×12) ──
    # Bila initial investment ≤ 0 (benchmark EV lebih murah dari ICE yang
    # dihindari → tak ada exposure awal) payback = 0 (langsung menguntungkan).
    if net_annual_saving > 0:
        payback_years = max(0.0, initial_investment / net_annual_saving)
    else:
        payback_years = None

    # ── CO2 operasional (bukan lifecycle assessment) ──
    ice_co2_kg = ice_liters * GASOLINE_CO2_KG_PER_L
    ev_co2_kg = ev_kwh * GRID_CO2_KG_PER_KWH
    co2_saved_kg = ice_co2_kg - ev_co2_kg

    return {
        "key": key,
        "label": SCENARIO_LABEL[key],
        "assumptions": {
            "units": round(units, 0),
            "operatingDays": OPERATING_DAYS,
            "distanceKmPerUnitDay": dist_day,
            "iceEfficiencyKmPerL": ice_kmpl,
            "evWhPerKm": ev_wh_km,
            "chargingLossPct": round(loss * 100, 1),
            "discountRatePct": round(discount * 100, 1),
        },
        "annual": {
            "distanceKm": round(annual_km, 0),
            "iceLiters": round(ice_liters, 0),
            "iceFuelCostIdr": round(ice_fuel_cost, 0),
            "evKwh": round(ev_kwh, 0),
            "evEnergyCostIdr": round(ev_energy_cost, 0),
            "batteryLeaseIdr": round(battery_lease, 0),
            "maintenanceSavingIdr": round(maintenance_saving, 0),
            "netAnnualSavingIdr": round(net_annual_saving, 0),
        },
        "capex": {
            "evVehicleCostIdr": round(ev_vehicle_cost, 0),
            "iceVehicleAvoidedIdr": round(ice_vehicle_avoided, 0),
            "vehicleDeltaIdr": round(vehicle_delta, 0),
            "chargingPoints": charge_points,
            "dailyKwhDemand": round(daily_kwh, 1),
            "chargerKw": CHARGER_KW,
            "chargingWindowHours": CHARGING_WINDOW_HOURS,
            "chargingInfraIdr": round(infra, 0),
            "implementationTrainingIdr": round(IMPLEMENTATION_TRAINING_IDR, 0),
            "initialInvestmentIdr": round(initial_investment, 0),
        },
        "kpi": {
            "fuelBenefit5yIdr": round(fuel_benefit_5y, 0),
            "totalCost5yIdr": round(total_cost_5y, 0),
            "bcrSimple": round(bcr_simple, 2),
            "bcrDiscounted": round(bcr_discounted, 2),
            "npvIdr": round(npv, 0),
            "roi5yPct": round(roi_5y, 1),
            "paybackYears": round(payback_years, 3) if payback_years is not None else None,
            "paybackMonths": round(payback_years * 12.0, 2) if payback_years is not None else None,
        },
        "co2": {
            "iceCo2KgYear": round(ice_co2_kg, 0),
            "evCo2KgYear": round(ev_co2_kg, 0),
            "reductionKgYear": round(co2_saved_kg, 0),
            "reductionTonsYear": round(co2_saved_kg / 1000.0, 1),
            "reductionTons5y": round(co2_saved_kg * HORIZON_YEARS / 1000.0, 1),
        },
        "cashflow": _cashflow_series(initial_investment, net_annual_saving, discount),
    }


def ev_bca(
    units: float | None = None,
    pertamax_override: float | None = None,
    include_maintenance: bool = False,
    discount_rate: float | None = None,
    tariff_override: float | None = None,
    battery_lease_override: float | None = None,
    ev_price_override: float | None = None,
    ice_price_override: float | None = None,
) -> dict[str, Any]:
    """BCA armada EV — 3 skenario + KPI finansial & emisi + stress-test + roadmap.

    Args:
        units: jumlah unit EV (default = target kasus 200).
        pertamax_override: override harga BBM (IDR/L); default benchmark nasional.
        include_maintenance: bila True, masukkan maintenance saving benchmark ke
            headline (default False — data aktual fleet tidak tersedia).
        discount_rate: override discount rate (fraksi, mis. 0.10).
        tariff_override: override tarif listrik PLN (IDR/kWh).
        battery_lease_override: override sewa baterai (IDR/unit/tahun).
        ev_price_override: override harga unit EV benchmark (IDR).
        ice_price_override: override harga unit ICE benchmark (IDR).
    """
    u = clamp(units if units is not None else DEFAULT_EV_UNITS, 1.0, 100_000.0, DEFAULT_EV_UNITS)
    nat = _pertamax_national()
    pertamax = clamp(
        pertamax_override if pertamax_override is not None else nat["priceIdrPerL"],
        1_000.0, 100_000.0, nat["priceIdrPerL"],
    )
    disc = clamp(discount_rate if discount_rate is not None else DISCOUNT_RATE, 0.0, 1.0, DISCOUNT_RATE)
    tariff = clamp(tariff_override if tariff_override is not None else PLN_TARIFF_IDR_PER_KWH, 1.0, 100_000.0, PLN_TARIFF_IDR_PER_KWH)
    battery_lease = clamp(
        battery_lease_override if battery_lease_override is not None else BATTERY_LEASE_IDR_PER_YEAR,
        0.0, 1_000_000_000.0, BATTERY_LEASE_IDR_PER_YEAR,
    )
    ev_price = clamp(ev_price_override if ev_price_override is not None else EV_UNIT_PRICE_IDR, 1_000_000.0, 5_000_000_000.0, EV_UNIT_PRICE_IDR)
    ice_price = clamp(ice_price_override if ice_price_override is not None else ICE_UNIT_PRICE_IDR, 1_000_000.0, 5_000_000_000.0, ICE_UNIT_PRICE_IDR)

    common = dict(
        units=u, pertamax=pertamax, include_maintenance=include_maintenance,
        discount=disc, tariff=tariff, battery_lease_year=battery_lease,
        ev_price=ev_price, ice_price=ice_price,
    )

    # Headline = skenario REPLACEMENT (200 EV menggantikan 200 ICE).
    scenarios = {k: _scenario(k, replacement=True, **common) for k in SCENARIO_ORDER}
    # Stress-test: bagaimana bila 200 EV = fleet TAMBAHAN (incremental)?
    incremental = {k: _scenario(k, replacement=False, **common) for k in SCENARIO_ORDER}

    return {
        "engine": "EV Fleet Benefit-Cost Analysis (national benchmarks + BaaS)",
        "note": (
            "Benchmark nasional: Pertamax capacity-weighted atas 23 hub, tarif PLN "
            "B-2/TR nasional, harga pasar EV/ICE Indonesia, battery-as-a-service. "
            "Utilisasi, efisiensi, charging loss, discount rate = ASUMSI TIM "
            "(di-skema-test). Maintenance di luar headline (data fleet tak tersedia)."
        ),
        "references": {
            "pertamax": nat,
            "plnTariffIdrPerKwh": PLN_TARIFF_IDR_PER_KWH,
            "evUnitPriceIdr": EV_UNIT_PRICE_IDR,
            "iceUnitPriceIdr": ICE_UNIT_PRICE_IDR,
            "evBatteryKwh": EV_BATTERY_KWH,
            "evClaimedRangeKm": EV_CLAIMED_RANGE_KM,
            "batteryLeaseIdrPerMonth": BATTERY_LEASE_IDR_PER_MONTH,
            "batteryLeaseIdrPerYear": BATTERY_LEASE_IDR_PER_YEAR,
            "gasolineCo2KgPerL": GASOLINE_CO2_KG_PER_L,
            "gridCo2KgPerKwh": GRID_CO2_KG_PER_KWH,
            "maintenanceBenchmarkIdrPerUnitYear": MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR,
            "chargerKw": CHARGER_KW,
            "chargingWindowHours": CHARGING_WINDOW_HOURS,
        },
        "inputs": {
            "units": round(u, 0),
            "pertamaxIdrPerL": round(pertamax, 0),
            "includeMaintenance": include_maintenance,
            "discountRatePct": round(disc * 100, 1),
            "tariffIdrPerKwh": round(tariff, 2),
            "batteryLeaseIdrPerYear": round(battery_lease, 0),
            "evUnitPriceIdr": round(ev_price, 0),
            "iceUnitPriceIdr": round(ice_price, 0),
            "horizonYears": HORIZON_YEARS,
        },
        "fleetBasis": _fleet_basis(),
        "headline": _headline(scenarios["base"]),
        "scenarios": scenarios,
        "incrementalFleetStressTest": incremental,
        "scenarioComparison": _scenario_comparison(scenarios, incremental),
        "utilizationSensitivity": _utilization_sensitivity(**common),
        "discountRateSensitivity": _discount_rate_sensitivity(**common),
        "roadmap": _roadmap(**common),
        "strategicTakeaway": (
            "Pertanyaan utama bukan 'apakah EV lebih hemat?' (energi EV jauh "
            "lebih murah di seluruh skenario), melainkan 'KAPAN & DI MANA GC "
            "harus mengganti ICE dengan EV?' — ekonomi sangat bergantung pada "
            "utilisasi dan timing penggantian aset. Payback ekstrem pada skenario "
            "replacement TIDAK boleh jadi headline tanpa konteks counterfactual."
        ),
    }


def _headline(base: dict[str, Any]) -> dict[str, Any]:
    """Angka headline yang disarankan untuk slide (skenario base, replacement)."""
    return {
        "label": "Base (replacement, 60 km/hari)",
        "npvIdr": base["kpi"]["npvIdr"],
        "bcrDiscounted": base["kpi"]["bcrDiscounted"],
        "annualNetSavingIdr": base["annual"]["netAnnualSavingIdr"],
        "co2ReductionTonsYear": base["co2"]["reductionTonsYear"],
        "caveat": "Replacement scenario; 60 km/hari = asumsi yang harus divalidasi lewat pilot.",
    }


def _scenario_comparison(replacement: dict[str, Any], incremental: dict[str, Any]) -> list[dict[str, Any]]:
    """Tabel ringkas 3 skenario × mode (replacement & incremental) untuk frontend."""
    rows: list[dict[str, Any]] = []
    for k in SCENARIO_ORDER:
        r = replacement[k]
        i = incremental[k]
        rows.append(
            {
                "key": k,
                "label": SCENARIO_LABEL[k],
                "distanceKmPerUnitDay": r["assumptions"]["distanceKmPerUnitDay"],
                "netAnnualSavingIdr": r["annual"]["netAnnualSavingIdr"],
                "npvIdr": r["kpi"]["npvIdr"],
                "bcrDiscounted": r["kpi"]["bcrDiscounted"],
                "roi5yPct": r["kpi"]["roi5yPct"],
                "paybackYears": r["kpi"]["paybackYears"],
                "co2ReductionTonsYear": r["co2"]["reductionTonsYear"],
                "initialInvestmentIdr": r["capex"]["initialInvestmentIdr"],
                "incrementalNpvIdr": i["kpi"]["npvIdr"],
                "incrementalBcrDiscounted": i["kpi"]["bcrDiscounted"],
                "incrementalPaybackYears": i["kpi"]["paybackYears"],
            }
        )
    return rows


def _utilization_sensitivity(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                            tariff: float, battery_lease_year: float, ev_price: float, ice_price: float) -> dict[str, Any]:
    """Tabel sensitivitas utilisasi (km/unit/hari) untuk replacement & incremental.

    Menjawab langsung "seberapa sensitif ekonomi terhadap utilisasi?" — sekaligus
    menghitung titik utilitas impas (NPV = 0) via interpolasi linear untuk KEDUA
    mode. Breakeven incremental (fleet tambahan) adalah ambang yang paling
    operasional: di bawahnya, membeli EV sebagai armada BARU tidak layak.
    Memakai konsumsi EV & efisiensi ICE base-case, memvariasikan jarak harian saja.
    """
    common = dict(units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                  discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                  ev_price=ev_price, ice_price=ice_price)
    dists = (20.0, 30.0, 40.0, 50.0, 60.0, 80.0, 100.0)

    def _sweep(replacement: bool) -> tuple[list[dict[str, Any]], float | None]:
        rows: list[dict[str, Any]] = []
        breakeven: float | None = None
        prev: tuple[float, float] | None = None
        for dist in dists:
            r = _scenario("base", replacement=replacement, distance_override=dist, **common)
            npv = r["kpi"]["npvIdr"]
            rows.append(
                {
                    "distanceKmPerUnitDay": dist,
                    "annualNetSavingIdr": r["annual"]["netAnnualSavingIdr"],
                    "npvIdr": npv,
                    "bcrDiscounted": r["kpi"]["bcrDiscounted"],
                    "paybackYears": r["kpi"]["paybackYears"],
                    "co2ReductionTonsYear": r["co2"]["reductionTonsYear"],
                    "positiveNpv": npv > 0,
                }
            )
            if prev is not None and breakeven is None and (prev[1] < 0) != (npv < 0) and npv != prev[1]:
                x0, y0 = prev
                breakeven = round(x0 + (0 - y0) * (dist - x0) / (npv - y0), 1)
            prev = (dist, npv)
        return rows, breakeven

    rows, breakeven = _sweep(replacement=True)
    inc_rows, inc_breakeven = _sweep(replacement=False)
    # Breakeven None pada replacement → NPV positif di seluruh rentang uji (EV
    # benchmark ≤ ICE yang dihindari, tak ada exposure awal). Beri keterangan.
    return {
        "metric": "jarak per unit per hari (km)",
        "note": "Konsumsi EV & efisiensi ICE base-case tetap; hanya jarak divariasikan.",
        "breakevenDistanceKmPerUnitDay": breakeven,
        "breakevenIncrementalKmPerUnitDay": inc_breakeven,
        "breakevenNote": (
            "Breakeven replacement tidak ditemukan (NPV positif di semua titik uji) "
            "karena skenario replacement mengasumsikan EV menggantikan pembelian ICE. "
            "Ambang yang paling operasional = breakeven INCREMENTAL."
        ),
        "rows": rows,
        "incrementalRows": inc_rows,
    }


def _discount_rate_sensitivity(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                               tariff: float, battery_lease_year: float, ev_price: float, ice_price: float) -> dict[str, Any]:
    """Sensitivitas NPV terhadap discount rate (8%..20%) — skenario base replacement."""
    rows: list[dict[str, Any]] = []
    for dr in (0.08, 0.10, 0.12, 0.15, 0.18, 0.20):
        r = _scenario("base", replacement=True, units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                      discount=dr, tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price)
        rows.append({"discountRatePct": round(dr * 100, 1), "npvIdr": r["kpi"]["npvIdr"], "bcrDiscounted": r["kpi"]["bcrDiscounted"]})
    return {"metric": "discount rate (%)", "note": "Base replacement; hanya discount rate divariasikan.", "rows": rows}


def _roadmap(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
             tariff: float, battery_lease_year: float, ev_price: float, ice_price: float) -> dict[str, Any]:
    """Roadmap 3 fase konversi parsial armada kasus (12.500 motor) — simulasi.

    Tiap fase memakai skenario base untuk ekonomi unit, tetapi jumlah unit =
    fraksi kumulatif × basis motor. Menghasilkan NPV & CO₂ kumulatif per fase
    sebagai panduan rollout (bukan komitmen capex).
    """
    fleet = _fleet_basis()
    moto = fleet["motorcycles"] or int(DEFAULT_EV_UNITS)
    common = dict(pertamax=pertamax, include_maintenance=include_maintenance,
                  discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                  ev_price=ev_price, ice_price=ice_price)
    phases: list[dict[str, Any]] = []
    prev_units = 0
    for p in ROADMAP_PHASES:
        cum_units = round(moto * p["cumulativeUnitsFrac"] / 10.0) * 10  # bulatkan ke 10 unit
        added = cum_units - prev_units
        # Ekonomi inkremental: jalankan skenario base untuk unit tahap ini (replacement).
        r = _scenario("base", replacement=True, units=float(added), **common)
        phases.append(
            {
                "phase": p["phase"],
                "label": p["label"],
                "monthFrom": p["monthFrom"],
                "monthTo": p["monthTo"],
                "addedUnits": added,
                "cumulativeUnits": cum_units,
                "cumulativeUnitsPctOfMotor": round(cum_units / moto * 100, 1) if moto else 0.0,
                "initialInvestmentIdr": r["capex"]["initialInvestmentIdr"],
                "netAnnualSavingIdr": r["annual"]["netAnnualSavingIdr"],
                "npvIdr": r["kpi"]["npvIdr"],
                "co2ReductionTonsYear": r["co2"]["reductionTonsYear"],
                "note": p["note"],
            }
        )
        prev_units = cum_units
    return {
        "basisMotorcycles": moto,
        "note": (
            "Simulasi rollout 3 fase atas basis 12.500 motor (data kasus). Ekonomi "
            "per unit memakai skenario base replacement; unit per fase = fraksi "
            "kumulatif. Ini panduan bertahap, bukan komitmen capex serentak."
        ),
        "phases": phases,
        "totalCumulativeUnits": prev_units,
        "totalCumulativeUnitsPct": round(prev_units / moto * 100, 1) if moto else 0.0,
    }


# ── util numerik kecil ────────────────────────────────────────────────────────
def _safe_div(a: float, b: float) -> float:
    return (a / b) if b else 0.0


def _ceil(x: float) -> int:
    return int(math.ceil(x))
