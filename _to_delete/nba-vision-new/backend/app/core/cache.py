"""Two-tier cache: Redis when present, on-disk JSON otherwise.

Every upstream call goes through `cached()`. That is what keeps stats.nba.com
from rate-limiting the app and what makes the frontend feel instant.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
from typing import Any, Awaitable, Callable

from app.core.config import settings

log = logging.getLogger(__name__)

try:  # redis is optional in local dev
    from redis.asyncio import Redis

    _redis: "Redis | None" = Redis.from_url(settings.redis_url, decode_responses=True)
except Exception:  # pragma: no cover
    _redis = None


def _key(namespace: str, payload: Any) -> str:
    raw = json.dumps(payload, sort_keys=True, default=str)
    return f"nbav:{namespace}:{hashlib.sha1(raw.encode()).hexdigest()[:20]}"


def _disk_path(key: str) -> str:
    os.makedirs(settings.cache_dir, exist_ok=True)
    return os.path.join(settings.cache_dir, key.replace(":", "_") + ".json")


async def _get(key: str) -> Any | None:
    if _redis is not None:
        try:
            raw = await _redis.get(key)
            if raw:
                return json.loads(raw)
        except Exception:
            pass
    path = _disk_path(key)
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as fh:
            blob = json.load(fh)
        if blob["exp"] > time.time():
            return blob["val"]
        os.remove(path)
    return None


async def _set(key: str, value: Any, ttl: int) -> None:
    if _redis is not None:
        try:
            await _redis.setex(key, ttl, json.dumps(value, default=str))
            return
        except Exception:
            pass
    with open(_disk_path(key), "w", encoding="utf-8") as fh:
        json.dump({"exp": time.time() + ttl, "val": value}, fh, default=str)


_locks: dict[str, asyncio.Lock] = {}


async def cached(
    namespace: str,
    params: Any,
    ttl: int,
    producer: Callable[[], Awaitable[Any]],
) -> Any:
    """Read-through cache with a per-key lock so a cold key is fetched once,
    not once per concurrent request (stampede protection)."""
    key = _key(namespace, params)
    hit = await _get(key)
    if hit is not None:
        return hit

    lock = _locks.setdefault(key, asyncio.Lock())
    async with lock:
        hit = await _get(key)          # someone may have filled it while we waited
        if hit is not None:
            return hit
        value = await producer()
        await _set(key, value, ttl)
        return value
