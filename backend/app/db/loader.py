"""Sumber data kasus — baca dari shared/data-kas.json (single source of truth)."""
from __future__ import annotations
import json
import os
from pathlib import Path

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
