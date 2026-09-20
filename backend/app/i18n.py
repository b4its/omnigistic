"""Lokalisasi payload API dua bahasa (ID = default, EN = opsional).

Mesin ML sengaja tetap mengembalikan teks Indonesia: itu kontrak yang sudah
diuji oleh 392 asersi backend dan menjadi sumber tunggal kebenaran istilah.
Terjemahan dilakukan di BATAS API lewat katalog `i18n_messages.json`
(teks Indonesia → teks Inggris) plus pola regex untuk string yang memuat angka
bervariasi, sehingga tidak ada angka yang ikut berubah.

Pemakaian di route:

    from app.i18n import localize

    @router.get("/pnl/waterfall")
    def pnl_waterfall(lang: str = "id"):
        return localize(cost_waterfall(), lang)

Frontend mengirim `?lang=en` secara eksplisit; tanpa parameter, respons tetap
Indonesia agar seluruh uji lama tetap lulus.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

DEFAULT_LANG = "id"
SUPPORTED_LANGS = ("id", "en")

_CATALOG_PATH = Path(__file__).with_name("i18n_messages.json")


@lru_cache(maxsize=1)
def _catalog() -> dict[str, str]:
    """Peta teks Indonesia → teks Inggris (dimuat sekali per proses)."""
    try:
        raw = json.loads(_CATALOG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):  # katalog hilang → tetap Indonesia
        return {}
    table = raw.get("en", {})
    return {k: v for k, v in table.items() if isinstance(k, str) and isinstance(v, str)}


# Pola untuk string yang memuat angka/nilai yang bervariasi. Urutan penting:
# pola paling spesifik lebih dulu.
_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (
        re.compile(
            r"^Kendala: sumber = hub ber-utilisasi > (.+?)% \(ambang kritis\); "
            r"penerima = hub ber-utilisasi < (.+?)% \(headroom\); "
            r"lantai aman (.+?)%, maks (.+?)% dialihkan\.$"
        ),
        r"Constraints: source = hubs above \1% utilisation (critical threshold); "
        r"receiver = hubs below \2% utilisation (headroom); safe floor \3%, "
        r"at most \4% shifted.",
    ),
    (re.compile(r"^Keberangkatan dari Hub Jakarta \((.+?)\)$"), r"Departure from the Jakarta Hub (\1)"),
    (re.compile(r"^Tiba di Gerai Mitra PUDO \((.+?)\)$"), r"Arrival at the partner PUDO outlet (\1)"),
    (re.compile(r"^Tiba di Alamat Penerima \((.+?)\)$"), r"Arrival at the recipient's address (\1)"),
    (
        re.compile(r"^Capex hub baru Rp(.+?) miliar dibandingkan pada satuan setara: kapasitas hub rata-rata (.+?) juta paket per hari\.$"),
        r"New-hub capex of Rp\1 billion compared on an equivalent basis: average hub capacity \2 million parcels per day.",
    ),
    (re.compile(r"^(.+?) menit$"), r"\1 minutes"),
    (re.compile(r"^(.+?) per hari$"), r"\1 per day"),
    (re.compile(r"^(.+?) per jam$"), r"\1 per hour"),
    (re.compile(r"^(.+?) per juta paket$"), r"\1 per million parcels"),
    (re.compile(r"^(.+?) juta paket$"), r"\1 million parcels"),
    (re.compile(r"^(.+?)/juta$"), r"\1 per million"),
    (re.compile(r"^(.+?)/jam$"), r"\1 per hour"),
    (re.compile(r"^(.+?) bulan$"), r"\1 months"),
    (re.compile(r"^(.+?) fase$"), r"\1 phases"),
]


def normalize_lang(value: str | None) -> str:
    """Normalisasi kode bahasa; apa pun di luar daftar → Indonesia."""
    if not value:
        return DEFAULT_LANG
    code = value.strip().lower().replace("_", "-")[:2]
    return code if code in SUPPORTED_LANGS else DEFAULT_LANG


def translate(text: str, lang: str) -> str:
    """Terjemahkan satu string. Tak dikenal → dikembalikan apa adanya."""
    if normalize_lang(lang) == DEFAULT_LANG:
        return text
    exact = _catalog().get(text)
    if exact is not None:
        return exact
    for pattern, replacement in _PATTERNS:
        if pattern.match(text):
            return pattern.sub(replacement, text)
    return text


def localize(payload: Any, lang: str) -> Any:
    """Telusuri payload dan terjemahkan tiap string (kunci dict dibiarkan).

    Args:
        payload: struktur JSON apa pun (dict, list, skalar).
        lang: kode bahasa permintaan.

    Returns:
        Salinan payload dengan teks yang dikenal diterjemahkan.
    """
    if normalize_lang(lang) == DEFAULT_LANG:
        return payload
    if isinstance(payload, str):
        return translate(payload, lang)
    if isinstance(payload, list):
        return [localize(item, lang) for item in payload]
    if isinstance(payload, dict):
        return {key: localize(value, lang) for key, value in payload.items()}
    return payload
