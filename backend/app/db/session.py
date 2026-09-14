"""Database session & init — SQLModel + psycopg3 (psycopg binary installed), .env loaded."""
from __future__ import annotations
import os
from pathlib import Path


def _load_dotenv():
    try:
        from dotenv import load_dotenv

        root = Path(__file__).resolve().parents[3]
        load_dotenv(root / ".env")
        load_dotenv(root / ".env.local")
    except Exception:
        pass


_load_dotenv()

from sqlmodel import SQLModel, Session, create_engine  # noqa: E402

_engine = None


def _url() -> str:
    raw = os.environ.get("DATABASE_URL", "").strip()
    if not raw:
        return ""
    # buang param schema (Prisma artifact) supaya psycopg3 tidak menolaknya
    if "?" in raw:
        base, qs = raw.split("?", 1)
        keep = "&".join(
            kv for kv in qs.split("&") if kv and not kv.lower().startswith("schema=")
        )
        raw = f"{base}?{keep}" if keep else base
    if raw.startswith("postgresql://"):
        scheme, rest = "postgresql+psycopg://", raw[len("postgresql://"):]
        raw = scheme + rest
    if raw and "sslmode" not in raw:
        internal = any(h in raw for h in ("@localhost", "@127.", "@0.0.0.0", "@db", "@postgres", "@omnigistic-db"))
        if not internal:
            sep = "&" if "?" in raw else "?"
            raw = f"{raw}{sep}sslmode=require"
    return raw


def engine():
    global _engine
    if _engine is None:
        _engine = create_engine(_url(), pool_pre_ping=True, pool_size=5, max_overflow=10)
    return _engine


def db_available() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def init_db():
    from . import models  # noqa: F401

    SQLModel.metadata.create_all(engine())


def get_session():
    with Session(engine()) as session:
        yield session