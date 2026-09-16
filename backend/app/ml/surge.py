"""Peak-Surge Stress-Test Engine — Pertanyaan 2 (fluktuasi demand dramatis).

Basis kasus:
  * Double 12 (Des 2022): Jakarta 1 harus mengalihkan paket ke hub lain; puncak
    nasional "lebih dari 3 juta paket/hari" (dokumen, Demand section).
  * Table 1: 23 hub dengan kapasitas (M/hari) & utilisasi.
  * Table 4: demand bulanan 2023 (78–105 juta/bulan) — dipakai menurunkan basis
    harian & pola musiman.

Engine memodelkan:
  1. Amplifikasi puncak (peak multiplier) dari basis harian → beban per hub.
  2. Kapasitas efektif hub (kapasitas × faktor surge) dan pelanggaran (breach).
  3. Backlog & waktu pemulihan (drain rate) bila beban > kapasitas.
  4. Rencana mitraasi: spillover ke hub ber-headroom (pakai cost index region
     yang sama dgn optimize.py) + opsi buffer armada.

Semua rasio/koefisien non-kasus = ASUMSI TIM, dilabel.
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load
from app.ml.metrics import clamp

# Kapasitas jaringan saat puncak (dokumen): ">3 juta paket/hari" — patokan
# kapasitas jaringan, bukan demand. Dipakai sebagai checkpoint referensi.
DOC_NETWORK_PEAK_CAP_M = 3.0
# Basis harian = demand bulanan rata-rata ÷ hari (Table 4: 1.110jt ÷ 365).
_DAYS_PER_YEAR = 365.0
# Puncak musiman kasus: bulan tertinggi 105jt ÷ 30 hari ÷ basis harian ≈ 1,15×.
_SEASONAL_PEAK_MULT = 1.15

def _base_daily_m() -> float:
    """Beban harian rata-rata nasional dari Table 4 (juta paket/hari)."""
    data = load()
    total_m = sum(float(d["totalM"]) for d in data["monthlyDemand"])
    return total_m / _DAYS_PER_YEAR


def stress_test(
    peak_multiplier: float | None = None,
    surge_capacity_factor: float = 1.0,
    allow_spillover: bool = True,
) -> dict[str, Any]:
    """Uji beban puncak terhadap kapasitas 23 hub.

    Args:
        peak_multiplier: kelipatan beban puncak vs basis harian rata-rata
            (default = puncak musiman kasus 1,15×; festival Double 12 bisa 2–3×).
            Dijepit 1..10.
        surge_capacity_factor: kapasitas elastis saat puncak (mis. 1,15 = +15%
            buffer armada sewa). Dijepit 0,5..3.
        allow_spillover: bila True, overflow dialihkan ke hub ber-headroom.
    """
    pm = clamp(peak_multiplier if peak_multiplier is not None else _SEASONAL_PEAK_MULT, 1.0, 10.0, _SEASONAL_PEAK_MULT)
    cf = clamp(surge_capacity_factor, 0.5, 3.0, 1.0)

    data = load()
    hubs = [dict(h) for h in data["hubs"]]
    base_daily = _base_daily_m()

    # Distribusi beban puncak mengikuti pangsa BEBAN NORMAL tiap hub
    # (kapasitas × utilisasi kasus) — sehingga hub padat (Jakarta) menyerap surge
    # terbesar, hub longgar (Ambon/Jayapura) tetap ber-headroom. Ini mereproduksi
    # peristiwa kasus: Jakarta 1 overflow saat Double 12, hub lain bisa menerima.
    total_cap = sum(h["capacityM"] for h in hubs) or 1.0
    hub_normal_load = {h["code"]: h["capacityM"] * h["utilizationPct"] / 100 for h in hubs}
    total_normal_load = sum(hub_normal_load.values()) or 1.0
    total_peak_load = base_daily * pm

    rows: list[dict[str, Any]] = []
    total_breach_load = 0.0
    total_overflow_m = 0.0

    for h in hubs:
        share = hub_normal_load[h["code"]] / total_normal_load
        load_m = total_peak_load * share                 # beban puncak ke hub
        cap_eff = h["capacityM"] * cf                     # kapasitas efektif (juta/hari)
        util_pct = round(load_m / cap_eff * 100, 1) if cap_eff else 0.0
        breach = max(0.0, load_m - cap_eff)               # overflow (juta/hari)
        if breach > 0:
            total_breach_load += load_m
            total_overflow_m += breach
        rows.append({
            "name": h["name"],
            "code": h["code"],
            "region": h["region"],
            "capacityM": h["capacityM"],
            "capacityEffectiveM": round(cap_eff, 4),
            "peakLoadM": round(load_m, 4),
            "peakUtilPct": util_pct,
            "overflowM": round(breach, 4),
            "breached": breach > 1e-6,
        })

    overflowed = [r for r in rows if r["breached"]]
    for r in rows:
        r["critical"] = r["peakUtilPct"] > 100.0

    # ── Mitigasi spillover: alihkan overflow ke hub ber-headroom ──
    spill_moves: list[dict[str, Any]] = []
    if allow_spillover and total_overflow_m > 0:
        # Headroom hub = kapasitas efektif − beban (hanya hub tak-breach).
        receivers = [r for r in rows if not r["breached"]]
        remaining_headroom = {r["code"]: round(r["capacityEffectiveM"] - r["peakLoadM"], 4) for r in receivers}
        emitters = sorted(overflowed, key=lambda r: -r["overflowM"])
        # Urutkan penerima by headroom desc (greedy: headroom terbesar dulu).
        receivers_sorted = sorted(receivers, key=lambda r: -remaining_headroom[r["code"]])
        for e in emitters:
            need = e["overflowM"]
            for t in receivers_sorted:
                if need <= 1e-6:
                    break
                hr = remaining_headroom[t["code"]]
                if hr <= 1e-6:
                    continue
                qty = round(min(need, hr), 4)
                if qty <= 1e-6:
                    continue
                remaining_headroom[t["code"]] = round(hr - qty, 4)
                need = round(need - qty, 4)
                spill_moves.append({
                    "from": e["name"], "fromCode": e["code"],
                    "to": t["name"], "toCode": t["code"],
                    "quantityM": qty,
                })
            e["residualOverflowM"] = round(need, 4)
        for r in rows:
            if not r["breached"]:
                r["residualOverflowM"] = 0.0

    total_residual = round(sum(r.get("residualOverflowM", r["overflowM"]) for r in rows), 4)
    moved = round(sum(m["quantityM"] for m in spill_moves), 4)

    # ── Backlog & waktu pemulihan ──
    # Asumsi tim: drain rate pasca-puncak = 20% kapasitas efektif nasional/hari.
    _DRAIN_FRAC = 0.20
    drain_per_day = total_cap * cf * _DRAIN_FRAC
    recovery_days = round(total_residual / drain_per_day, 1) if drain_per_day and total_residual > 0 else 0.0

    return {
        "engine": "Peak-Surge Stress-Test (Table 1 kapasitas × amplifikasi puncak)",
        "note": (
            "Basis harian dari Table 4 (1.110jt/365). Puncak '>3 juta/hari' dari dokumen "
            "(Double 12 2022). Pangsa beban per hub = pangsa kapasitas (proxy). "
            "Peak multiplier, faktor kapasitas surge, drain rate = ASUMSI TIM (dilabel)."
        ),
        "inputs": {
            "peakMultiplier": pm,
            "surgeCapacityFactor": cf,
            "allowSpillover": allow_spillover,
        },
        "reference": {
            "docNetworkPeakCapM": DOC_NETWORK_PEAK_CAP_M,
            "seasonalPeakMult": _SEASONAL_PEAK_MULT,
            "baseDailyM": round(base_daily, 4),
            "totalCapacityPerDayM": round(total_cap, 4),
            "double12Date": "Des 2022",
        },
        "summary": {
            "totalPeakLoadM": round(total_peak_load, 4),
            "hubBreached": len(overflowed),
            "hubCount": len(rows),
            "totalOverflowM": round(total_overflow_m, 4),
            "spilloverMovedM": moved,
            "residualOverflowM": total_residual,
            "recoveryDays": recovery_days,
            "nationalUtilPct": round(total_peak_load / (total_cap * cf) * 100, 1) if total_cap else 0.0,
        },
        "hubs": sorted(rows, key=lambda r: -r["peakUtilPct"]),
        "spillover": spill_moves,
    }
