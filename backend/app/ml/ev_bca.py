"""EV Fleet Benefit-Cost Analysis (BCA) — konversi armada ICE → EV.

Menjawab permintaan studi kasus akan "roadmap + benefit-cost analysis" untuk
inisiatif sustainability (kpiTargets: "Armada bersih 0% → roadmap 3 fase;
14.180 basis"). Engine ini dibangun dengan prinsip: **data nyata pasar
dipisahkan dari asumsi operasional**.

Prinsip perekayasaan angka (lihat `references`):
  1. Harga BBM nasional = Pertamax **capacity-weighted** atas footprint 23 hub
     GC (bukan harga satu provinsi yang dipilih arbitrer). Basis kapasitas
     Table 1 (5,098 jt paket/hari) → satu benchmark turunan jaringan
     **Rp16.125/L**.
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

Headline yang direkomendasikan (skenario base, replacement, 200 unit):
  * NPV @10% ≈ **Rp3,52 miliar**; Discounted BCR ≈ **2,92×**
  * Annual net saving ≈ **Rp945 juta**; CO₂ reduction ≈ **112 t/tahun**
  dengan caveat: "Replacement scenario; 60 km/hari = asumsi yang harus
  divalidasi lewat pilot."

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
# Nilai per region = benchmark regional (naik dari barat → timur); di-weight oleh
# kapasitas hub (Table 1) sehingga menghasilkan SATU benchmark jaringan GC
# (bukan harga satu provinsi yang dipilih arbitrer).
#
# Hasil berbobot = Rp16.125/L (lihat `_pertamax_national`): "derived GC-network
# national benchmark", bukan harga resmi tunggal Pertamax nasional.
PERTAMAX_BY_REGION_IDR = {
    "Java": 16000.0,
    "Sumatra": 16200.0,
    "Bali & Nusa Tenggara": 16250.0,
    "Kalimantan": 16250.0,
    "Sulawesi": 16300.0,
    "Maluku & Papua": 16550.0,
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

# ── 2b. Asumsi emisi SIKLUS HIDUP (SIMULASI — bukan LCA tersertifikasi) ───────
# Hanya untuk blok `lifecycleEmissions`; semua angka = order-of-magnitude tim,
# dilabel jelas. Produksi motor ICE (tanpa bbm) & produksi EV (rangka + baterai).
ICE_MANUFACTURING_CO2_KG_PER_UNIT = 450.0   # produksi motor ICE (order-of-magnitude)
EV_MANUFACTURING_CO2_KG_PER_UNIT = 700.0    # produksi rangka/motor EV — TANPA baterai (baterai dihitung terpisah)
EV_BATTERY_MANUFACTURING_CO2_KG_PER_KWH = 90.0  # ~ kgCO2/kWh baterai (estimasi literatur)

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
# Titik charging engineer allowance (IDR, asumsi tim — BUKAN quotation vendor).
# Base-case: Rp100 jt untuk ~60 titik charging (dipatok pada skenario base),
# dengan buffer konservatif untuk risiko under-utilization/redundansi di skenario
# conservative (Rp120 jt) dan optimasi biaya di upside (Rp80 jt). Skala titik
# aktual tetap dihitung & diekspos untuk transparansi (lihat `chargingPoints`).
CHARGING_INFRA_BY_SCENARIO_IDR = {
    "conservative": 120_000_000.0,
    "base": 100_000_000.0,
    "upside": 80_000_000.0,
}
# Implementasi + pelatihan (IDR, asumsi tim).
IMPLEMENTATION_TRAINING_IDR = 30_000_000.0
# Charger Fox 200 (450 W) & jendela charging 12 jam (spesifikasi produk).
CHARGER_KW = 0.45
CHARGING_WINDOW_HOURS = 12.0

# Optional upside maintenance (benchmark publik, DI LUAR headline karena data
# maintenance aktual fleet GC tidak tersedia). Rp720.000/unit/tahun.
MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR = 720_000.0
# Benchmark maintenance sepeda motor ICE (publik, order-of-magnitude) — dipakai
# HANYA untuk TCO/km & blok lifecycle (dilabel asumsi), bukan headline.
ICE_MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR = 1_200_000.0

# ── 3b. Konfigurasi Monte Carlo (SIMULASI) ───────────────────────────────────
# Distribusi tiap variabel acak (deterministik via seed). (mean, sd, lo, hi).
# Base-case dipakai sebagai mean; sd = ketidakpastian tim.
MONTE_CARLO_SPECS: dict[str, dict[str, float]] = {
    "distanceKmDay": {"mean": 60.0, "sd": 8.0, "lo": 30.0, "hi": 90.0},
    "pertamaxIdrPerL": {"mean": 16125.0, "sd": 250.0, "lo": 15950.0, "hi": 16650.0},
    "tariffIdrPerKwh": {"mean": 1444.7, "sd": 90.0, "lo": 1200.0, "hi": 1800.0},
    "batteryLeaseYearIdr": {"mean": 1_500_000.0, "sd": 250_000.0, "lo": 1_000_000.0, "hi": 1_800_000.0},
    "evWhPerKm": {"mean": 23.0, "sd": 2.5, "lo": 18.0, "hi": 30.0},
    "iceEfficiencyKmPerL": {"mean": 50.0, "sd": 3.0, "lo": 42.0, "hi": 58.0},
}

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


def _cashflow_series(initial_investment: float, net_annual: float, discount: float,
                     net_by_year: list[float] | None = None) -> dict[str, Any]:
    """Arus kas per tahun Y0..Yn (nominal + diskon) & kumulatif.

    Y0 = −initialInvestment (murni capex, operasi belum berjalan); Y1..n =
    netAnnualSaving. `net_by_year` (opsional) mengizinkan arus kas yang
    **bereskalasi** (mis. harga BBM/listrik tumbuh tiap tahun); bila None, arus
    kas seragam = net_annual (perilaku default/headline). Mengembalikan baris per
    tahun untuk tabel/grafik frontend.
    """
    rows: list[dict[str, Any]] = [
        {"year": 0, "netCashFlowIdr": round(-initial_investment, 0), "discountedIdr": round(-initial_investment, 0), "cumulativeIdr": round(-initial_investment, 0)}
    ]
    cum_nominal = -initial_investment
    cum_disc = -initial_investment
    for y in range(1, HORIZON_YEARS + 1):
        net_y = net_by_year[y - 1] if net_by_year is not None else net_annual
        disc = net_y / (1.0 + discount) ** y
        cum_nominal += net_y
        cum_disc += disc
        rows.append(
            {
                "year": y,
                "netCashFlowIdr": round(net_y, 0),
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
    fuel_growth: float = 0.0,
    elec_growth: float = 0.0,
    battery_growth: float = 0.0,
) -> dict[str, Any]:
    """Hitung satu skenario operasional penuh (annual → 5-tahun → KPI).

    `fuel_growth`/`elec_growth`/`battery_growth` = laju eskalasi harga tahunan
    (fraksi). Default 0 → arus kas seragam (headline). Bila >0, benefit/biaya
    tumbuh tiap tahun sehingga NPV/BCR memakai arus kas bereskalasi.
    """
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

    # ── Arus kas per tahun Y1..Yn (bereskalasi bila growth > 0) ──
    # Basis: tahun-1 = nilai tanpa eskalasi; tahun t = nilai × (1+g)^(t-1).
    net_by_year: list[float] = []
    fuel_by_year: list[float] = []
    cost_by_year: list[float] = []
    for t in range(1, HORIZON_YEARS + 1):
        gf = (1.0 + fuel_growth) ** (t - 1)
        ge = (1.0 + elec_growth) ** (t - 1)
        gb = (1.0 + battery_growth) ** (t - 1)
        f_t = ice_fuel_cost * gf
        c_t = ev_energy_cost * ge + battery_lease * gb
        fuel_by_year.append(f_t)
        cost_by_year.append(c_t)
        net_by_year.append(f_t - c_t + maintenance_saving * gf)

    # ── Initial investment ──
    # Replacement counterfactual: EV menggantikan ICE yang memang akan dibeli →
    # selisih harga kendaraan = exposure inkremental (bisa negatif bila EV
    # benchmark lebih murah). Incremental: tak ada ICE yang dihindari → seluruh
    # harga EV jadi capex.
    ev_vehicle_cost = units * ev_price
    ice_vehicle_avoided = units * ice_price if replacement else 0.0
    vehicle_delta = ev_vehicle_cost - ice_vehicle_avoided
    # Titik charging dihitung dari kebutuhan energi harian skenario ini (dibagi
    # kapasitas charger × jendela charging) dan DIEKSPOS untuk transparansi.
    daily_kwh = ev_kwh / OPERATING_DAYS if OPERATING_DAYS else 0.0
    charge_points = max(1, _ceil(daily_kwh / (CHARGER_KW * CHARGING_WINDOW_HOURS)))
    # Allowance infra = asumsi tim per skenario (buffer konservatif di skenario
    # under-utilization; BUKAN quotation vendor). Lihat CHARGING_INFRA_BY_SCENARIO_IDR.
    infra = CHARGING_INFRA_BY_SCENARIO_IDR.get(key, CHARGING_INFRA_BY_SCENARIO_IDR["base"])
    initial_investment = vehicle_delta + infra + IMPLEMENTATION_TRAINING_IDR

    # ── BCR (simple, tanpa diskon) — jumlah nominal arus kas 5 tahun ──
    fuel_benefit_5y = sum(fuel_by_year)
    total_cost_5y = initial_investment + sum(cost_by_year)
    bcr_simple = _safe_div(fuel_benefit_5y, total_cost_5y)

    # ── Discounted BCR & NPV (arus kas bereskalasi didiskon) ──
    pv_fuel_benefit = sum(fuel_by_year[t - 1] / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
    pv_recurring_cost = sum(cost_by_year[t - 1] / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
    pv_cost = initial_investment + pv_recurring_cost
    bcr_discounted = _safe_div(pv_fuel_benefit, pv_cost)
    pv_net = sum(net_by_year[t - 1] / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
    npv = -initial_investment + pv_net

    # ── ROI 5-tahun ──
    total_benefit_5y = fuel_benefit_5y + maintenance_saving * sum((1.0 + fuel_growth) ** (t - 1) for t in range(1, HORIZON_YEARS + 1))
    roi_5y = _safe_div(total_benefit_5y - total_cost_5y, total_cost_5y) * 100.0

    # ── Payback (tahun; bulan = ×12) ──
    # Bila initial investment ≤ 0 (benchmark EV lebih murah dari ICE yang
    # dihindari → tak ada exposure awal) payback = 0 (langsung menguntungkan).
    # Memakai net tahun-1 (paling konservatif bila arus kas tumbuh).
    net_y1 = net_by_year[0] if net_by_year else net_annual_saving
    if net_y1 > 0:
        payback_years = max(0.0, initial_investment / net_y1)
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
            "fuelGrowthPct": round(fuel_growth * 100, 2),
            "elecGrowthPct": round(elec_growth * 100, 2),
            "batteryGrowthPct": round(battery_growth * 100, 2),
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
            "netCashFlowY1Idr": round(net_y1, 0),
            "netCashFlowYLastIdr": round(net_by_year[-1] if net_by_year else net_annual_saving, 0),
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
        "cashflow": _cashflow_series(initial_investment, net_annual_saving, discount, net_by_year),
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
    fuel_growth: float | None = None,
    elec_growth: float | None = None,
    battery_growth: float | None = None,
    monte_carlo_runs: int | None = None,
    seed: int | None = None,
) -> dict[str, Any]:
    """BCA armada EV — 3 skenario + KPI + stress-test + roadmap + simulasi lanjut.

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
        fuel_growth: eskalasi harga BBM tahunan (fraksi; default 0 = datar).
        elec_growth: eskalasi tarif listrik tahunan (fraksi; default 0).
        battery_growth: eskalasi sewa baterai tahunan (fraksi; default 0).
        monte_carlo_runs: jumlah iterasi Monte Carlo (default 2000; max 20000).
        seed: seed RNG Monte Carlo (default 42; deterministik & reproducible).
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
    # Eskalasi harga tahunan (fraksi; dibatasi ±30%/th agar masuk akal).
    fg = clamp(fuel_growth if fuel_growth is not None else 0.0, -0.30, 0.30, 0.0)
    eg = clamp(elec_growth if elec_growth is not None else 0.0, -0.30, 0.30, 0.0)
    bg = clamp(battery_growth if battery_growth is not None else 0.0, -0.30, 0.30, 0.0)
    mc_runs = int(clamp(monte_carlo_runs if monte_carlo_runs is not None else 2000, 100, 20000, 2000))
    mc_seed = int(clamp(seed if seed is not None else 42, 0, 2_147_483_647, 42))

    common = dict(
        units=u, pertamax=pertamax, include_maintenance=include_maintenance,
        discount=disc, tariff=tariff, battery_lease_year=battery_lease,
        ev_price=ev_price, ice_price=ice_price,
        fuel_growth=fg, elec_growth=eg, battery_growth=bg,
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
            "fuelGrowthPct": round(fg * 100, 2),
            "elecGrowthPct": round(eg * 100, 2),
            "batteryGrowthPct": round(bg * 100, 2),
            "monteCarloRuns": mc_runs,
            "seed": mc_seed,
        },
        "fleetBasis": _fleet_basis(),
        "headline": _headline(scenarios["base"]),
        "scenarios": scenarios,
        "incrementalFleetStressTest": incremental,
        "scenarioComparison": _scenario_comparison(scenarios, incremental),
        "utilizationSensitivity": _utilization_sensitivity(**common),
        "discountRateSensitivity": _discount_rate_sensitivity(**common),
        "breakevens": _breakevens(**common),
        "tcoPerKm": _tco_per_km(**common),
        "tornadoSensitivity": _tornado_sensitivity(**common),
        "monteCarlo": _monte_carlo(runs=mc_runs, seed=mc_seed, **common),
        "hubDeployment": _hub_deployment(**common),
        "lifecycleEmissions": _lifecycle_emissions(**common),
        "escalationPreview": _escalation_preview(u=u, pertamax=pertamax, include_maintenance=include_maintenance,
                                                 discount=disc, tariff=tariff, battery_lease_year=battery_lease,
                                                 ev_price=ev_price, ice_price=ice_price),
        "roadmap": _roadmap(**common),
        "roadmapProgramCashflow": _roadmap_program_cashflow(**common),
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
                            tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                            fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Tabel sensitivitas utilisasi (km/unit/hari) untuk replacement & incremental.

    Menjawab langsung "seberapa sensitif ekonomi terhadap utilisasi?" — sekaligus
    menghitung titik utilitas impas (NPV = 0) via interpolasi linear untuk KEDUA
    mode. Breakeven incremental (fleet tambahan) adalah ambang yang paling
    operasional: di bawahnya, membeli EV sebagai armada BARU tidak layak.
    Memakai konsumsi EV & efisiensi ICE base-case, memvariasikan jarak harian saja.
    """
    common = dict(units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                  discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                  ev_price=ev_price, ice_price=ice_price,
                  fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
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
                               tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                               fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Sensitivitas NPV terhadap discount rate (8%..20%) — skenario base replacement."""
    rows: list[dict[str, Any]] = []
    for dr in (0.08, 0.10, 0.12, 0.15, 0.18, 0.20):
        r = _scenario("base", replacement=True, units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                      discount=dr, tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price,
                      fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
        rows.append({"discountRatePct": round(dr * 100, 1), "npvIdr": r["kpi"]["npvIdr"], "bcrDiscounted": r["kpi"]["bcrDiscounted"]})
    return {"metric": "discount rate (%)", "note": "Base replacement; hanya discount rate divariasikan.", "rows": rows}


def _roadmap(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
             tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
             fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Roadmap 3 fase konversi parsial armada kasus (12.500 motor) — simulasi.

    Tiap fase memakai skenario base untuk ekonomi unit, tetapi jumlah unit =
    fraksi kumulatif × basis motor. Menghasilkan NPV & CO₂ kumulatif per fase
    sebagai panduan rollout (bukan komitmen capex).
    """
    fleet = _fleet_basis()
    moto = fleet["motorcycles"] or int(DEFAULT_EV_UNITS)
    common = dict(pertamax=pertamax, include_maintenance=include_maintenance,
                  discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                  ev_price=ev_price, ice_price=ice_price,
                  fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
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


# ── Simulasi lanjut (breakeven, tornado, Monte Carlo, TCO, hub, lifecycle) ───
def _pv_factor(discount: float) -> float:
    """Faktor anuitas PV untuk horizon 5 tahun (dipakai reverse-solve)."""
    return sum(1.0 / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))


def _breakevens(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Reverse-solve ambang impas (NPV = 0) — "seberapa jauh bisa meleset?".

    Semua dihitung pada skenario BASE dengan mode yang paling relevan:
      * Max sewa baterai (BaaS) yang membuat NPV = 0 (replacement & incremental).
      * Min utilisasi (km/hari) agar NPV = 0 (replacement & incremental, analitik).
      * Harga Pertamax impas pada fleet tambahan (titik di mana EV baru mulai layak).
      * Harga unit EV maksimum agar replacement tetap NPV = 0 (premium yang bisa ditoleransi).
    """
    def scen(replacement: bool, **over: Any) -> dict[str, Any]:
        kw = dict(units=units, pertamax=pertamax, include_maintenance=include_maintenance, discount=discount,
                  tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price,
                  fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
        kw.update(over)
        return _scenario("base", replacement=replacement, **kw)

    rep = scen(True)
    inc = scen(False)

    # PV benefit maintenance (hanya bila include_maintenance): benefit tetap
    # tahunan × eskalasi fuel_growth. Harus ikut di sisi benefit pada SEMUA
    # reverse-solve agar ambang impas benar-benar menghasilkan NPV = 0.
    def maint_pv() -> float:
        if not include_maintenance:
            return 0.0
        per_year = units * MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR
        return sum(per_year * (1.0 + fuel_growth) ** (t - 1) / (1.0 + discount) ** t
                   for t in range(1, HORIZON_YEARS + 1))

    mpv = maint_pv()

    # Max sewa baterai (IDR/unit/tahun): net = fuel + maint − elec − L (L = units × lease).
    # NPV = −I + Σ (net)/(1+r)^t = 0 → L* = fuel + maint − elec − I / pv  (growth=0 pada
    # komponen yang di-solve; bila ada growth, gunakan PV efektif per komponen).
    def max_battery_lease(s: dict[str, Any]) -> float | None:
        fuel_pv = sum(s["annual"]["iceFuelCostIdr"] * (1.0 + fuel_growth) ** (t - 1) / (1.0 + discount) ** t
                      for t in range(1, HORIZON_YEARS + 1))
        elec_pv = sum(s["annual"]["evEnergyCostIdr"] * (1.0 + elec_growth) ** (t - 1) / (1.0 + discount) ** t
                      for t in range(1, HORIZON_YEARS + 1))
        i = s["capex"]["initialInvestmentIdr"]
        # lease_pv = Σ L_year1×(1+bg)^(t-1)/(1+r)^t ; L_year1 = units × lease_year1
        lease_pv_per_unit = sum(units * (1.0 + battery_growth) ** (t - 1) / (1.0 + discount) ** t
                                for t in range(1, HORIZON_YEARS + 1))
        avail = fuel_pv + mpv - elec_pv - i
        if lease_pv_per_unit <= 0:
            return None
        return round(avail / lease_pv_per_unit, 0)

    # Min utilisasi (analitik). Perhatikan: fuel & listrik SEBANDING jarak, tetapi
    # sewa baterai (BaaS) = biaya TETAP (tak bergantung jarak), dan maintenance =
    # BENEFIT tetap (tak bergantung jarak). Maka:
    #   NPV(d) = −I + Σ [ (f_per_km − e_per_km)·d − battery_fixed + maint_fixed ] / (1+r)^t = 0
    #   d* = ( I + battery_fixed·Σ1/(1+r)^t − maint_pv ) / ( (f_per_km − e_per_km)·Σ1/(1+r)^t )
    def min_distance(s: dict[str, Any]) -> float | None:
        km = s["annual"]["distanceKm"]
        if km <= 0:
            return None
        pv_eff = sum((1.0 + fuel_growth) ** (t - 1) / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
        pv_elec = sum((1.0 + elec_growth) ** (t - 1) / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
        pv_batt = sum((1.0 + battery_growth) ** (t - 1) / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
        fuel_per_km = s["annual"]["iceFuelCostIdr"] / km
        elec_per_km = s["annual"]["evEnergyCostIdr"] / km
        battery_fixed = s["annual"]["batteryLeaseIdr"]
        i = s["capex"]["initialInvestmentIdr"]
        denom = fuel_per_km * pv_eff - elec_per_km * pv_elec
        if denom <= 0:
            return None
        # d_star dalam km TAHUNAN (karena per_km berbasis jarak tahunan); konversi
        # ke km/unit/hari dengan membagi (units × hari operasi).
        annual_km_star = (i + battery_fixed * pv_batt - mpv) / denom
        per_unit_day = annual_km_star / (units * OPERATING_DAYS) if units > 0 else 0.0
        return round(max(0.0, per_unit_day), 1)

    # Harga Pertamax impas (incremental base): NPV(P)=0.
    # fuel_total = km/eff × P → P* = (I/pv + elec_pv + batt_pv − maint_pv) / (km/eff)_pv
    inc_i = inc["capex"]["initialInvestmentIdr"]
    ice_liters = inc["annual"]["iceLiters"]
    liters_pv = sum(ice_liters * (1.0 + fuel_growth) ** (t - 1) / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1))
    cost_pv_inc = sum((inc["annual"]["evEnergyCostIdr"] * (1.0 + elec_growth) ** (t - 1)
                       + inc["annual"]["batteryLeaseIdr"] * (1.0 + battery_growth) ** (t - 1)) / (1.0 + discount) ** t
                      for t in range(1, HORIZON_YEARS + 1))
    breakeven_pertamax = round(max(0.0, (inc_i + cost_pv_inc - mpv)) / liters_pv, 0) if liters_pv > 0 else None

    # Premium harga EV maksimum (replacement, NPV=0). vehicleDelta = units×(evP − iceP).
    # NPV = −(units×(evP − iceP) + infra + impl) + net×pv = 0
    net_pv_rep = sum(rep["annual"]["netAnnualSavingIdr"] * (1.0 + fuel_growth) ** (t - 1) / (1.0 + discount) ** t
                     for t in range(1, HORIZON_YEARS + 1))
    infra_rep = rep["capex"]["chargingInfraIdr"] + rep["capex"]["implementationTrainingIdr"]
    max_ev_price = round(ice_price + (net_pv_rep - infra_rep) / units, 0) if units > 0 else None

    return {
        "note": (
            "Ambang impas (NPV = 0) menyelesaikan tiap variabel secara terbalik pada "
            "skenario base. Menunjukkan seberapa besar ruang aman sebelum investasi "
            "kehilangan nilai — semua simulasi, bukan jaminan."
        ),
        "maxBatteryLeaseIdrPerUnitYear": {
            "replacement": max_battery_lease(rep),
            "incremental": max_battery_lease(inc),
            "currentIdrPerUnitYear": round(battery_lease_year, 0),
        },
        "minDistanceKmPerUnitDay": {
            "replacement": min_distance(rep),
            "incremental": min_distance(inc),
        },
        "breakevenPertamaxIdrPerLIncremental": breakeven_pertamax,
        "maxEvUnitPriceIdrReplacement": {
            "value": max_ev_price,
            "iceBenchmarkIdr": round(ice_price, 0),
            "currentEvBenchmarkIdr": round(ev_price, 0),
            "headroomIdr": round(max_ev_price - ev_price, 0) if max_ev_price is not None else None,
        },
    }


def _tco_per_km(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Total cost of ownership per km (5 th) ICE vs EV — base, replacement.

    ICE TCO/km = energi (BBM) + maintenance benchmark ICE (asumsi publik).
    EV TCO/km  = listrik + sewa baterai (BaaS) + maintenance EV (≈0, Polytron: tanpa
    oli mesin) + amortisasi selisih harga kendaraan (bila ada). Blok ini dilabel
    asumsi; headline tetap pada net operating saving (tanpa maintenance).
    """
    base = _scenario("base", replacement=True, units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                     discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                     ev_price=ev_price, ice_price=ice_price, fuel_growth=fuel_growth,
                     elec_growth=elec_growth, battery_growth=battery_growth)
    km = base["annual"]["distanceKm"] or 1.0
    ice_energy_km = base["annual"]["iceFuelCostIdr"] / km
    ice_maint_km = (units * ICE_MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR) / km
    ev_energy_km = base["annual"]["evEnergyCostIdr"] / km
    ev_battery_km = base["annual"]["batteryLeaseIdr"] / km
    # Amortisasi selisih harga kendaraan per km (selisih bisa negatif → mengurangi).
    veh_delta_per_km = base["capex"]["vehicleDeltaIdr"] / (km * HORIZON_YEARS)
    ice_tco = ice_energy_km + ice_maint_km
    ev_tco = ev_energy_km + ev_battery_km + veh_delta_per_km
    return {
        "note": (
            "TCO/km 5-tahun (base, replacement). ICE memakai benchmark maintenance "
            "publik (asumsi); EV memakai BaaS + maintenance ≈0 dan amortisasi selisih "
            "harga kendaraan. Simulasi — bukan data aktual fleet."
        ),
        "distanceKmYear": round(km, 0),
        "ice": {
            "energyIdrPerKm": round(ice_energy_km, 0),
            "maintenanceIdrPerKm": round(ice_maint_km, 0),
            "totalIdrPerKm": round(ice_tco, 0),
        },
        "ev": {
            "energyIdrPerKm": round(ev_energy_km, 0),
            "batteryLeaseIdrPerKm": round(ev_battery_km, 0),
            "vehicleDeltaIdrPerKm": round(veh_delta_per_km, 0),
            "totalIdrPerKm": round(ev_tco, 0),
        },
        "savingIdrPerKm": round(ice_tco - ev_tco, 0),
        "savingPct": round(_safe_div(ice_tco - ev_tco, ice_tco) * 100.0, 1),
    }


def _tornado_sensitivity(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                         tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                         fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Sensitivitas one-way (tornado): ±rentang tiap lever → sebaran NPV.

    Baseline = NPV base replacement. Tiap lever diberi rentang khas (mis. harga BBM
    ±20%). Selisih NPV (high − low) = ayunan; diurut dari terbesar → menunjukkan
    asumsi mana yang paling menentukan nilai.
    """
    def npv(**over: Any) -> float:
        kw = dict(units=units, pertamax=pertamax, include_maintenance=include_maintenance, discount=discount,
                  tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price,
                  fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
        kw.update(over)
        return _scenario("base", replacement=True, **kw)["kpi"]["npvIdr"]

    baseline = npv()
    levers = [
        ("Harga Pertamax", {"pertamax": pertamax * 0.8}, {"pertamax": pertamax * 1.2}),
        ("Tarif listrik", {"tariff": tariff * 0.7}, {"tariff": tariff * 1.3}),
        ("Sewa baterai (BaaS)", {"battery_lease_year": battery_lease_year * 0.6}, {"battery_lease_year": battery_lease_year * 1.4}),
        ("Jumlah unit EV", {"units": units * 0.5}, {"units": units * 1.5}),
        ("Discount rate", {"discount": max(0.01, discount * 0.6)}, {"discount": min(0.5, discount * 1.6)}),
        ("Harga unit EV", {"ev_price": ev_price * 0.9}, {"ev_price": ev_price * 1.1}),
        ("Harga unit ICE", {"ice_price": ice_price * 0.9}, {"ice_price": ice_price * 1.1}),
    ]
    rows: list[dict[str, Any]] = []
    for label, lo, hi in levers:
        n_lo = npv(**lo)
        n_hi = npv(**hi)
        rows.append({
            "lever": label,
            "npvLowIdr": round(n_lo, 0),
            "npvHighIdr": round(n_hi, 0),
            "swingIdr": round(abs(n_hi - n_lo), 0),
        })
    rows.sort(key=lambda r: r["swingIdr"], reverse=True)
    return {
        "metric": "NPV base replacement (Rp)",
        "baselineNpvIdr": round(baseline, 0),
        "note": "One-way sensitivity: tiap lever divariasikan sendiri (ceteris paribus). Ayunan = |NPV high − NPV low|.",
        "rows": rows,
    }


def _monte_carlo(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                 tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                 fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0,
                 runs: int = 2000, seed: int = 42) -> dict[str, Any]:
    """Monte Carlo (deterministik via seed) atas utilisasi, harga, efisiensi.

    Sampel tiap variabel dari normal terpangkas (clamp ke rentang fisik), hitung NPV
    & BCR base replacement. Mengembalikan distribusi (P10/P50/P90), probabilitas
    NPV>0, dan histogram untuk chart. Simulasi — bukan prakiraan.
    """
    import random

    rng = random.Random(seed)

    def sample(name: str, override: float | None = None) -> float:
        s = MONTE_CARLO_SPECS[name]
        if override is not None:
            return override
        v = rng.gauss(s["mean"], s["sd"])
        return min(s["hi"], max(s["lo"], v))

    npvs: list[float] = []
    bcrs: list[float] = []
    # PV faktor per tahun (dipakai untuk arus kas bereskalasi, konsisten _scenario).
    disc = [1.0 / (1.0 + discount) ** t for t in range(1, HORIZON_YEARS + 1)]
    gf = [(1.0 + fuel_growth) ** (t - 1) for t in range(1, HORIZON_YEARS + 1)]
    ge = [(1.0 + elec_growth) ** (t - 1) for t in range(1, HORIZON_YEARS + 1)]
    gb = [(1.0 + battery_growth) ** (t - 1) for t in range(1, HORIZON_YEARS + 1)]
    for _ in range(runs):
        dist = sample("distanceKmDay")
        p = sample("pertamaxIdrPerL", pertamax)
        t = sample("tariffIdrPerKwh", tariff)
        b = sample("batteryLeaseYearIdr", battery_lease_year)
        wh = sample("evWhPerKm")
        eff = sample("iceEfficiencyKmPerL")
        # Override efisiensi/konsumsi: hitung manual via _scenario tak menerima wh/eff
        # per-run; gunakan implementasi ringkas konsisten dengan _scenario base.
        annual_km = units * dist * OPERATING_DAYS
        fuel = (annual_km / eff) * p
        kwh = annual_km * (wh / 1000.0) * 1.15  # loss 15% (base)
        lease = units * b
        maint = units * MAINTENANCE_BENCHMARK_IDR_PER_UNIT_YEAR if include_maintenance else 0.0
        # NPV = −I + Σ [ fuel_t + maint_t − elec_t − lease_t ] / (1+r)^t (arus bereskalasi).
        pv_net = sum(
            (fuel * gf[k] + maint * gf[k] - kwh * t * ge[k] - lease * gb[k]) * disc[k]
            for k in range(HORIZON_YEARS)
        )
        i = (units * ev_price - units * ice_price) + CHARGING_INFRA_BY_SCENARIO_IDR["base"] + IMPLEMENTATION_TRAINING_IDR
        npv = -i + pv_net
        npvs.append(npv)
        # BCR simple (nominal) konsisten dgn definisi skenario: Σfuel / (I + Σelec+lease).
        fuel_nom = fuel * sum(gf)
        cost_nom = kwh * t * sum(ge) + lease * sum(gb)
        bcrs.append(_safe_div(fuel_nom, i + cost_nom))

    npvs_sorted = sorted(npvs)
    bcrs_sorted = sorted(bcrs)

    def pct(arr: list[float], q: float) -> float:
        if not arr:
            return 0.0
        idx = min(len(arr) - 1, max(0, int(round(q * (len(arr) - 1)))))
        return arr[idx]

    prob_positive = sum(1 for x in npvs if x > 0) / len(npvs) if npvs else 0.0

    # Histogram NPV (20 bin) untuk chart distribusi.
    lo, hi = min(npvs_sorted), max(npvs_sorted)
    bins_n = 20
    step = (hi - lo) / bins_n if hi > lo else 1.0
    hist = [0] * bins_n
    for x in npvs:
        bi = min(bins_n - 1, int((x - lo) / step)) if step else 0
        hist[bi] += 1
    histogram = [
        {"binStartIdr": round(lo + i * step, 0), "binEndIdr": round(lo + (i + 1) * step, 0), "count": hist[i]}
        for i in range(bins_n)
    ]

    return {
        "note": (
            "Monte Carlo deterministik (seed tetap) atas utilisasi, harga BBM/listrik, "
            "sewa baterai, konsumsi EV, efisiensi ICE. Simulasi ketidakpastian — bukan "
            "prakiraan; ganti seed untuk melihat variasi sampel."
        ),
        "runs": runs,
        "seed": seed,
        "assumptionNote": "Normal terpangkas (truncated normal) ke rentang fisik; base-case = mean.",
        "npv": {
            "p10Idr": round(pct(npvs_sorted, 0.10), 0),
            "p50Idr": round(pct(npvs_sorted, 0.50), 0),
            "p90Idr": round(pct(npvs_sorted, 0.90), 0),
            "meanIdr": round(sum(npvs) / len(npvs), 0) if npvs else 0.0,
            "minIdr": round(lo, 0),
            "maxIdr": round(hi, 0),
            "probPositivePct": round(prob_positive * 100.0, 1),
        },
        "bcr": {
            "p10": round(pct(bcrs_sorted, 0.10), 2),
            "p50": round(pct(bcrs_sorted, 0.50), 2),
            "p90": round(pct(bcrs_sorted, 0.90), 2),
        },
        "histogram": histogram,
    }


def _hub_deployment(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                    tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                    fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Prioritisasi "DI MANA" deploy EV — alokasi `units` ke 23 hub menurut kapasitas.

    Bobot = kapasitas hub (Table 1). Ekonomi per hub dihitung pada skenario base
    replacement (unit dialokasikan ke hub). Menghasilkan daftar hub terprioritas
    (unit, km, net saving, CO₂) + rollup per region. Simulasi alokasi, bukan surat
    pesan penugasan.
    """
    hubs = load()["hubs"]
    total_cap = sum(float(h.get("capacityM", 0.0)) for h in hubs) or 1.0
    # Alokasi proporsional kapasitas lalu dibulatkan ke 10 unit dengan penyesuaian
    # sisa (largest-remainder) agar TOTAL tepat = units (menghindari drift pembulatan).
    raw = [float(units) * float(h.get("capacityM", 0.0)) / total_cap for h in hubs]
    alloc = [int(round(v / 10.0) * 10) for v in raw]
    deficit = int(round(units)) - sum(alloc)
    if deficit != 0:
        # urutkan menurut sisa pecahan terbesar untuk menambah/kurangi kelipatan 10.
        order = sorted(range(len(hubs)), key=lambda i: (raw[i] - alloc[i]), reverse=deficit > 0)
        step = 10 if deficit > 0 else -10
        need = abs(deficit) // 10
        for i in order[:need]:
            alloc[i] += step
    rows: list[dict[str, Any]] = []
    by_region: dict[str, dict[str, float]] = {}
    for h, hub_units in zip(hubs, alloc):
        cap = float(h.get("capacityM", 0.0))
        if hub_units <= 0:
            continue
        r = _scenario("base", replacement=True, units=float(hub_units), pertamax=pertamax,
                      include_maintenance=include_maintenance, discount=discount, tariff=tariff,
                      battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price,
                      fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
        reg = h.get("region", "—")
        agg = by_region.setdefault(reg, {"units": 0.0, "netSavingIdr": 0.0, "npvIdr": 0.0, "co2TonsYear": 0.0, "capacityM": 0.0})
        agg["units"] += hub_units
        agg["netSavingIdr"] += r["annual"]["netAnnualSavingIdr"]
        agg["npvIdr"] += r["kpi"]["npvIdr"]
        agg["co2TonsYear"] += r["co2"]["reductionTonsYear"]
        agg["capacityM"] += cap
        rows.append({
            "name": h.get("name", "—"),
            "code": h.get("code", "—"),
            "region": reg,
            "capacityM": round(cap, 3),
            "allocatedUnits": hub_units,
            "netAnnualSavingIdr": r["annual"]["netAnnualSavingIdr"],
            "npvIdr": r["kpi"]["npvIdr"],
            "co2ReductionTonsYear": r["co2"]["reductionTonsYear"],
        })
    rows.sort(key=lambda x: x["allocatedUnits"], reverse=True)
    regions = [
        {"region": k, "units": int(v["units"]), "netSavingIdr": round(v["netSavingIdr"], 0),
         "npvIdr": round(v["npvIdr"], 0), "co2TonsYear": round(v["co2TonsYear"], 1),
         "capacityM": round(v["capacityM"], 3)}
        for k, v in sorted(by_region.items(), key=lambda kv: kv[1]["units"], reverse=True)
    ]
    return {
        "note": (
            "Alokasi unit EV ke 23 hub berbobot KAPASITAS (Table 1) — hub terbesar "
            "dilayani lebih dulu. Ekonomi per hub = skenario base replacement. "
            "Simulasi prioritisasi, bukan penugasan aktual."
        ),
        "totalUnits": int(sum(r["allocatedUnits"] for r in rows)),
        "hubs": rows,
        "byRegion": regions,
    }


def _lifecycle_emissions(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                        tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                        fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Emisi SIKLUS HIDUP (SIMULASI) — operasional + produksi kendaraan/baterai.

    Estimasi order-of-magnitude: produksi motor ICE vs motor EV (+ baterai Li-ion),
    ditambah operasional 5 tahun. Dilabel jelas sebagai SIMULASI, bukan LCA
    tersertifikasi. Bila EV diproduksi lebih intensif karbon tetapi beroperasi
    lebih bersih, blok ini menunjukkan tahun ketika manfaat karbon mulai positif.
    """
    base = _scenario("base", replacement=True, units=units, pertamax=pertamax, include_maintenance=include_maintenance,
                     discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                     ev_price=ev_price, ice_price=ice_price, fuel_growth=fuel_growth,
                     elec_growth=elec_growth, battery_growth=battery_growth)
    # Produksi satu kali (kg CO2e).
    ice_mfg = units * ICE_MANUFACTURING_CO2_KG_PER_UNIT
    ev_battery_mfg = units * EV_BATTERY_KWH * EV_BATTERY_MANUFACTURING_CO2_KG_PER_KWH
    ev_mfg = units * EV_MANUFACTURING_CO2_KG_PER_UNIT + ev_battery_mfg
    mfg_extra = ev_mfg - ice_mfg  # bisa positif (EV lebih intensif di awal)
    # Operasional tahunan (reuse operasional tahun-1).
    ice_op_year = base["co2"]["iceCo2KgYear"]
    ev_op_year = base["co2"]["evCo2KgYear"]
    op_saving_year = ice_op_year - ev_op_year
    # Titik impas karbon (tahun): mfg_extra / op_saving_year.
    carbon_payback = round(mfg_extra / op_saving_year, 1) if op_saving_year > 0 else None
    # Kumulatif 5 tahun.
    ice_5y = ice_mfg + ice_op_year * HORIZON_YEARS
    ev_5y = ev_mfg + ev_op_year * HORIZON_YEARS
    return {
        "label": "SIMULASI (bukan LCA tersertifikasi)",
        "note": (
            "Estimasi siklus hidup order-of-magnitude: produksi kendaraan + baterai "
            "(satu kali) + operasional 5 tahun. Angka produksi = asumsi tim (dilabel), "
            "bukan hasil LCA tersertifikasi. Tujuan: menunjukkan apakah/waktu manfaat "
            "karbon EV mulai positif setelah memperhitungkan produksi."
        ),
        "assumptions": {
            "iceManufacturingKgPerUnit": ICE_MANUFACTURING_CO2_KG_PER_UNIT,
            "evManufacturingKgPerUnit": EV_MANUFACTURING_CO2_KG_PER_UNIT,
            "evBatteryManufacturingKgPerKwh": EV_BATTERY_MANUFACTURING_CO2_KG_PER_KWH,
        },
        "manufacturing": {
            "iceTotalKg": round(ice_mfg, 0),
            "evTotalKg": round(ev_mfg, 0),
            "evBatteryKg": round(ev_battery_mfg, 0),
            "extraKg": round(mfg_extra, 0),
        },
        "operational": {
            "iceKgYear": round(ice_op_year, 0),
            "evKgYear": round(ev_op_year, 0),
            "savingKgYear": round(op_saving_year, 0),
        },
        "carbonPaybackYears": carbon_payback,
        "cumulative5y": {
            "iceKg": round(ice_5y, 0),
            "evKg": round(ev_5y, 0),
            "deltaKg": round(ice_5y - ev_5y, 0),
            "deltaTons": round((ice_5y - ev_5y) / 1000.0, 1),
        },
    }


def _escalation_preview(*, u: float, pertamax: float, include_maintenance: bool, discount: float,
                        tariff: float, battery_lease_year: float, ev_price: float, ice_price: float) -> dict[str, Any]:
    """Pratinjau efek eskalasi harga (fuel +3%/th, listrik +2%/th) pada NPV base.

    Memperlihatkan bagaimana NPV bergeser bila harga BBM/listrik naik tiap tahun —
    arus kas bereskalasi, bukan datar. Simulasi sensitivitas lintas-waktu.
    """
    common = dict(units=u, pertamax=pertamax, include_maintenance=include_maintenance, discount=discount,
                  tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price)
    flat = _scenario("base", replacement=True, **common)["kpi"]["npvIdr"]
    esc = _scenario("base", replacement=True, fuel_growth=0.03, elec_growth=0.02, **common)["kpi"]["npvIdr"]
    aggressive = _scenario("base", replacement=True, fuel_growth=0.06, elec_growth=0.03, **common)["kpi"]["npvIdr"]
    return {
        "note": "Efek eskalasi harga tahunan pada NPV base (replacement). Arus kas tumbuh, NPV dihitung ulang.",
        "fuelGrowthPct": 3.0,
        "elecGrowthPct": 2.0,
        "flatNpvIdr": round(flat, 0),
        "moderateNpvIdr": round(esc, 0),
        "aggressiveNpvIdr": round(aggressive, 0),
        "moderateDeltaIdr": round(esc - flat, 0),
        "aggressiveDeltaIdr": round(aggressive - flat, 0),
    }


def _roadmap_program_cashflow(*, units: float, pertamax: float, include_maintenance: bool, discount: float,
                             tariff: float, battery_lease_year: float, ev_price: float, ice_price: float,
                             fuel_growth: float = 0.0, elec_growth: float = 0.0, battery_growth: float = 0.0) -> dict[str, Any]:
    """Arus kas PROGRAM 5-tahun untuk rollout 3 fase (capex disebar, bukan Y0).

    Berbeda dari tab arus kas per-fase (yang menaruh capex di Y0 tiap fase), di sini
    capex tiap fase jatuh pada tahun kalender proyek (fase 1 → Y1, fase 2 → Y2,
    fase 3 → Y3) dan benefit berjalan setelah unit terpasang. Memberi gambaran
    arus kas program agregat. Simulasi perencanaan.
    """
    roadmap = _roadmap(units=units, pertamax=pertamax, include_maintenance=include_maintenance, discount=discount,
                       tariff=tariff, battery_lease_year=battery_lease_year, ev_price=ev_price,
                       ice_price=ice_price, fuel_growth=fuel_growth, elec_growth=elec_growth,
                       battery_growth=battery_growth)
    # Tahun mulai proyek: fase1 Y1, fase2 Y2, fase3 Y3.
    added_by_year = {1: 0.0, 2: 0.0, 3: 0.0}
    for p in roadmap["phases"]:
        year = {1: 1, 2: 2, 3: 3}.get(p["phase"], 3)
        added_by_year[year] += p["addedUnits"]
    # Capex & benefit program tiap tahun.
    rows: list[dict[str, Any]] = []
    deployed = 0.0
    cum = 0.0
    for y in range(0, HORIZON_YEARS + 1):
        if y == 0:
            rows.append({"year": 0, "capexIdr": 0.0, "benefitIdr": 0.0, "netCashFlowIdr": 0.0, "cumulativeIdr": 0.0, "deployedUnits": 0})
            continue
        add = added_by_year.get(y, 0.0)
        # Capex = ekonomi unit baru (replacement) untuk unit yang ditambah tahun ini.
        r_add = _scenario("base", replacement=True, units=add, pertamax=pertamax, include_maintenance=include_maintenance,
                          discount=discount, tariff=tariff, battery_lease_year=battery_lease_year,
                          ev_price=ev_price, ice_price=ice_price, fuel_growth=fuel_growth,
                          elec_growth=elec_growth, battery_growth=battery_growth) if add > 0 else None
        capex = r_add["capex"]["initialInvestmentIdr"] if r_add else 0.0
        deployed += add
        # Benefit = net saving semua unit terpasang (ekonomi unit yang sama).
        r_deployed = _scenario("base", replacement=True, units=deployed, pertamax=pertamax,
                               include_maintenance=include_maintenance, discount=discount, tariff=tariff,
                               battery_lease_year=battery_lease_year, ev_price=ev_price, ice_price=ice_price,
                               fuel_growth=fuel_growth, elec_growth=elec_growth, battery_growth=battery_growth)
        benefit = r_deployed["annual"]["netAnnualSavingIdr"]
        net = benefit - capex
        cum += net
        rows.append({"year": y, "capexIdr": round(capex, 0), "benefitIdr": round(benefit, 0),
                     "netCashFlowIdr": round(net, 0), "cumulativeIdr": round(cum, 0), "deployedUnits": deployed})
    npv = sum(rows[y]["netCashFlowIdr"] / (1.0 + discount) ** y for y in range(1, HORIZON_YEARS + 1))
    return {
        "note": (
            "Arus kas PROGRAM (capex fase jatuh Y1/Y2/Y3, benefit setelah unit terpasang) "
            "— berbeda dari arus kas per-fase. Simulasi perencanaan rollout bertahap."
        ),
        "rows": rows,
        "totalNetIdr": round(cum, 0),
        "npvIdr": round(npv, 0),
        "finalDeployedUnits": int(deployed),
    }


# ── util numerik kecil ────────────────────────────────────────────────────────
def _safe_div(a: float, b: float) -> float:
    return (a / b) if b else 0.0

def _ceil(x: float) -> int:
    return int(math.ceil(x))
