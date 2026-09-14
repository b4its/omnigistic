"""REST untuk ML — forecast, cod-risk, address-parse, simulations. Semua label 'prototipe'."""
from __future__ import annotations
from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel

from app.ml.forecast import forecast_next_12, demand_actual_tiktok
from app.ml.cod_risk import score_package, demo_packages
from app.ml.address_parse import parse_address, demo_address
from app.ml.simulations import calculate_digital_twin, DIGITAL_TWIN_SCENARIOS, calculate_cod_impact

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
    return score_package(pkg.dict())


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
