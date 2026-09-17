"""Validasi cepat sumber data tunggal `shared/data-kas.json`.

Dijalankan dari root repo:
    make validate-data          # atau: python3 backend/tests/validate_data.py

Memastikan file JSON terbaca dan memuat kunci-kunci inti yang dipakai seluruh
sistem (hubs/regions/financial/fleet/kpiTargets), lalu mencetak ringkasan.
Keluar dengan kode ≠ 0 bila tidak valid.
"""
from __future__ import annotations

import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PATH = os.environ.get("DATA_KAS_PATH") or os.path.join(ROOT, "shared", "data-kas.json")

REQUIRED_KEYS = ["hubs", "regions", "financial", "fleet", "kpiTargets"]


def main() -> int:
    try:
        with open(PATH, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"\u274c file tidak ditemukan: {PATH}")
        return 1
    except json.JSONDecodeError as exc:
        print(f"\u274c JSON tidak valid: {exc}")
        return 1

    missing = [k for k in REQUIRED_KEYS if k not in data]
    if missing:
        print(f"\u274c data-kas.json tidak lengkap, hilang: {missing}")
        return 1

    fleet = data.get("fleet", {})
    hubs = data.get("hubs", [])
    regions = data.get("regions", [])
    total_cap = sum(float(h.get("capacityM", 0.0)) for h in hubs)
    print(
        f"\u2705 {PATH} valid \u2014 {len(hubs)} hub \u00b7 {len(regions)} region \u00b7 "
        f"kapasitas {total_cap:.3f} jt paket/hari \u00b7 {fleet.get('motorcycles', '?')} motor \u00b7 "
        f"EV target {fleet.get('evTarget', '?')}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
