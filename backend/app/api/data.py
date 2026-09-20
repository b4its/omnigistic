"""REST API untuk data kasus (dari shared/data-kas.json) — frontend SvelteKit membaca JSON ini."""
from __future__ import annotations
from fastapi import APIRouter

from app.api.localized_route import LocalizedRoute

from app.db.loader import load_localized

router = APIRouter(prefix="/api", tags=["data"], route_class=LocalizedRoute)


@router.get("/hubs")
def hubs(lang: str = "id"):
    return load_localized(lang)["hubs"]


@router.get("/regions")
def regions(lang: str = "id"):
    return load_localized(lang)["regions"]


@router.get("/demand")
def demand(lang: str = "id"):
    return load_localized(lang)["monthlyDemand"]


@router.get("/financial")
def financial(lang: str = "id"):
    return load_localized(lang)["financial"]


@router.get("/network")
def network(lang: str = "id"):
    return load_localized(lang)["networkGrowth"]


@router.get("/addresses")
def addresses(lang: str = "id"):
    return load_localized(lang)["ambiguousAddresses"]


@router.get("/routes")
def routes(lang: str = "id"):
    return load_localized(lang)["routeCompare"]


@router.get("/courier-quotes")
def courier_quotes(lang: str = "id"):
    return load_localized(lang)["courierQuotes"]


@router.get("/fleet")
def fleet(lang: str = "id"):
    return load_localized(lang)["fleet"]


@router.get("/kpi-targets")
def kpi_targets(lang: str = "id"):
    return load_localized(lang)["kpiTargets"]


@router.get("/root-causes")
def root_causes(lang: str = "id"):
    return load_localized(lang)["rootCauses"]


@router.get("/all")
def all_data(lang: str = "id"):
    """Endpoint gabungan utk SPA (fetch tunggal)."""
    return load_localized(lang)
