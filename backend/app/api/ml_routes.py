"""REST untuk ML — forecast, cod-risk, address-parse, simulations. Semua label 'prototipe'."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from app.ml import metrics
from app.ml.address_parse import demo_address, parse_address
from app.ml.cod_intel import analyze_cod_impact, default_scenarios
from app.ml.cod_risk import demo_packages, score_package
from app.ml.forecast import demand_actual_tiktok, forecast_next_12
from app.ml.optimize import optimize_load_balance
from app.ml.simulations import DIGITAL_TWIN_SCENARIOS, calculate_cod_impact, calculate_digital_twin

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/forecast")
def forecast():
    return forecast_next_12(12)


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
