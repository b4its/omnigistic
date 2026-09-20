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
  4. Rencana mitraasi: spillover ke hub ber-headroom (greedy: headroom terbesar
     lebih dulu) + opsi buffer armada.

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


# --- Rencana lima lapis kanonik (analisis tim, Pertanyaan 2) --------------------
# Biaya load balancing: truk 8 ton ≈ 4.000 paket, 120 km, Rp3.000/km (ASUMSI TIM).
TRUCK_PACKAGES = 4_000
TRUCK_DISTANCE_KM = 120
TRUCK_COST_PER_KM_IDR = 3_000
# Capex hub baru (ASUMSI TIM) untuk perbandingan setara per paket.
NEW_HUB_CAPEX_IDR = 500_000_000_000
AMPLIFICATION_STEPS = (1.15, 1.30, 1.45, 2.00, 3.00)
FIVE_LAYERS: list[dict[str, str]] = [
    {"layer": "1. Peramalan dua arah", "content": "Fitur kalender musiman, kalender platform, dan kalender regulasi; target MAPE out-of-sample 5% sampai 8% dengan validasi walk-forward."},
    {"layer": "2. Base fleet", "content": "Armada tetap di persentil-70 permintaan bulanan, bukan puncak."},
    {"layer": "3. Kapasitas fleksibel", "content": "Mitra wajib +30% dengan notifikasi 48 jam dan dibayar saat dipakai; kurir on-demand; PUDO saat hub di atas 85%."},
    {"layer": "4. Load balancing", "content": "Hub pengirim di atas 78% memindahkan beban ke hub penerima di bawah 55%; lantai aman 60% di penerima; maksimal 35% beban dialihkan."},
    {"layer": "5. Playbook penurunan", "content": "Dipicu volume −12% selama tiga minggu berturut-turut."},
]
DOWNTURN_PLAYBOOK: list[dict[str, str]] = [
    {"when": "H+7", "action": "Hentikan kontrak fleksibel, alihkan volume ke hub berbiaya variabel terendah, bekukan rekrutmen."},
    {"when": "H+14", "action": "Ubah kontrak line-haul dari minimum volume ke per-trip, tunda capex non-kritis."},
    {"when": "H+30", "action": "Aktifkan portofolio non-e-commerce (B2B, dokumen, cold chain)."},
]
# Contoh Jakarta: alihkan 0,10 juta paket/hari (juta paket/hari).
JAKARTA_TRANSFERS = [("Bekasi-Karawang", 0.05), ("Bandung", 0.03), ("Yogyakarta", 0.02)]


def surge_plan() -> dict[str, Any]:
    """Rencana lima lapis kanonik (analisis tim, Pertanyaan 2).

    Aturan pecah mengikuti dokumen: sebuah hub melewati kapasitas bila
    `utilisasi dasar × amplifikasi > 100%`. Load balancing dibandingkan pada
    satuan setara (rupiah per paket) dengan capex hub baru.
    """
    data = load()
    hubs = {h["name"]: h for h in data["hubs"]}
    total_cap = sum(float(h["capacityM"]) for h in data["hubs"])
    total_load = sum(float(h["capacityM"]) * float(h["utilizationPct"]) / 100.0 for h in data["hubs"])
    national_util = total_load / total_cap if total_cap else 0.0

    amp: list[dict[str, Any]] = []
    for mult in AMPLIFICATION_STEPS:
        broken = [h["name"] for h in data["hubs"] if float(h["utilizationPct"]) / 100.0 * mult > 1.0]
        amp.append({
            "amplification": mult,
            "hubsBreached": len(broken),
            "hubs": broken if len(broken) <= 4 else [],
            "nationalUtilPct": round(national_util * mult * 100, 1),
        })

    lb_cost = TRUCK_DISTANCE_KM * TRUCK_COST_PER_KM_IDR / TRUCK_PACKAGES
    cap_avg_m = total_cap / len(data["hubs"]) if data["hubs"] else 0.0
    capex_per_pkg = {
        f"horizon{years}": round(NEW_HUB_CAPEX_IDR / (cap_avg_m * 1e6 * 365 * years))
        for years in (5, 10)
    }

    jkt = hubs["Jakarta"]
    jkt_vol = float(jkt["capacityM"]) * float(jkt["utilizationPct"]) / 100.0
    moved = sum(q for _, q in JAKARTA_TRANSFERS)
    jkt_after = (jkt_vol - moved) / float(jkt["capacityM"]) * 100
    receivers = []
    for name, qty in JAKARTA_TRANSFERS:
        h = hubs[name]
        vol = float(h["capacityM"]) * float(h["utilizationPct"]) / 100.0
        receivers.append({
            "hub": name,
            "movedM": qty,
            "utilizationBeforePct": h["utilizationPct"],
            "utilizationAfterPct": round((vol + qty) / float(h["capacityM"]) * 100, 1),
        })

    return {
        "engine": "Surge Plan (lima lapis + load balancing)",
        "note": (
            "Aturan pecah mengikuti dokumen: utilisasi dasar x amplifikasi di atas 100 persen. "
            "Biaya load balancing (truk 8 ton = 4.000 paket, 120 km, Rp3.000/km), capex hub "
            "baru, dan porsi lapis = ASUMSI TIM (dilabel)."
        ),
        "amplificationTable": amp,
        "loadBalancing": {
            "costPerPackageIdr": round(lb_cost),
            "derivation": f"({TRUCK_DISTANCE_KM} km x Rp{TRUCK_COST_PER_KM_IDR:,}/km) / {TRUCK_PACKAGES:,} paket",
            "note": "Load balancing jauh lebih murah daripada membangun hub baru dan menunda capex.",
        },
        "newHubCapexPerPackageIdr": capex_per_pkg,
        "capexNote": (
            f"Capex hub baru Rp{NEW_HUB_CAPEX_IDR / 1e9:,.0f} miliar dibandingkan pada satuan setara: "
            f"kapasitas hub rata-rata {cap_avg_m:.4f} juta paket per hari."
        ),
        "layers": FIVE_LAYERS,
        "downturnPlaybook": DOWNTURN_PLAYBOOK,
        "jakartaExample": {
            "movedTotalM": round(moved, 2),
            "utilizationBeforePct": jkt["utilizationPct"],
            "utilizationAfterPct": round(jkt_after, 1),
            "receivers": receivers,
        },
    }


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
    total_overflow_m = 0.0

    for h in hubs:
        share = hub_normal_load[h["code"]] / total_normal_load
        load_m = total_peak_load * share                 # beban puncak ke hub
        cap_eff = h["capacityM"] * cf                     # kapasitas efektif (juta/hari)
        util_pct = round(load_m / cap_eff * 100, 1) if cap_eff else 0.0
        breach = max(0.0, load_m - cap_eff)               # overflow (juta/hari)
        if breach > 0:
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
            # Selalu ada (0 bila tak overflow / spillover dimatikan) agar kontrak
            # respons konsisten untuk semua pemanggil.
            "residualOverflowM": round(breach, 4),
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
            "Basis harian dari Table 4 (1.110 juta/365). Puncak '>3 juta per hari' dari dokumen "
            "(Double 12 2022). Pangsa beban per hub = pangsa BEBAN NORMAL "
            "(kapasitas × utilisasi kasus). "
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
        "plan": surge_plan(),
    }
