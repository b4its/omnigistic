"""REST API untuk data kasus (dari shared/data-kas.json) — frontend SvelteKit membaca JSON ini."""
from __future__ import annotations
from fastapi import APIRouter

from app.db.loader import load

router = APIRouter(prefix="/api", tags=["data"])


@router.get("/hubs")
def hubs():
    return load()["hubs"]


@router.get("/regions")
def regions():
    return load()["regions"]


@router.get("/demand")
def demand():
    return load()["monthlyDemand"]


@router.get("/financial")
def financial():
    return load()["financial"]


@router.get("/network")
def network():
    return load()["networkGrowth"]


@router.get("/addresses")
def addresses():
    return load()["ambiguousAddresses"]


@router.get("/routes")
def routes():
    return load()["routeCompare"]


@router.get("/courier-quotes")
def courier_quotes():
    return load()["courierQuotes"]


@router.get("/fleet")
def fleet():
    return load()["fleet"]


@router.get("/kpi-targets")
def kpi_targets():
    return load()["kpiTargets"]


@router.get("/root-causes")
def root_causes():
    return load()["rootCauses"]


@router.get("/all")
def all_data():
    """Endpoint gabungan utk SPA (fetch tunggal)."""
    return load()
