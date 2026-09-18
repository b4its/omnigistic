"""Modal-Shift & Cost-Lever Optimizer — menjawab Pertanyaan 6 studi kasus.

Tantangan 6: "Other strategy to reduce cost while maintaining revenue? Consider
the sustainability aspect."

Kasus menyebut tiga moda: darat (dikelola GC: van/truk/motor), udara (belly
komersial + cargo plane, pihak ketiga), laut (kargo kontainer, pihak ketiga).
Control Tower dirancang untuk "modal shift optimizer (murah+rendah emisi vs
ekspres)" — tetapi belum diimplementasikan.

Modul ini mengisi celah itu secara konkret:
  1. Setiap rute/koridor punya jarak (km) dan dua pilihan moda (mis. darat vs
     laut, atau darat vs udara). Tiap moda punya: biaya per paket per km,
     emisi gram CO2 per paket per km, dan kecepatan (km/jam).
  2. Optimizer memilih moda per rute berdasarkan objektif berbobot
     (biaya, emisi, kecepatan) dengan kendala SLA (ETA maksimum).
  3. Output: moda terpilih, penghematan biaya, penghematan emisi, dan delta ETA
     — menjawab "reduce cost + sustainability" secara kuantitatif.

Parameter biaya/emisi/kecepatan = ASUMSI TIM (tidak ada di dokumen), berlabel.
Jarak & konteks koridor mengikuti geografi kasus (23 hub tersebar di 6 region).
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load
from app.ml.metrics import clamp
from app.ml.pnl import LEVERS

# ── Profil moda (asumsi tim — dapat di-override via API) ────────────────────
# costIdrPerPkgKm : biaya per paket per km (IDR)
# co2GPerPkgKm    : emisi gram CO2 per paket per km
# speedKmh        : kecepatan efektif rata-rata
# owned           : dikelola GC sendiri?
MODES: dict[str, dict[str, Any]] = {
    "darat": {"label": "Darat (van/truk)", "costIdrPerPkgKm": 420.0, "co2GPerPkgKm": 96.0, "speedKmh": 45.0, "owned": True},
    "laut": {"label": "Laut (kontainer, mitra)", "costIdrPerPkgKm": 140.0, "co2GPerPkgKm": 22.0, "speedKmh": 18.0, "owned": False},
    "udara": {"label": "Udara (belly/cargo, mitra)", "costIdrPerPkgKm": 1850.0, "co2GPerPkgKm": 620.0, "speedKmh": 650.0, "owned": False},
}

# Bobot objektif default (dinormalisasi). SLA = batas ETA jam (kendala keras).
DEFAULT_WEIGHTS = {"cost": 0.5, "emission": 0.3, "speed": 0.2}
DEFAULT_SLA_HOURS = 48.0

# Koridor antar-region (jarak km perkiraan; konteks geografi kasus).
# Origin = hub Jawa (Jakarta) sebagai titik konsolidasi nasional.
# `current` = moda yang dipakai GC SEKARANG (asumsi tim — mencerminkan pola
# "cost naik lebih cepat dari sales": ekspres/udara dominan di lan jauh).
# Optimizer mencari moda lebih murah/bersih yang masih memenuhi SLA → saving =
# peralihan dari moda insiden ini.
_CORRIDORS = [
    {"toRegion": "Java", "dest": "Bandung", "distanceKm": 148.0, "options": ["darat", "laut", "udara"], "current": "darat"},
    {"toRegion": "Java", "dest": "Surabaya", "distanceKm": 782.0, "options": ["darat", "laut", "udara"], "current": "darat"},
    {"toRegion": "Sumatra", "dest": "Medan", "distanceKm": 1900.0, "options": ["darat", "laut", "udara"], "current": "udara"},
    {"toRegion": "Sumatra", "dest": "Palembang", "distanceKm": 560.0, "options": ["darat", "udara"], "current": "udara"},
    {"toRegion": "Kalimantan", "dest": "Balikpapan", "distanceKm": 1250.0, "options": ["laut", "udara"], "current": "udara"},
    {"toRegion": "Kalimantan", "dest": "Banjarmasin", "distanceKm": 1100.0, "options": ["laut", "udara"], "current": "udara"},
    {"toRegion": "Sulawesi", "dest": "Makassar", "distanceKm": 1400.0, "options": ["laut", "udara"], "current": "udara"},
    {"toRegion": "Sulawesi", "dest": "Manado", "distanceKm": 2200.0, "options": ["laut", "udara"], "current": "udara"},
    {"toRegion": "Bali & Nusa Tenggara", "dest": "Denpasar", "distanceKm": 950.0, "options": ["darat", "laut", "udara"], "current": "udara"},
    {"toRegion": "Maluku & Papua", "dest": "Ambon", "distanceKm": 2400.0, "options": ["laut", "udara"], "current": "udara"},
    {"toRegion": "Maluku & Papua", "dest": "Jayapura", "distanceKm": 3800.0, "options": ["laut", "udara"], "current": "udara"},
]


def _route_metrics(distance_km: float, mode_key: str) -> dict[str, Any]:
    m = MODES[mode_key]
    cost = m["costIdrPerPkgKm"] * distance_km
    co2 = m["co2GPerPkgKm"] * distance_km
    eta_h = distance_km / m["speedKmh"] if m["speedKmh"] else 0.0
    return {
        "mode": mode_key,
        "label": m["label"],
        "costPerPkgIdr": round(cost),
        "co2GPerPkg": round(co2),
        "etaHours": round(eta_h, 1),
        "owned": m["owned"],
        "distanceKm": distance_km,
    }


def optimize_corridors(
    mode_filter: list[str] | None = None,
    weights: dict[str, float] | None = None,
    sla_hours: float = DEFAULT_SLA_HOURS,
) -> dict[str, Any]:
    """Pilih moda optimal tiap koridor menurut objektif berbobot + kendala SLA.

    Args:
        mode_filter: bila diisi, hanya pertimbangkan moda ini (mis. ["laut","udara"]).
        weights: bobot objektif {cost, emission, speed}; dinormalisasi otomatis.
        sla_hours: batas ETA (jam) — opsi melebihi ini tidak dipilih.
    """
    # Validasi input: SLA harus > 0 (dijepit ke rentang wajar), bobot ≥ 0 & dikenal,
    # mode_filter hanya nama moda yang ada (kalau tak ada yang sah → semua moda).
    sla_hours = clamp(sla_hours, 1.0, 240.0, DEFAULT_SLA_HOURS)
    w = dict(DEFAULT_WEIGHTS)
    if weights:
        w.update({k: clamp(v, 0.0, 1e6, w[k]) for k, v in weights.items() if k in w})
    total_w = sum(w.values())
    # Semua bobot 0 → objektif tak terdefinisi; fallback ke bobot default (transparan).
    if total_w <= 0:
        w = dict(DEFAULT_WEIGHTS)
        total_w = sum(w.values()) or 1.0
    w = {k: v / total_w for k, v in w.items()}
    valid_modes = set(MODES.keys())
    filter_requested = bool(mode_filter)
    if mode_filter:
        mode_filter = [m for m in mode_filter if m in valid_modes]
    # Filter diminta tapi tak ada moda sah → kembalikan tanpa rute (eksplisit),
    # bukan diam-diam memakai semua moda.
    filter_rejected = filter_requested and not mode_filter

    rows: list[dict[str, Any]] = []
    total_cost_base = 0.0
    total_cost_opt = 0.0
    total_co2_base = 0.0
    total_co2_opt = 0.0
    sla_infeasible = 0  # jumlah koridor yang tak punya opsi memenuhi SLA
    shifted_routes = 0  # jumlah koridor yang benar-benar berpindah moda

    for c in _CORRIDORS:
        if filter_rejected:
            break
        opts = [m for m in c["options"] if not mode_filter or m in mode_filter]
        if not opts:
            continue
        metrics = [_route_metrics(c["distanceKm"], m) for m in opts]

        # Normalisasi min-max per koridor untuk skor (cost rendah & emisi rendah & cepat = baik).
        costs = [x["costPerPkgIdr"] for x in metrics]
        co2s = [x["co2GPerPkg"] for x in metrics]
        etas = [x["etaHours"] for x in metrics]
        cmin, cmax = min(costs), max(costs)
        emin, emax = min(co2s), max(co2s)
        tmin, tmax = min(etas), max(etas)

        def norm(v: float, lo: float, hi: float) -> float:
            return 1.0 if hi == lo else 1.0 - (v - lo) / (hi - lo)  # makin rendah nilai → skor makin tinggi

        for x in metrics:
            x["score"] = round(
                w["cost"] * norm(x["costPerPkgIdr"], cmin, cmax)
                + w["emission"] * norm(x["co2GPerPkg"], emin, emax)
                + w["speed"] * norm(x["etaHours"], tmin, tmax),
                4,
            )
            x["withinSla"] = x["etaHours"] <= sla_hours

        # Baseline = moda INSIDEN eksplisit per koridor (`c["current"]`), yaitu cara
        # GC mengirim koridor ini SEKARANG (asumsi tim: ekspres/udara dominan di lan
        # jauh → akar "cost naik > sales"). saving = penghematan dari peralihan nyata.
        incumbent_key = c.get("current") or c["options"][0]
        baseline = next((x for x in metrics if x["mode"] == incumbent_key), metrics[0])

        # Kendala SLA: kandidat = opsi yang memenuhi SLA. Moda INSIDEN selalu
        # dianggap layak (tak masuk akal "melanggar SLA" dgn moda yang justru dipakai
        # sekarang) → SLA jadi target peningkatan, bukan pemicu pindah ke moda mahal.
        feasible = [x for x in metrics if x["withinSla"] or x["mode"] == baseline["mode"]]
        chosen = max(feasible, key=lambda x: x["score"])
        # SLA hanya benar-benar tak terpenuhi bila moda terbaik PUN masih > SLA.
        if not chosen["withinSla"]:
            sla_infeasible += 1
        changed = chosen["mode"] != baseline["mode"]
        # Agregat hanya menjumlah koridor yang BENAR-BENAR berpindah moda, agar
        # persentase saving tidak "diencerkan" koridor yang tak berubah.
        baseline_cost = baseline["costPerPkgIdr"]
        baseline_co2 = baseline["co2GPerPkg"]
        if changed:
            total_cost_base += baseline_cost
            total_co2_base += baseline_co2
        total_cost_opt += chosen["costPerPkgIdr"] if changed else 0.0
        total_co2_opt += chosen["co2GPerPkg"] if changed else 0.0
        if changed:
            shifted_routes += 1

        rows.append(
            {
                "dest": c["dest"],
                "toRegion": c["toRegion"],
                "distanceKm": c["distanceKm"],
                "options": metrics,
                "baseline": {"mode": baseline["mode"], "label": baseline["label"], "costPerPkgIdr": baseline["costPerPkgIdr"], "co2GPerPkg": baseline["co2GPerPkg"], "etaHours": baseline["etaHours"]},
                "chosen": {"mode": chosen["mode"], "label": chosen["label"], "costPerPkgIdr": chosen["costPerPkgIdr"], "co2GPerPkg": chosen["co2GPerPkg"], "etaHours": chosen["etaHours"], "score": chosen["score"], "withinSla": chosen["withinSla"]},
                "changed": changed,
                # saving = baseline − chosen (POSITIF = hemat biaya/emisi).
                "saving": {
                    "costPerPkgIdr": baseline["costPerPkgIdr"] - chosen["costPerPkgIdr"],
                    "co2GPerPkg": baseline["co2GPerPkg"] - chosen["co2GPerPkg"],
                    "costPct": round((1 - chosen["costPerPkgIdr"] / baseline["costPerPkgIdr"]) * 100, 1) if baseline["costPerPkgIdr"] else 0.0,
                    "co2Pct": round((1 - chosen["co2GPerPkg"] / baseline["co2GPerPkg"]) * 100, 1) if baseline["co2GPerPkg"] else 0.0,
                },
            }
        )

    cost_saving_pct = round((1 - total_cost_opt / total_cost_base) * 100, 1) if total_cost_base else 0.0
    co2_saving_pct = round((1 - total_co2_opt / total_co2_base) * 100, 1) if total_co2_base else 0.0

    return {
        "engine": "Modal-Shift Optimizer (cost + emission + speed, kendala SLA)",
        "note": (
            "Biaya/emisi/kecepatan per moda = ASUMSI TIM (dokumen kasus tidak memuat tarif). "
            "Jarak koridor mengikuti geografi 23 hub. Baseline = moda default (insiden) tiap "
            "koridor; persentase hemat hanya menjumlah koridor yang benar-benar berpindah moda."
        ),
        "weights": {k: round(v, 3) for k, v in w.items()},
        "slaHours": sla_hours,
        "modes": MODES,
        "routes": rows,
        "summary": {
            "routes": len(rows),
            "routesShifted": shifted_routes,
            "costSavingPct": cost_saving_pct,
            "co2SavingPct": co2_saving_pct,
            # Nama jujur: ini INDEKS (jumlah biaya-per-paket lintas koridor, bobot
            # jarak berbeda) — bukan "biaya per paket" tunggal. Ditampilkan hanya
            # untuk perbandingan relatif baseline vs optimum.
            "totalCostIndexIdr": round(total_cost_opt),
            "baselineCostIndexIdr": round(total_cost_base),
            "totalCo2IndexG": round(total_co2_opt),
            "baselineCo2IndexG": round(total_co2_base),
            "modeMix": _mode_mix(rows),
            "slaInfeasibleRoutes": sla_infeasible,
            "filterRejected": filter_rejected,
        },
    }


def _mode_mix(rows: list[dict[str, Any]]) -> dict[str, int]:
    mix: dict[str, int] = {}
    for r in rows:
        m = r["chosen"]["mode"]
        mix[m] = mix.get(m, 0) + 1
    return mix


def cost_levers() -> dict[str, Any]:
    """Tuas pengurangan biaya (Pertanyaan 6) dengan potensi & dampak sustainability.

    **Satu sumber kebenaran**: memakai tabel tuas kanonik `pnl.LEVERS` (sama dgn
    yang dipakai Cost-Waterfall & P&L) agar kedua halaman TIDAK saling
    bertentangan. Angka potensi = ASUMSI TIM sebagai fraksi biaya kasus (Table 3),
    disintesis dari modul COD, modal-shift, address, load-balancing, sustainability.
    """
    # Ambil angka dari data kasus.
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    shipping_t = float(f2023.get("shippingT", 49.46))
    fulfilment_t = float(f2023.get("fulfilmentT", 50.08))
    total_cost_t = shipping_t + fulfilment_t

    levers = []
    for lv in LEVERS:
        base = shipping_t if lv["dim"] == "shipping" else fulfilment_t if lv["dim"] == "fulfilment" else total_cost_t
        levers.append({
            "lever": lv["lever"],
            "mechanism": lv["mechanism"],
            "costImpactIdrT": round(base * lv["frac"], 2),
            "costPct": round(lv["frac"] * 100, 1),
            "co2Pct": lv["co2Pct"],
            "evidence": lv["evidence"],
        })
    total_saving = round(sum(lv["costImpactIdrT"] for lv in levers), 2)
    return {
        "engine": "Cost-Lever Portfolio (Pertanyaan 6)",
        "note": "Potensi per tuas = ASUMSI TIM sebagai fraksi biaya kasus; dipakai untuk prioritisasi relatif, bukan proyeksi pasti. Tabel tuas = kanonik (sama dgn P&L Waterfall).",
        "basisYear": f2023.get("year"),
        "totalCostT": round(total_cost_t, 2),
        "levers": levers,
        "summary": {
            "totalSavingIdrT": total_saving,
            "savingPctOfCost": round(total_saving / total_cost_t * 100, 1) if total_cost_t else 0.0,
            "avgCo2Pct": round(sum(lv["co2Pct"] for lv in levers) / len(levers), 1),
        },
    }
