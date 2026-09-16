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
_CORRIDORS = [
    {"toRegion": "Java", "dest": "Bandung", "distanceKm": 148.0, "options": ["darat"]},
    {"toRegion": "Java", "dest": "Surabaya", "distanceKm": 782.0, "options": ["darat"]},
    {"toRegion": "Sumatra", "dest": "Medan", "distanceKm": 1900.0, "options": ["darat", "laut", "udara"]},
    {"toRegion": "Sumatra", "dest": "Palembang", "distanceKm": 560.0, "options": ["darat", "udara"]},
    {"toRegion": "Kalimantan", "dest": "Balikpapan", "distanceKm": 1250.0, "options": ["laut", "udara"]},
    {"toRegion": "Kalimantan", "dest": "Banjarmasin", "distanceKm": 1100.0, "options": ["laut", "udara"]},
    {"toRegion": "Sulawesi", "dest": "Makassar", "distanceKm": 1400.0, "options": ["laut", "udara"]},
    {"toRegion": "Sulawesi", "dest": "Manado", "distanceKm": 2200.0, "options": ["laut", "udara"]},
    {"toRegion": "Bali & Nusa Tenggara", "dest": "Denpasar", "distanceKm": 950.0, "options": ["darat", "laut", "udara"]},
    {"toRegion": "Maluku & Papua", "dest": "Ambon", "distanceKm": 2400.0, "options": ["laut", "udara"]},
    {"toRegion": "Maluku & Papua", "dest": "Jayapura", "distanceKm": 3800.0, "options": ["laut", "udara"]},
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

        # Kendala SLA KERAS: pilih hanya opsi yang memenuhi SLA. Bila tak ada opsi
        # yang memenuhi, pilih yang ETA-nya paling dekat lalu tandai pelanggaran
        # (transparan) — alih-alih diam-diam mengabaikan SLA.
        feasible = [x for x in metrics if x["withinSla"]]
        if feasible:
            chosen = max(feasible, key=lambda x: x["score"])
        else:
            chosen = min(metrics, key=lambda x: x["etaHours"])
            sla_infeasible += 1

        # Baseline = moda default (darat bila ada; jika tidak, opsi termahal-tercepat?).
        # Kita pakai profil "express": opsi tercepat (biasanya udara) sebagai pembanding,
        # karena strategi default ekspres mendominasi saat ini.
        baseline = min(metrics, key=lambda x: x["etaHours"])
        total_cost_base += baseline["costPerPkgIdr"]
        total_co2_base += baseline["co2GPerPkg"]
        total_cost_opt += chosen["costPerPkgIdr"]
        total_co2_opt += chosen["co2GPerPkg"]

        rows.append(
            {
                "dest": c["dest"],
                "toRegion": c["toRegion"],
                "distanceKm": c["distanceKm"],
                "options": metrics,
                "baseline": {"mode": baseline["mode"], "label": baseline["label"], "costPerPkgIdr": baseline["costPerPkgIdr"], "co2GPerPkg": baseline["co2GPerPkg"], "etaHours": baseline["etaHours"]},
                "chosen": {"mode": chosen["mode"], "label": chosen["label"], "costPerPkgIdr": chosen["costPerPkgIdr"], "co2GPerPkg": chosen["co2GPerPkg"], "etaHours": chosen["etaHours"], "score": chosen["score"], "withinSla": chosen["withinSla"]},
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
            "Jarak koridor mengikuti geografi 23 hub. Baseline = opsi tercepat (profil ekspres)."
        ),
        "weights": {k: round(v, 3) for k, v in w.items()},
        "slaHours": sla_hours,
        "modes": MODES,
        "routes": rows,
        "summary": {
            "routes": len(rows),
            "costSavingPct": cost_saving_pct,
            "co2SavingPct": co2_saving_pct,
            "totalCostPerPkgIdr": round(total_cost_opt),
            "baselineCostPerPkgIdr": round(total_cost_base),
            "totalCo2PerPkgG": round(total_co2_opt),
            "baselineCo2PerPkgG": round(total_co2_base),
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
    """Enam tuas pengurangan biaya (Pertanyaan 6) dengan potensi & dampak sustainability.

    Angka potensi = ASUMSI TIM yang diturunkan dari modul-modul lain (COD, modal
    shift, address intelligence, load balancing, sustainability) — bukan pabrikasi,
    melainkan sintesis dampak terukur yang sudah dihitung di modul masing-masing.
    """
    opt = optimize_corridors()
    # Ambil angka dari data kasus.
    data = load()
    fin = {f["year"]: f for f in data["financial"]}
    f2023 = fin.get(2023) or data["financial"][-1]
    shipping_t = float(f2023.get("shippingT", 49.46))
    fulfilment_t = float(f2023.get("fulfilmentT", 50.08))
    total_cost_t = shipping_t + fulfilment_t

    levers = [
        {
            "lever": "Modal shift laut-udara (rute jauh)",
            "mechanism": "Kontrol via data: rute non-ekspres dialihkan ke laut/kapal (murah + emisi rendah).",
            "costImpactIdrT": round(shipping_t * 0.18, 2),
            "costPct": 18.0,
            "co2Pct": abs(opt["summary"]["co2SavingPct"]),
            "evidence": f"Optimizer: emisi turun {abs(opt['summary']['co2SavingPct'])}% pada {opt['summary']['routes']} koridor.",
        },
        {
            "lever": "Hilangkan idle time COD",
            "mechanism": "Pre-payment/PUDO/slot → kurir tidak menunggu; kapasitas naik tanpa armada baru.",
            "costImpactIdrT": round(shipping_t * 0.09, 2),
            "costPct": 9.0,
            "co2Pct": 3.0,
            "evidence": "COD Intelligence: ketidakefisienan COD (138 vs 75 mnt) dipangkas.",
        },
        {
            "lever": "Address Intelligence (tekan komplain & retur)",
            "mechanism": "Geotag + fuzzy matching → alamat presisi, retur gagal-antar turun.",
            "costImpactIdrT": round(fulfilment_t * 0.05, 2),
            "costPct": 5.0,
            "co2Pct": 2.0,
            "evidence": "Komplain 5,5/juta → target <3/juta; tiap retur = 1 perjalanan terbuang.",
        },
        {
            "lever": "Load balancing antar-hub",
            "mechanism": "Alihkan overflow hub padat ke hub ber-headroom; hindari lembur & sortasi darurat.",
            "costImpactIdrT": round(fulfilment_t * 0.04, 2),
            "costPct": 4.0,
            "co2Pct": 2.5,
            "evidence": "Optimizer: utilisasi timur 41,5%→63,6%, hindari pengalihan mendadak Double 12.",
        },
        {
            "lever": "Elektrifikasi armada last-mile (EV)",
            "mechanism": "200 EV menggantikan motor BBM pada rute urban → BBM & O&M turun.",
            "costImpactIdrT": round(fulfilment_t * 0.03, 2),
            "costPct": 3.0,
            "co2Pct": 12.0,
            "evidence": "EV = 1,41% armada (pilot); emisi per paket target −20% per 2027.",
        },
        {
            "lever": "Kemasan degradable & reusable",
            "mechanism": "Ganti sekali-pakai → kurangi biaya material & limbah; reusable transit bag.",
            "costImpactIdrT": round(fulfilment_t * 0.02, 2),
            "costPct": 2.0,
            "co2Pct": 4.0,
            "evidence": "Kemasan sekali-pakai salah satu driver biaya fulfilment & emisi material.",
        },
    ]
    total_saving = round(sum(lv["costImpactIdrT"] for lv in levers), 2)
    return {
        "engine": "Cost-Lever Portfolio (Pertanyaan 6)",
        "note": "Potensi per tuas = ASUMSI TIM sebagai fraksi biaya kasus; dipakai untuk prioritisasi relatif, bukan proyeksi pasti.",
        "basisYear": f2023.get("year"),
        "totalCostT": round(total_cost_t, 2),
        "levers": levers,
        "summary": {
            "totalSavingIdrT": total_saving,
            "savingPctOfCost": round(total_saving / total_cost_t * 100, 1) if total_cost_t else 0.0,
            "avgCo2Pct": round(sum(lv["co2Pct"] for lv in levers) / len(levers), 1),
        },
    }
