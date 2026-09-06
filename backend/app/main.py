"""NBA Vision API.

    uvicorn app.main:app --reload

Runs with zero infrastructure: no Postgres, no Redis, no API keys. In that state
it serves the seeded league and the calibrated mock model, and every response
carries `"source": "mock"`. Point NBA_DATABASE_URL at a populated database and
drop trained artefacts into NBA_MODEL_DIR and the same endpoints start answering
from real data and real models — the contract does not change.
"""
from __future__ import annotations

import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import fantasy, h2h, meta, players, predict, simulate, teams
from app.core.config import settings
from app.ml.registry import registry

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("api")

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description=__doc__,
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


@app.middleware("http")
async def timing(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time-Ms"] = f"{(time.perf_counter() - started) * 1000:.1f}"
    return response


@app.exception_handler(LookupError)
async def not_found(_: Request, exc: LookupError):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.on_event("startup")
def startup() -> None:
    status = registry.load()
    log.info("model registry: %s", status)


for r in (meta.router, players.router, teams.router, h2h.router,
          predict.router, simulate.router, fantasy.router):
    app.include_router(r, prefix="/api")
