"""REST untuk ML — forecast, cod-risk, address-parse, simulations. Semua label 'prototipe'."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.ml import metrics
from app.ml.address_parse import demo_address, parse_address
from app.ml.cod_cash import cod_cash_risk, default_scenarios as cod_cash_scenarios
from app.ml.cod_intel import analyze_cod_impact, default_scenarios
from app.ml.cod_risk import demo_packages, score_package
from app.ml.ev_bca import ev_bca
from app.ml.expansion import expansion_roi
from app.ml.forecast import demand_actual_tiktok, forecast_next_12
from app.ml.modalshift import cost_levers, optimize_corridors
from app.ml.optimize import optimize_load_balance
from app.ml.pnl import cost_waterfall
from app.ml.route_intel import plan_route
from app.ml.simulations import DIGITAL_TWIN_SCENARIOS, calculate_cod_impact, calculate_digital_twin
from app.ml.sponsor import compare_models, sensitivity
from app.ml.surge import stress_test

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/forecast")
def forecast():
    return forecast_next_12(12)


class ForecastBody(BaseModel):
    horizon: int = 12
    # Skala boost per label event: {label: multiplier}. 1.0 = kasus apa adanya.
    event_scale: dict[str, float] = {}


@router.post("/forecast")
def forecast_custom(body: ForecastBody):
    """Forecast interaktif: horizon + skala event (simulasi 'bagaimana jika')."""
    return forecast_next_12(body.horizon, body.event_scale)


@router.get("/demand-actual")
def demand_actual():
    return demand_actual_tiktok()


class PackageBody(BaseModel):
    hub_util: float = 68.9
    value: float = 100.0
    hour: float = 10.0
    ambiguous: float = 0.0
    zone: float = 0.0


@router.post("/cod-risk")
def cod_risk(pkg: PackageBody):
    return score_package(pkg.model_dump())


@router.get("/cod-risk/demo")
def cod_risk_demo():
    return {"packages": demo_packages(), "sim": calculate_cod_impact(8, 60)}


@router.post("/address-parse")
def address_parse(body: dict[str, Any]):
    return parse_address(str(body.get("address", "")))


@router.get("/address-demo")
def address_demo():
    return demo_address()


@router.get("/sim/digital-twin")
def digital_twin():
    out = {}
    for name, shares in DIGITAL_TWIN_SCENARIOS.items():
        out[name] = calculate_digital_twin(shares)
    return out


@router.get("/sim/cod-impact")
def sim_cod():
    return {"prob": 60, "result": calculate_cod_impact(8, 60)}


# ── Network Optimization Engine (load balancing) ──────────────────────────
@router.get("/optimize/load-balance")
def optimize_balance():
    """Rencana alokasi ulang volume hub over-utilisasi → hub ber-headroom."""
    return optimize_load_balance()


class LoadBalanceBody(BaseModel):
    critical: float | None = None
    safe_floor: float | None = None
    max_divert_frac: float | None = None
    warn_util: float | None = None


@router.post("/optimize/load-balance")
def optimize_balance_custom(body: LoadBalanceBody):
    """Versi interaktif: ambang kritis/lantai/porsi/tujuan dapat diubah."""
    return optimize_load_balance(body.critical, body.safe_floor, body.max_divert_frac, body.warn_util)


# ── Peak-Surge Stress-Test (Pertanyaan 2: fluktuasi demand) ───────────────
@router.get("/sim/surge")
def surge_default():
    """Uji beban puncak default (Double 12 ~3× basis harian)."""
    return stress_test()


class SurgeBody(BaseModel):
    peak_multiplier: float = 3.0
    surge_capacity_factor: float = 1.0
    allow_spillover: bool = True


@router.post("/sim/surge")
def surge_custom(body: SurgeBody):
    """Versi interaktif: atur amplifikasi puncak & faktor kapasitas elastis."""
    return stress_test(body.peak_multiplier, body.surge_capacity_factor, body.allow_spillover)


# ── COD Decision Intelligence (dampak per shift kurir) ────────────────────
class CodIntelBody(BaseModel):
    cod_share_pct: float = 60.0
    interventions: list[str] = []
    packages_per_shift: int = 40


@router.post("/cod-intel")
def cod_intel(body: CodIntelBody):
    return analyze_cod_impact(body.cod_share_pct, body.interventions, body.packages_per_shift)


@router.get("/cod-intel/scenarios")
def cod_intel_scenarios():
    return default_scenarios()


# ── COD Cash-Reconciliation Risk (Pertanyaan 3: sistem COD) ───────────────
class CodCashBody(BaseModel):
    cod_share_pct: float = 45.0
    interventions: list[str] = []


@router.post("/cod-cash/risk")
def cod_cash(body: CodCashBody):
    """Risiko rekonsiliasi kas COD + dampak intervensi digital."""
    return cod_cash_risk(body.cod_share_pct, body.interventions)


@router.get("/cod-cash/scenarios")
def cod_cash_default_scenarios():
    return cod_cash_scenarios()


# ── Market-Expansion ROI (Pertanyaan 5: strategi ekspansi) ────────────────
class ExpansionBody(BaseModel):
    capex_per_hub_idr: float | None = None
    target_util: float | None = None


@router.get("/expansion/roi")
def expansion_default():
    """Skor kelayakan ekspansi per hub + ROI portofolio (default asumsi tim)."""
    return expansion_roi()


@router.post("/expansion/roi")
def expansion_custom(body: ExpansionBody):
    """Versi interaktif: atur capex/hub & target utilisasi pasca-ekspansi."""
    return expansion_roi(body.capex_per_hub_idr, body.target_util)


# ── Unified Cost-Waterfall & P&L (Pertanyaan 6) ───────────────────────────
@router.get("/pnl/waterfall")
def pnl_waterfall(include_sustainability: bool = True):
    """Waterfall biaya sekarang → teroptimasi + dampak P&L dari Table 3."""
    return cost_waterfall(include_sustainability)


# ── Route Intelligence (jalur tercepat: kepadatan + efisiensi) ────────────
class RoutePlanBody(BaseModel):
    distance_km: float = 10.0
    density_override: float | None = None
    base_speed_kmh: float = 22.0


@router.get("/route/plan")
def route_plan(distance_km: float = 10.0, density_override: float | None = None, base_speed_kmh: float = 22.0):
    """Rencana jalur tercepat + kandidat terskor (kepadatan & efisiensi)."""
    return plan_route(distance_km, density_override, base_speed_kmh)


@router.post("/route/plan")
def route_plan_custom(body: RoutePlanBody):
    """Versi interaktif: jarak, kepadatan (jam sibuk), & kecepatan dasar."""
    return plan_route(body.distance_km, body.density_override, body.base_speed_kmh)


# ── Metrik turunan & rekonsiliasi angka ───────────────────────────────────
@router.get("/metrics/regions")
def metric_regions():
    return metrics.region_summary()


@router.get("/metrics/financial")
def metric_financial():
    return metrics.financial_summary()


@router.get("/metrics/demand")
def metric_demand():
    return metrics.demand_summary()


@router.get("/metrics/fleet")
def metric_fleet():
    return metrics.fleet_summary()


@router.get("/metrics/audit")
def metric_audit():
    """Bukti telusur angka: checklist cocok-dokumen + temuan inkonsistensi."""
    return metrics.data_audit()


# ── Direct-vs-Sponsor Comparator (Pertanyaan 1) ───────────────────────────
class SponsorBody(BaseModel):
    hq_equity: float = 0.30
    fixed_share: float = 0.45
    local_margin: float = 0.14


@router.get("/sponsor/compare")
def sponsor_compare():
    """Perbandingan Direct vs Regional Sponsor per region (default asumsi)."""
    return compare_models()


@router.post("/sponsor/compare")
def sponsor_compare_custom(body: SponsorBody):
    """Perbandingan dengan parameter ekuitas/biaya yang diatur (Digital Twin nyata)."""
    return compare_models(body.hq_equity, body.fixed_share, body.local_margin)


@router.get("/sponsor/sensitivity")
def sponsor_sensitivity():
    """Uji sensitivitas jumlah region-sponsor terhadap porsi ekuitas HQ."""
    return sensitivity()


# ── Modal-Shift & Cost-Lever (Pertanyaan 6) ───────────────────────────────
class ModalShiftBody(BaseModel):
    mode_filter: list[str] | None = None
    weights: dict[str, float] | None = None
    sla_hours: float = 48.0


@router.post("/modalshift/optimize")
def modalshift_optimize(body: ModalShiftBody):
    """Optimasi pemilihan moda tiap koridor (biaya + emisi + SLA)."""
    return optimize_corridors(body.mode_filter, body.weights, body.sla_hours)


@router.get("/modalshift/optimize")
def modalshift_optimize_default():
    return optimize_corridors()


@router.get("/modalshift/levers")
def modalshift_levers():
    """Portofolio tuas pengurangan biaya + dampak sustainability (Pertanyaan 6)."""
    return cost_levers()


# ── EV Fleet Benefit-Cost Analysis (roadmap sustainability) ───────────────
class EvBcaBody(BaseModel):
    units: float | None = None
    pertamax_override: float | None = None
    include_maintenance: bool = False


@router.get("/ev-bca")
def ev_bca_default():
    """BCA armada EV default (200 unit, benchmark nasional, BaaS)."""
    return ev_bca()


@router.post("/ev-bca")
def ev_bca_run(body: EvBcaBody):
    """Versi interaktif: jumlah unit, harga BBM, & sertakan maintenance."""
    return ev_bca(body.units, body.pertamax_override, body.include_maintenance)
