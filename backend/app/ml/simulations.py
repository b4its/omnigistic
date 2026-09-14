"""Port simulations.ts — pure math, no AI. Digital Twin + COD impact."""
from __future__ import annotations
from app.db.loader import load


def _east_hubs(data: dict):
    east = {"Kalimantan", "Sulawesi", "Maluku & Papua"}
    return [h for h in data["hubs"] if h["region"] in east]


def calculate_digital_twin(shares: dict[str, float]) -> dict:
    data = load()
    keys = ["javaShare", "sumatraShare", "kalimantanShare", "sulawesiShare", "baliShare", "malukuShare"]
    vals = [shares.get(k, 0) for k in keys]
    total_sponsor = sum(vals) / len(vals) if vals else 0

    east = _east_hubs(data)
    east_util_now = sum(h["utilizationPct"] for h in east) / len(east) if east else 0
    east_util_after = east_util_now + (total_sponsor / 100) * 15

    fin = [f for f in data["financial"] if f["year"] == 2023]
    fulfilment = fin[0]["fulfilmentT"] if fin else 50.08
    capex_saving = fulfilment * (total_sponsor / 100) * 0.35

    freed = sum(h["capacityM"] * (total_sponsor / 100) for h in east if h["region"] in ("Maluku & Papua", "Kalimantan"))

    on_time = -(total_sponsor / 100) * 3

    return {
        "totalCapexSavingT": round(capex_saving, 2),
        "eastUtilisationGain": round(east_util_after, 1),
        "onTimeImpactPct": round(on_time, 1),
        "regionalSponsorPct": round(total_sponsor, 1),
        "directOpVolFreedM": round(freed, 3),
    }


# Skenario preset (auto-demo, non-interaktif)
DIGITAL_TWIN_SCENARIOS = {
    "Jawa Direct + Sponsor Bertahap": {"javaShare": 0, "sumatraShare": 0, "kalimantanShare": 40, "sulawesiShare": 40, "baliShare": 0, "malukuShare": 100},
    "Semua Region Sponsor Penuh": {"javaShare": 0, "sumatraShare": 50, "kalimantanShare": 100, "sulawesiShare": 100, "baliShare": 50, "malukuShare": 100},
    "Timur-Only Fokus": {"javaShare": 0, "sumatraShare": 0, "kalimantanShare": 60, "sulawesiShare": 60, "baliShare": 0, "malukuShare": 100},
}


def calculate_cod_impact(cod_packets: int = 8, prob_digital: float = 60) -> dict:
    current_time = 138
    current_per_hour = 3.48
    new_time = 138 - (138 - 75) * (prob_digital / 100)
    new_per_hour = 8 / (new_time / 60)
    time_saved = current_time - new_time
    capacity_gain_pct = round(((new_per_hour - current_per_hour) / current_per_hour) * 100)
    packages_freed = round(cod_packets * (prob_digital / 100) * 0.28)
    return {
        "currentTime": current_time,
        "newTime": round(new_time),
        "timeSaved": round(time_saved),
        "currentPerHour": current_per_hour,
        "newPerHour": round(new_per_hour, 2),
        "capacityGainPct": capacity_gain_pct,
        "packagesFreed": packages_freed,
    }
