"""Metrik turunan & rekonsiliasi — dihitung dari `shared/data-kas.json` (sumber tunggal).

Tujuan:
  * Menyediakan SATU tempat untuk semua angka turunan (rasio biaya, indeks musiman,
    growth, agregat region) sehingga tidak ada lagi angka "hardcode" yang
    berselisih antar halaman/frontend.
  * Menyatakan terang-terangan mana yang dihitung (derived) vs mana yang
    tertulis di dokumen kasus (source), termasuk menemukan inkonsistensi pada
    dokumen asli (mis. total e-commerce Tabel 4).

Filosofi: angka dari dokumen kasus = kebenaran; bila dokumen sendiri tidak
konsisten, kita hitung ulang dari baris (row-level) dan laporkan selisihnya.
"""
from __future__ import annotations

import math
from typing import Any

from app.db.loader import load


def clamp(value: Any, lo: float, hi: float, default: float) -> float:
    """Jepit nilai numerik ke [lo, hi], aman untuk None/NaN/inf/tipe salah.

    NaN & ±inf → default (bukan diteruskan, karena min/max Python meneruskan NaN
    dan JSON serialization menghasilkan NaN yang tak valid). Menjadi helper
    bersama agar semua mesin konsisten memvalidasi input pengguna.
    """
    try:
        x = float(value)
    except (TypeError, ValueError):
        return default
    if not math.isfinite(x):
        return default
    return min(hi, max(lo, x))


# Urutan & label region sesuai dokumen kasus (Tabel 1).
REGION_ORDER = [
    "Java",
    "Sumatra",
    "Kalimantan",
    "Sulawesi",
    "Bali & Nusa Tenggara",
    "Maluku & Papua",
]

# Region yang direkomendasikan untuk Regional Sponsor Model (utilisasi rendah,
# jaringan mahal per paket). Ambang mengikuti angka kasus (utilisasi < 50%).
SPONSOR_CANDIDATE_REGIONS = {"Kalimantan", "Sulawesi", "Maluku & Papua"}

# Ambang utilisasi KANONIK (satu sumber kebenaran) — dipakai optimize.py &
# sponsor.py agar tak ada tiga definisi yang bisa melenceng.
UTIL_WARN = 50.0       # di bawah ini: hub ber-headroom / kandidat sponsor
UTIL_CRITICAL = 65.0   # di atas ini: hub over-utilisasi (perlu dialihkan)
UTIL_THRESHOLD = {"warn": UTIL_WARN, "critical": UTIL_CRITICAL}


def _roi(a: float, b: float) -> float:
    """Persentase perubahan a→b (bila a=0 → 0.0 agar tidak divide-by-zero)."""
    return round((b / a - 1) * 100, 1) if a else 0.0


def region_summary() -> list[dict[str, Any]]:
    """Agregat per region: jumlah hub, kapasitas total, rata-rata utilisasi, outlets."""
    hub_rows = load()["hubs"]
    out: list[dict[str, Any]] = []
    for region in REGION_ORDER:
        hubs = [h for h in hub_rows if h["region"] == region]
        if not hubs:
            continue
        cap = round(sum(h["capacityM"] for h in hubs), 3)
        util = round(sum(h["utilizationPct"] for h in hubs) / len(hubs), 1)
        outlets = sum(h["outlets"] for h in hubs)
        # Volume (efektif) = kapasitas * utilisasi.
        used = round(sum(h["capacityM"] * h["utilizationPct"] / 100 for h in hubs), 3)
        out.append(
            {
                "region": region,
                "hubs": len(hubs),
                "capacityM": cap,
                "avgUtilizationPct": util,
                "outlets": outlets,
                "usedVolumeM": used,
                "sponsorCandidate": region in SPONSOR_CANDIDATE_REGIONS,
            }
        )
    return out


def financial_summary() -> dict[str, Any]:
    """Rasio biaya/sales per tahun + growth 2020→2023 (Tabel 3)."""
    fin = load()["financial"]
    rows = []
    for f in fin:
        total_cost = round(f["fulfilmentT"] + f["shippingT"], 2)
        c2s = round(total_cost / f["netSalesT"] * 100, 1) if f["netSalesT"] else 0.0
        rows.append(
            {
                "year": f["year"],
                "fulfilmentT": f["fulfilmentT"],
                "shippingT": f["shippingT"],
                "totalCostT": total_cost,
                "netSalesT": f["netSalesT"],
                "costToSalesPct": c2s,
            }
        )
    first, last = rows[0], rows[-1]
    return {
        "rows": rows,
        "growth": {
            "fulfilmentPct": _roi(first["fulfilmentT"], last["fulfilmentT"]),
            "shippingPct": _roi(first["shippingT"], last["shippingT"]),
            "netSalesPct": _roi(first["netSalesT"], last["netSalesT"]),
            "costGrewFasterThanSales": _roi(first["totalCostT"], last["totalCostT"])
            > _roi(first["netSalesT"], last["netSalesT"]),
        },
    }


def demand_summary() -> dict[str, Any]:
    """Agregat demand 2023 + deteksi shock + rekonsiliasi total (Tabel 4).

    Temuan: baris e-commerce Tabel 4 dijumlahkan = 651, sedangkan total yang
    TERTULIS di dokumen = 641 (selisih 10 unit). Kami laporkan keduanya dan
    memakai hasil hitung-baris sebagai nilai kanonik (row-level truth).
    """
    rows = load()["monthlyDemand"]
    total_sum = sum(int(r["totalM"]) for r in rows)
    ec_sum = sum(int(r["ecommerceM"]) for r in rows)
    totals = [int(r["totalM"]) for r in rows]
    peak = max(rows, key=lambda r: r["totalM"])
    trough = min(rows, key=lambda r: r["totalM"])
    sep = next((r for r in rows if r["month"] == "Sep"), None)
    oct_ = next((r for r in rows if r["month"] == "Oct"), None)
    # Jaga pembagian nol (bila data berubah / nilai 0) — konsisten dgn forecast.
    shock = round((oct_["ecommerceM"] / sep["ecommerceM"] - 1) * 100, 1) if sep and oct_ and sep["ecommerceM"] else None

    # Rekonsiliasi terhadap angka yang tertulis di dokumen.
    doc_total = 1110
    doc_ec = 641
    return {
        "months": len(rows),
        "totalM": total_sum,
        "ecommerceM": ec_sum,
        "ecommerceSharePct": round(ec_sum / total_sum * 100, 1) if total_sum else 0.0,
        "peak": {"month": peak["month"], "totalM": peak["totalM"]},
        "trough": {"month": trough["month"], "totalM": trough["totalM"]},
        "fluctuationPct": round((max(totals) - min(totals)) / min(totals) * 100, 1) if min(totals) else 0.0,
        "tiktokEcommerceShockPct": shock,
        "reconciliation": {
            "totalM": {"computed": total_sum, "document": doc_total, "delta": total_sum - doc_total},
            "ecommerceM": {"computed": ec_sum, "document": doc_ec, "delta": ec_sum - doc_ec},
            "note": (
                "Baris Tabel 4 dijumlahkan ulang; total e-commerce dokumen (641) "
                "berbeda dari hasil jumlah baris (651). Nilai kanonik = hasil hitung baris."
            ),
        },
    }


def fleet_summary() -> dict[str, Any]:
    """Armada + porsi EV target (kasus: 200 EV dari 14.180 unit)."""
    fleet = load()["fleet"]
    total = int(fleet.get("totalArmada", 0)) or (
        int(fleet.get("motorcycles", 0))
        + int(fleet.get("vans", 0))
        + int(fleet.get("trucks", 0))
        + int(fleet.get("lineHaul", 0))
    )
    ev = int(fleet.get("evTarget", 0))
    return {
        "motorcycles": fleet.get("motorcycles", 0),
        "vans": fleet.get("vans", 0),
        "trucks": fleet.get("trucks", 0),
        "lineHaul": fleet.get("lineHaul", 0),
        "totalArmada": total,
        "evTarget": ev,
        "evSharePct": round(ev / total * 100, 2) if total else 0.0,
        "lastMileMotorPct": fleet.get("lastMileMotorPct", 0),
    }


def data_audit() -> dict[str, Any]:
    """Ringkasan audit angka: mana yang cocok dokumen, mana yang temuan.

    Dipakai oleh halaman Methodology/KPI sebagai "bukti" bahwa angka aplikasi
    dapat ditelusuri ke dokumen kasus.
    """
    d = demand_summary()
    f = financial_summary()
    return {
        "regionSummary": region_summary(),
        "financial": f,
        "demand": d,
        "fleet": fleet_summary(),
        "checks": [
            {
                "id": "hub-count",
                "label": "Jumlah hub = 23",
                "ok": len(load()["hubs"]) == 23,
                "value": len(load()["hubs"]),
            },
            {
                "id": "demand-total",
                "label": "Total demand 2023 = 1.110 jt",
                "ok": d["totalM"] == 1110,
                "value": d["totalM"],
            },
            {
                "id": "ecommerce-total",
                "label": "Total e-commerce (baris) = 651, dokumen menulis 641",
                # ok = true: nilai kanonik kita (hasil hitung baris) BENAR; selisih 10
                # adalah temuan pada dokumen (bukan kegagalan aplikasi) → ditandai 'finding'.
                "ok": d["ecommerceM"] == 651,
                "finding": d["reconciliation"]["ecommerceM"]["delta"] != 0,
                "value": d["ecommerceM"],
                "note": "Selisih 10 unit pada dokumen kasus; kami pakai hasil hitung baris.",
            },
            {
                "id": "fleet-total",
                "label": "Total armada = 14.180 unit",
                "ok": fleet_summary()["totalArmada"] == 14180,
                "value": fleet_summary()["totalArmada"],
            },
            {
                "id": "ev-share",
                "label": "Porsi EV target = 1,41% dari armada",
                "ok": abs(fleet_summary()["evSharePct"] - 1.41) < 0.02,
                "value": fleet_summary()["evSharePct"],
            },
            {
                "id": "cost-vs-sales",
                "label": "Biaya tumbuh lebih cepat dari sales (2020→2023)",
                "ok": f["growth"]["costGrewFasterThanSales"],
                "value": f["growth"],
            },
        ],
    }
