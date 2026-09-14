"""Omnigistic backend — FastAPI full backend, localhost. Swagger: /docs."""
from __future__ import annotations
import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.db.session import init_db
from app.api import data, insights, qa, chat, ml_routes

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("omnigistic")

# CORS: default daftar origin dev-localhost saja (bukan "*") — override: CORS_ORIGINS="http://a,http://b"
_DEFAULT_ORIGINS = ",".join(
    f"http://{h}:{p}" for h in ("127.0.0.1", "localhost") for p in ("3000", "3100", "3101", "3102", "3103", "3104")
)
_origins = [o.strip() for o in os.environ.get("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DB init optional & NON-BLOCKING. JSON fallback melayani tanpa DB.
    # SKIP_DB=1 (default di dev lokal) → tidak pernah coba konek DB.
    if os.environ.get("SKIP_DB") == "1" or not os.environ.get("DATABASE_URL"):
        log.info("SKIP_DB aktif → semua /api & /ml dilayani dari shared/data-kas.json")
        yield
        return
    try:
        import concurrent.futures as _cf
        with _cf.ThreadPoolExecutor(max_workers=1) as ex:
            ex.submit(init_db).result(timeout=3.0)
        log.info("Neon terjangkau → init DB ok")
    except Exception as e:
        log.warning("DB tidak terjangkau (%s) → JSON fallback, /api tetap 200", str(e)[:80])
    yield


app = FastAPI(
    title="Omnigistic — GC Logistics API",
    version="2.0.0",
    description="Full backend utk ISCEA Global Case Competition 2026 (studi kasus GC Logistics). "
                "Sumber data: shared/data-kas.json. ML prototipe presentasi di /ml.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (data.router, insights.router, qa.router, chat.router, ml_routes.router):
    app.include_router(r)


@app.exception_handler(Exception)
async def unhandled_exc(request: Request, exc: Exception):  # noqa: ANN401
    """Safety-net: error tak terduga → log + JSON 500 terstruktur, bukan bocor stack ke client."""
    log.exception("unhandled %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(status_code=500, content={"detail": "internal server error", "path": request.url.path})


@app.get("/")
def root():
    return {"app": "Omnigistic", "version": "2.0", "docs": "/docs"}
