"""Port formatter.ts — scrub identitas AI (env-derived) dari output; bersihkan tabel/emoji.
   Aman di-commit: brand/vendor dibaca dari nilai env, bukan dari source.
"""
from __future__ import annotations
import os
import re
from urllib.parse import urlparse

EMOJI_RE = re.compile(
    r"[\U0001F1E0-\U0001FAFF\U0001F300-\U0001FAFF\u2600-\u26FF"
    r"\U0001F600-\U0001F64F\U0001F680-\U0001F6FF\U0001F900-\U0001F9FF]"
)

_IDENTITY_RE: re.Pattern | None = None


def _identity_re() -> re.Pattern:
    global _IDENTITY_RE
    if _IDENTITY_RE is not None:
        return _IDENTITY_RE

    env_terms: list[str] = []
    model = os.environ.get("AI_MODEL")
    if model:
        for part in re.split(r"[-_/.]", model.lower()):
            if len(part) >= 4:
                env_terms.append(re.escape(part))
    base = os.environ.get("AI_API_BASE_URL")
    host_label = ""
    if base:
        try:
            host = urlparse(base).hostname or ""
            labels = [s for s in host.split(".") if s not in ("api", "www", "app") and len(s) >= 4]
            host_label = re.escape(host)
            env_terms.extend(re.escape(lbl) for lbl in labels)
        except Exception:
            pass

    generic = [
        r"sk_live_\w{8,}",
        r"api[_-]?key\s*[:=][^\s]+",
        r"bearer\s+[a-z0-9._-]{12,}",
        r"postgres(?:ql)?://\S+",
        r"mysql://\S+",
        r"system\s+prompts?",
        "base url",
        "baseur",
    ]
    public_names = ["chatgpt", "openai", "anthropic", "claude", "gemini", "mistral", "qwen", "llama", "gpt"]

    if env_terms:
        env_alt = rf"(?:{'|'.join(env_terms)})[a-z0-9]*"
        if host_label:
            env_alt = rf"{re.escape(host_label)}|{env_alt}"
    else:
        env_alt = host_label
    parts = [p for p in [env_alt, *(generic + public_names)] if p]
    _IDENTITY_RE = re.compile(rf"(?:{'|'.join(parts)})", re.I)
    return _IDENTITY_RE


def _scrub(text: str) -> str:
    out = _identity_re().sub("[redacted]", text)
    out = re.sub(r"\[redacted](\s*\[redacted])+", "Nigi AI", out, flags=re.I)
    return out


def clean_text(raw: str) -> str:
    t = (raw or "").strip()
    t = re.sub(r"```[\s\S]*?```", "", t)
    t = re.sub(r"`([^`\n]+)`", r"\1", t)
    t = _scrub(t)
    lines = [
        ln for ln in t.split("\n")
        if not re.match(r"^\s*\|.*\|\s*$", ln)
        and not re.match(r"^\s*\|?[\s:|-]{5,}\|?\s*$", ln)
        and not re.search(r"\|[\w\s.]+\|$", ln)
    ]
    t = "\n".join(lines)
    t = EMOJI_RE.sub("", t)
    t = re.sub(r"[ \t]+\n", "\n", t)
    t = re.sub(r"\n{2,}", "\n", t).strip()
    return t


def format_chat_response(reply: str, suggestions=None, quota_status="ok") -> dict:
    return {
        "role": "assistant",
        "content": clean_text(reply),
        "mode": "chat",
        "suggestions": suggestions or [],
        "quotaStatus": quota_status,
    }
