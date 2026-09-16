"""Network Optimization Engine — alokasi ulang volume lintas hub (load balancing).

Masalah nyata dari kasus:
  * Hub Jakarta over-utilisasi 90,4% (kapasitas 0,563M/hari) → overload,
    memicu "Double 12 2022" harus mengalihkan paket mendadak.
  * Hub timur (Kalimantan/Sulawesi/Papua) under-utilisasi (<50%) → biaya
    jaringan tetap tinggi per paket.

Engine ini memformalkan pengalihan sebagai masalah transportasi terbatas:
  * Sumber  = hub over-utilisasi (util > ambang critical 65%).
  * Tujuan  = hub dengan headroom (util < ambang warn 50%).
  * Biaya   = jarak geografis (proxy: dipisah antar-region lebih mahal),
    didekati dengan matriks biaya relatif region (bukan koordinat — tetap
    deterministik tanpa dependensi peta di backend).
  * Kendala = (1) headroom tujuan, (2) sumber tak boleh di bawah lantai aman
    (mis. tetap >= 60% setelah dialihkan), (3) maksimum porsi per sumber.

Diselesaikan dengan greedy "cheapest link first" (transportation heuristic):
dipilih pasangan (sumber,tujuan) termurah yang masih punya kapasitas, alokasi
sebesar min(sisa_kebutuhan, headroom). Cukup untuk 23 node, deterministik, dan
transparan (setiap keputusan alokasi terekam).
"""
from __future__ import annotations

from typing import Any

from app.db.loader import load
from app.ml.metrics import UTIL_CRITICAL, UTIL_WARN, clamp

# Matriks biaya relatif antar region (indeks: 0 = termurah/sama region).
# Merupakan proxy logistik (jarak+transshipment+risiko). Angka prototipe tim,
# bukan data tarif nyata — dinyatakan eksplisit di respons.
_REGION_COST = {
    "Java": {"Java": 1.0, "Sumatra": 3.0, "Kalimantan": 4.5, "Sulawesi": 6.0, "Bali & Nusa Tenggara": 5.0, "Maluku & Papua": 8.0},
    "Sumatra": {"Java": 3.0, "Sumatra": 1.0, "Kalimantan": 4.0, "Sulawesi": 6.5, "Bali & Nusa Tenggara": 4.5, "Maluku & Papua": 8.5},
    "Kalimantan": {"Java": 4.5, "Sumatra": 4.0, "Kalimantan": 1.0, "Sulawesi": 3.5, "Bali & Nusa Tenggara": 4.0, "Maluku & Papua": 6.0},
    "Sulawesi": {"Java": 6.0, "Sumatra": 6.5, "Kalimantan": 3.5, "Sulawesi": 1.0, "Bali & Nusa Tenggara": 4.5, "Maluku & Papua": 4.0},
    "Bali & Nusa Tenggara": {"Java": 5.0, "Sumatra": 4.5, "Kalimantan": 4.0, "Sulawesi": 4.5, "Bali & Nusa Tenggara": 1.0, "Maluku & Papua": 5.5},
    "Maluku & Papua": {"Java": 8.0, "Sumatra": 8.5, "Kalimantan": 6.0, "Sulawesi": 4.0, "Bali & Nusa Tenggara": 5.5, "Maluku & Papua": 1.0},
}

# Ambang dari sumber kanonik (metrics.py) — jangan definisikan ulang di sini.
CRITICAL = UTIL_CRITICAL     # ambang over-utilisasi (harus dialihkan)
WARN_UTIL = UTIL_WARN        # ambang hub ber-headroom (target penerima)
SAFE_FLOOR = 60.0  # lantai aman: sumber tidak diturunkan di bawah ini
MAX_DIVERT_FRAC = 0.35  # maksimum 35% kapasitas sumber boleh dialihkan


def _cost(src_region: str, dst_region: str) -> float:
    return _REGION_COST.get(src_region, {}).get(dst_region, 9.9)


def optimize_load_balance(
    critical: float | None = None,
    safe_floor: float | None = None,
    max_divert_frac: float | None = None,
    warn_util: float | None = None,
) -> dict[str, Any]:
    """Hitung rencana pengalihan + sebelum/sesudah per hub & dampak biaya proxy.

    Ambang dapat di-override (simulasi interaktif): ``critical`` (default 65),
    ``safe_floor`` (60), ``max_divert_frac`` (0,35), ``warn_util`` (50, batas hub
    penerima). Semua dijepit ke rentang aman & konsisten satu sama lain.
    """
    crit = clamp(critical if critical is not None else CRITICAL, 10.0, 99.0, CRITICAL)
    floor = clamp(safe_floor if safe_floor is not None else SAFE_FLOOR, 0.0, 99.0, SAFE_FLOOR)
    # Lantai aman tak boleh melebihi ambang kritis (kalau tidak, tak ada kebutuhan).
    floor = min(floor, crit)
    max_frac = clamp(max_divert_frac if max_divert_frac is not None else MAX_DIVERT_FRAC, 0.0, 1.0, MAX_DIVERT_FRAC)
    # Ambang penerima harus < kritis agar ada gradien sumber→tujuan (cegah hasil
    # kontradiktif 'overloadedAfter tak turun' saat critical diturunkan jauh).
    warn = clamp(warn_util if warn_util is not None else WARN_UTIL, 0.0, 99.0, WARN_UTIL)
    warn = min(warn, crit - 1.0) if crit > 1.0 else warn

    hubs = [dict(h) for h in load()["hubs"]]

    # Volume efektif & headroom.
    for h in hubs:
        h["usedM"] = round(h["capacityM"] * h["utilizationPct"] / 100, 4)
        headroom_frac = max(0.0, min(1.0, 1.0 - h["utilizationPct"] / 100))
        h["headroomM"] = round(h["capacityM"] * headroom_frac, 4)
        h["divertCapM"] = round(h["capacityM"] * max_frac, 4)

    sources = [h for h in hubs if h["utilizationPct"] > crit]
    # Tujuan: hub ber-headroom dengan utilisasi < ambang warn (kini IKUT parameter,
    # bukan hardcode 50) → gradien sumber/tujuan selalu ada.
    targets = [h for h in hubs if h["utilizationPct"] < warn and h["headroomM"] > 0]

    # Kebutuhan pengalihan tiap sumber: turunkan ke lantai aman (SAFE_FLOOR),
    # dibatasi porsi maksimum.
    for s in sources:
        floor_vol = s["capacityM"] * floor / 100
        need = max(0.0, s["usedM"] - floor_vol)
        s["needM"] = round(min(need, s["divertCapM"]), 4)
        s["remainingNeedM"] = s["needM"]

    moves: list[dict[str, Any]] = []
    remaining_headroom = {t["code"]: t["headroomM"] for t in targets}

    # Greedy: urutkan semua pasangan (sumber,tujuan) berdasarkan biaya naik.
    pairs = sorted(
        ((s, t) for s in sources for t in targets),
        key=lambda st: (_cost(st[0]["region"], st[1]["region"]), -remaining_headroom[st[1]["code"]]),
    )
    for s, t in pairs:
        if s["remainingNeedM"] <= 1e-6:
            continue
        hr = remaining_headroom[t["code"]]
        if hr <= 1e-6:
            continue
        qty = round(min(s["remainingNeedM"], hr), 4)
        if qty <= 1e-6:
            continue
        s["remainingNeedM"] = round(s["remainingNeedM"] - qty, 4)
        remaining_headroom[t["code"]] = round(hr - qty, 4)
        moves.append(
            {
                "from": s["name"],
                "fromCode": s["code"],
                "to": t["name"],
                "toCode": t["code"],
                "quantityM": qty,
                "costIndex": _cost(s["region"], t["region"]),
                "sameRegion": s["region"] == t["region"],
            }
        )

    # Hitung keadaan sesudah.
    moved_out: dict[str, float] = {}
    moved_in: dict[str, float] = {}
    for m in moves:
        moved_out[m["fromCode"]] = moved_out.get(m["fromCode"], 0.0) + m["quantityM"]
        moved_in[m["toCode"]] = moved_in.get(m["toCode"], 0.0) + m["quantityM"]

    after_rows: list[dict[str, Any]] = []
    for h in hubs:
        delta = moved_in.get(h["code"], 0.0) - moved_out.get(h["code"], 0.0)
        new_used = h["usedM"] + delta
        after_util = round(new_used / h["capacityM"] * 100, 1) if h["capacityM"] else 0.0
        after_rows.append(
            {
                "name": h["name"],
                "code": h["code"],
                "region": h["region"],
                "beforePct": h["utilizationPct"],
                "afterPct": after_util,
                "deltaPct": round(after_util - h["utilizationPct"], 1),
                "movedInM": round(moved_in.get(h["code"], 0.0), 4),
                "movedOutM": round(moved_out.get(h["code"], 0.0), 4),
            }
        )

    total_moved = round(sum(m["quantityM"] for m in moves), 4)
    over_before = sum(1 for h in hubs if h["utilizationPct"] > crit)
    over_after = sum(1 for r in after_rows if r["afterPct"] > crit)
    # Utilisasi timur (Kalimantan+Sulawesi+Maluku) sebelum vs sesudah.
    east_regions = {"Kalimantan", "Sulawesi", "Maluku & Papua"}
    east_before = [r["beforePct"] for r in after_rows if r["region"] in east_regions]
    east_after = [r["afterPct"] for r in after_rows if r["region"] in east_regions]
    avg = lambda xs: round(sum(xs) / len(xs), 1) if xs else 0.0

    return {
        "engine": "transportation-heuristic (greedy cheapest-link-first)",
        "note": "Biaya = indeks relatif antar-region (proxy prototipe), bukan tarif nyata. Kendala: headroom tujuan, lantai aman 60%, maks 35% dialihkan.",
        "thresholds": {"critical": crit, "safeFloor": floor, "maxDivertFrac": max_frac, "warnUtil": warn},
        "summary": {
            "totalMovedM": total_moved,
            "moves": len(moves),
            "overloadedBefore": over_before,
            "overloadedAfter": over_after,
            "eastAvgUtilBefore": avg(east_before),
            "eastAvgUtilAfter": avg(east_after),
            "unmetM": round(sum(s["remainingNeedM"] for s in sources), 4),
        },
        "moves": moves,
        "hubs": after_rows,
    }
