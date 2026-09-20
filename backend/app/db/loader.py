"""Sumber data kasus — baca dari shared/data-kas.json (single source of truth).

`shared/data-kas.json` TIDAK PERNAH diubah oleh i18n: berkas itu kanonik dan
dipakai juga oleh pembuat konten frontend. Terjemahan Inggris hidup di overlay
terpisah `shared/data-kas.en.json` yang digabungkan saat `lang=en` (lihat
`load_localized`).
"""
from __future__ import annotations
import copy
import json
import os
from pathlib import Path

from app.i18n import normalize_lang

_BACKEND = Path(__file__).resolve().parents[2]           # backend/
_SHARED = Path(__file__).resolve().parents[3] / "shared" # shared/
_CACHE: dict | None = None

def data_path() -> Path:
    env = os.environ.get("DATA_KAS_PATH")
    if env and Path(env).exists():
        return Path(env)
    cand = _SHARED / "data-kas.json"
    if cand.exists():
        return cand
    return _BACKEND / ".." / "shared" / "data-kas.json"

def load() -> dict:
    global _CACHE
    if _CACHE is None:
        with open(data_path(), "r", encoding="utf-8") as f:
            _CACHE = json.load(f)
    return _CACHE

def reload() -> dict:
    global _CACHE
    _CACHE = None
    return load()


_EN_CACHE: dict | None = None

# Field yang punya padanan Inggris, per bagian data.
_EN_FIELDS: dict[str, tuple[str, ...]] = {
    "courierQuotes": ("quote",),
    "kpiTargets": ("kpi", "baseline", "target"),
    "rootCauses": ("symptoms", "solution", "kpi"),
    "fallbackChatQA": ("question", "answer", "followups"),
    "suggestedQuestions": ("question", "followups"),
}


def en_path() -> Path:
    """Lokasi overlay Inggris (sejajar dengan data kanonik)."""
    return data_path().with_name("data-kas.en.json")


def load_en() -> dict:
    """Overlay Inggris; kosong bila berkasnya belum ada."""
    global _EN_CACHE
    if _EN_CACHE is None:
        try:
            with open(en_path(), "r", encoding="utf-8") as f:
                _EN_CACHE = json.load(f)
        except (OSError, json.JSONDecodeError):
            _EN_CACHE = {}
    return _EN_CACHE


def load_localized(lang: str) -> dict:
    """Data kasus sesuai bahasa permintaan (default: kanonik Indonesia).

    Penggabungan berbasis indeks: struktur dan angka tetap persis seperti
    kanonik, hanya teks yang punya padanan Inggris yang ditimpa.
    """
    base = load()
    if normalize_lang(lang) != "en":
        return base
    overlay = load_en()
    if not overlay:
        return base

    merged = copy.deepcopy(base)
    for section, fields in _EN_FIELDS.items():
        rows = merged.get(section)
        ov_rows = overlay.get(section)
        if not isinstance(rows, list) or not isinstance(ov_rows, list):
            continue
        for i, row in enumerate(rows):
            if i >= len(ov_rows) or not isinstance(ov_rows[i], dict) or not isinstance(row, dict):
                continue
            for field in fields:
                value = ov_rows[i].get(field)
                if value:
                    row[field] = value

    insights = merged.get("fallbackInsights")
    ov_insights = overlay.get("fallbackInsights")
    if isinstance(insights, dict) and isinstance(ov_insights, dict):
        for role, block in insights.items():
            ov_block = ov_insights.get(role)
            if not isinstance(block, dict) or not isinstance(ov_block, dict):
                continue
            if ov_block.get("greeting"):
                block["greeting"] = ov_block["greeting"]
            items, ov_items = block.get("insights"), ov_block.get("insights")
            if isinstance(items, list) and isinstance(ov_items, list):
                for i, item in enumerate(items):
                    if i >= len(ov_items) or not isinstance(item, dict):
                        continue
                    for field in ("title", "body", "detail", "text"):
                        if ov_items[i].get(field):
                            item[field] = ov_items[i][field]
    return merged
