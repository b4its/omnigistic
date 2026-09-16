"""Port simulations.ts — pure math, no AI. Digital Twin + COD impact.

Catatan transparansi (prototipe presentasi):
  * ``calculate_digital_twin`` — koefisien dampak (util +15pt, capex ×0,35, on-time
    −3pt per 100% sponsor) = asumsi tim model, dinyatakan; base util & volume
    sponsor diturunkan dari data kasus (hubs + financial 2023).
  * ``calculate_cod_impact`` — durasi kini benar-benar diturunkan dari jumlah paket
    input memakai angka kasus Figure 2 (75 vs 138 mnt / 8 pkg); sebelumnya input
    ``cod_packets`` diabaikan (bug). Waiting COD & porsi digital = asumsi tim.
"""
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


# Angka kasus Figure 2 (jangan diubah tanpa sumber kasus): satu "siklus" 8 paket.
_ROUTE_NON_COD_MIN = 75.0   # non-COD, 8 paket
_ROUTE_COD_MIN = 138.0      # COD, 8 paket  (waiting COD = 63 mnt / 8 paket)
_ROUTE_PACKAGES = 8.0
# Porsi paket yang benar-benar COD (asumsi tim, dilabel). Sisa = non-COD.
_COD_SHARE_DEFAULT = 0.60


def calculate_cod_impact(cod_packets: int = 8, prob_digital: float = 60) -> dict:
    """Dampak COD pada SATU shift (default 8 paket, angka kasus Figure 2).

    Berbeda dari versi lama yang mengabaikan ``cod_packets``: di sini durasi &
    produktivitas shift benar-benar diturunkan dari jumlah paket input, memakai
    tempo non-COD (75 mnt/8 pkg) + waiting COD (63 mnt/8 pkg) yang dipangkas
    oleh ``prob_digital`` (porsi waiting yang dihilangkan intervensi digital).
    """
    cod_packets = max(0, int(cod_packets))
    p_digital = min(1.0, max(0.0, float(prob_digital) / 100))

    tempo_non_cod = _ROUTE_NON_COD_MIN / _ROUTE_PACKAGES      # mnt pkg⁻¹ non-COD
    wait_cod_per_pkg = (_ROUTE_COD_MIN - _ROUTE_NON_COD_MIN) / _ROUTE_PACKAGES  # ≈7,875 mnt

    # Asumsi komposisi: porsi COD dari total paket (default 60%, dilabel).
    cod_share = _COD_SHARE_DEFAULT if cod_packets != _ROUTE_PACKAGES else 1.0
    n_cod = cod_packets * cod_share
    n_non = cod_packets - n_cod

    dur_before = n_non * tempo_non_cod + n_cod * (tempo_non_cod + wait_cod_per_pkg)
    dur_after = n_non * tempo_non_cod + n_cod * (tempo_non_cod + wait_cod_per_pkg * (1 - p_digital))

    per_hour_before = round((cod_packets / dur_before) * 60, 2) if dur_before else 0.0
    per_hour_after = round((cod_packets / dur_after) * 60, 2) if dur_after else 0.0
    time_saved = dur_before - dur_after
    capacity_gain_pct = round(((per_hour_after - per_hour_before) / per_hour_before) * 100) if per_hour_before else 0
    # Paket ekstra yang bisa diantar dengan waktu yang dihemat (pakai tempo setelah).
    tempo_after = dur_after / cod_packets if cod_packets else 0.0
    packages_freed = round(time_saved / tempo_after) if tempo_after else 0

    return {
        "currentTime": round(dur_before),
        "newTime": round(dur_after),
        "timeSaved": round(time_saved),
        "currentPerHour": per_hour_before,
        "newPerHour": per_hour_after,
        "capacityGainPct": capacity_gain_pct,
        "packagesFreed": packages_freed,
    }
