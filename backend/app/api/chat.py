"""Nigi AI chat — layered: 1) guard input, 2) fuzzy QA (DB), 3) LLM fallback (env-injected, anonim).
   Identik dengan alur route.ts Next sebelumnya.
"""
from __future__ import annotations
import logging
import os
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.security.guard import (
    sanitize_input, wrap_untrusted, filter_output, check_rate, HARD_REFUSAL,
)
from app.security.formatter import format_chat_response
from app.security.quota import is_quota_error
from app.security.prompts import build_system_prompt, FACTS_DIGEST
from app.api.qa import match_chat_qa

router = APIRouter(prefix="/api", tags=["chat"])
log = logging.getLogger("omnigistic.chat")
VALID = {"PUSAT", "HUB", "KURIR", "DATA", "CUSTOMER", "SELLER"}
# chip saran sebaiknya punya padanan di bank QA (54 entri di data-kas.json) supaya klik → jawab DB
_DEFAULT_SUGGESTIONS: list[str] = ["Apa masalah utama GC Logistics?", "Bagaimana solusi Omnigistic?", "Berapa utilisasi Jakarta?"]
_ROLE_SUGGESTIONS = {
    "PUSAT": ["Kenapa biaya naik lebih cepat dari sales?", "Kenapa Jakarta overload?", "Apa target roadmap Omnigistic?"],
    "HUB": ["Berapa utilisasi hub Bandung?", "Kenapa demand naik turun?", "Apa itu Capacity Alert?"],
    "KURIR": ["Kenapa COD lebih lambat?", "Apa itu Slot Confirmation?", "Berapa persen paket diantar pakai motor?"],
    "DATA": ["Kenapa alamat bisa ambigu?", "Berapa tingkat komplain GC Logistics?", "Apa itu Address Intelligence?"],
    "CUSTOMER": ["Kenapa COD lebih lambat?", "Apa itu PUDO?", "Bagaimana cara melacak paket saya?"],
    "SELLER": ["Berapa tingkat komplain GC Logistics?", "Kenapa COD lebih lambat?", "Bagaimana memilih PUDO untuk pembeli?"],
}


def default_suggestions(role: str) -> list[str]:
    """Salinan daftar saran untuk role — copy agar respons tak meng-*alias* list
    modul (mutasi di satu respons tidak merusak respons lain)."""
    return list(_ROLE_SUGGESTIONS.get((role or "").upper(), _DEFAULT_SUGGESTIONS))


class ChatBody(BaseModel):
    role: str
    query: str


def _client_key(req: Request, role: str) -> str:
    """Kunci rate-limit berbasis IP peer TCP (bukan header yang bisa dipalsukan).

    Header X-Forwarded-For diabaikan kecuali TRUST_PROXY=1 (di belakang proxy
    tepercaya), supaya penyerang tak bisa memutar kunci dgn header palsu →
    melewati rate-limit (OWASP LLM10).
    """
    ip = "anon"
    if os.environ.get("TRUST_PROXY") == "1":
        ip = req.headers.get("x-forwarded-for", "").split(",")[0].strip() or req.headers.get("x-real-ip", "").strip() or "anon"
    if not ip or ip == "anon":
        ip = req.client.host if req.client else "anon"
    return f"ai:{ip}:{role}"


def _system_for(role: str, qa: dict | None = None) -> str:
    """System prompt + digest fakta kasus + (bila ada) fakta terkunci dari bank QA,
    supaya LLM menjawab hidup tapi tetap berpijak pada angka studi kasus."""
    parts = [build_system_prompt(role), FACTS_DIGEST]
    if qa and qa.get("answer"):
        parts.append("FAKTA TERKUNCI untuk pertanyaan ini: " + str(qa["answer"]))
    return "\n\n".join(p for p in parts if p)


def _call_llm(role: str, user_msg: str, session: str, qa: dict | None = None) -> str | None:
    """Panggil LLM (OpenAI-compatible). Return None bila gagal, tidak pernah raise,
    supaya pemanggil bisa jatuh ke bank QA kasus. Header x-opencode-session wajib untuk OpenCode Go."""
    import openai
    base = os.environ.get("AI_API_BASE_URL")
    key = os.environ.get("AI_API_KEY")
    model = os.environ.get("AI_MODEL")
    if not (base and key and model):
        return None
    try:
        client = openai.OpenAI(
            api_key=key,
            base_url=base,
            timeout=20,
            max_retries=0,
            default_headers={
                "User-Agent": "omnigistic-nigi-chat/1.0",
                "x-opencode-session": session,
            },
        )
        comp = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": _system_for(role, qa)},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=400,
        )
        return comp.choices[0].message.content or ""
    except Exception as e:
        if is_quota_error(e):
            log.warning("LLM limit/kuota: %s", str(e)[:120])
        else:
            log.warning("LLM gagal (%s): %s", type(e).__name__, str(e)[:120])
        return None


@router.post("/chat")
async def chat(body: ChatBody, req: Request):
    role = (body.role or "").upper()
    query = (body.query or "").replace("\u0000", "").strip()
    if not query or role not in VALID:
        raise HTTPException(status_code=400, detail="invalid params")

    if not check_rate(_client_key(req, role)):
        return format_chat_response("Terlalu banyak percobaan. Jeda sebentar lalu coba lagi.", default_suggestions(role), "exhausted")

    clean = sanitize_input(query)
    if clean["blocked"]:
        return format_chat_response(HARD_REFUSAL, default_suggestions(role))

    session = _client_key(req, role)

    # 'harden' = penanda hati-hati (bukan blokir keras) → tetap boleh dijawab dari
    # bank QA. Hanya 'hard' (blocked) yang benar-benar dilewati menjawab.
    # (Dulu: 'harden' melewati bank QA → pertanyaan wajar dijawab "offline".)
    # 1) Ambil fakta terkunci (bank QA) sebagai grounding LLM.
    qa = match_chat_qa(role, clean["query"])

    # 2) LLM hanya untuk input 'ok' — input 'harden' tidak dikirim ke LLM (aman),
    #    cukup dijawab dari bank QA pada langkah 3.
    reply = None
    if clean["decision"] == "ok":
        reply = _call_llm(role, wrap_untrusted(clean["query"]), session, qa)
    out = filter_output(reply) if reply else ""
    if out.strip():
        return format_chat_response(out, default_suggestions(role))

    # 3) Fallback bank QA kasus (angka terkunci) bila LLM gagal/offline/limit
    if qa:
        from app.security.formatter import clean_text
        return format_chat_response(
            clean_text(qa["answer"]),
            (qa["followups"] or default_suggestions(role)[:2]),
            "fallback",
            mode="fallback",
        )

    return format_chat_response("Nigi AI sedang offline.", default_suggestions(role), "exhausted", mode="offline")
