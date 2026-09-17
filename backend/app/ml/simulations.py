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
from app.ml.metrics import clamp


_SHARE_KEYS = ["javaShare", "sumatraShare", "kalimantanShare", "sulawesiShare", "baliShare", "malukuShare"]
_EAST_REGIONS = {"Kalimantan", "Sulawesi", "Maluku & Papua"}
# Koefisien dampak (asumsi tim model, dilabel): per 100% sponsor.
_UTIL_GAIN_PT = 15.0     # kenaikan util timur (pt)
_CAPEX_SAVING_FRAC = 0.35  # porsi fulfilment expense → penghematan capex
_ON_TIME_PT = -3.0       # dampak on-time (pt)


def _east_hubs(data: dict):
    return [h for h in data["hubs"] if h["region"] in _EAST_REGIONS]


def _clamp_pct(x: float) -> float:
    """Jepit porsi ke 0..100 (input user bisa negatif/>100/NaN)."""
    return clamp(x, 0.0, 100.0, 0.0)


def calculate_digital_twin(shares: dict[str, float]) -> dict:
    """Digital Twin: dampak pengalihan ke Regional Sponsor per region.

    Setiap share dijepit ke 0..100; ``total_sponsor`` = rata-rata share 6 region
    (proxy tingkat adopsi, dilabel asumsi). Base util timur & fulfilment 2023
    dari data kasus.
    """
    data = load()
    vals = [_clamp_pct(shares.get(k, 0)) for k in _SHARE_KEYS]
    total_sponsor = sum(vals) / len(vals) if vals else 0.0  # sudah 0..100

    east = _east_hubs(data)
    east_util_now = sum(h["utilizationPct"] for h in east) / len(east) if east else 0
    east_util_after = min(100.0, east_util_now + (total_sponsor / 100) * _UTIL_GAIN_PT)

    fin = [f for f in data["financial"] if f["year"] == 2023]
    fulfilment = fin[0]["fulfilmentT"] if fin else 50.08
    capex_saving = fulfilment * (total_sponsor / 100) * _CAPEX_SAVING_FRAC

    # Volume direct-op yang dibebaskan = kapasitas hub timur × adopsi sponsor.
    freed = sum(h["capacityM"] * (total_sponsor / 100) for h in east)

    on_time = (total_sponsor / 100) * _ON_TIME_PT

    return {
        "totalCapexSavingT": round(capex_saving, 2),
        # Nama sesuai makna: GAIN = kenaikan (delta), bukan level absolut.
        "eastUtilisationGain": round(east_util_after - east_util_now, 1),
        "eastUtilisationAfter": round(east_util_after, 1),
        "eastUtilisationNow": round(east_util_now, 1),
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
# Dua observasi murni: 8 paket non-COD = 75 mnt, 8 paket COD = 138 mnt.
_ROUTE_NON_COD_MIN = 75.0   # 8 paket, semua non-COD
_ROUTE_COD_MIN = 138.0      # 8 paket, semua COD  (waiting COD = 63 mnt / 8 paket)
_ROUTE_PACKAGES = 8.0
# Porsi COD DEFAULT = 100% (shift murni COD) agar default mereproduksi angka kasus.
# Untuk campuran, caller mengisi `cod_share_pct` eksplisit (dilabel asumsi).
_COD_SHARE_DEFAULT = 100.0


def calculate_cod_impact(cod_packets: int = 8, prob_digital: float = 60, cod_share_pct: float = _COD_SHARE_DEFAULT) -> dict:
    """Dampak COD pada SATU shift (angka kasus Figure 2: 8 pkg → 75/138 mnt).

    Model tunggal tanpa kasus-khusus: paket COD menambah *waiting* per paket
    (63 mnt ÷ 8 = 7,875 mnt) di atas tempo non-COD (75 ÷ 8 = 9,375 mnt).
    ``cod_share_pct`` = porsi paket COD (0..100, default 100% = shift murni COD,
    sehingga default mereproduksi 138 mnt). ``prob_digital`` = porsi waiting yang
    dihilangkan intervensi digital. Semua input dijepit ke rentang sah.
    """
    cod_packets = int(clamp(cod_packets, 0, 1_000_000, 8))
    p_digital = clamp(prob_digital, 0.0, 100.0, 60.0) / 100
    share = clamp(cod_share_pct, 0.0, 100.0, _COD_SHARE_DEFAULT) / 100

    tempo_non_cod = _ROUTE_NON_COD_MIN / _ROUTE_PACKAGES      # 9,375 mnt pkg⁻¹
    wait_cod_per_pkg = (_ROUTE_COD_MIN - _ROUTE_NON_COD_MIN) / _ROUTE_PACKAGES  # ≈7,875 mnt

    # Porsi COD konsisten untuk SEMUA n (tanpa kasus-khusus) → monotonic.
    n_cod = cod_packets * share
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
        "packages": cod_packets,
        "codSharePct": round(share * 100, 1),
        "probDigitalPct": round(p_digital * 100, 1),
    }
