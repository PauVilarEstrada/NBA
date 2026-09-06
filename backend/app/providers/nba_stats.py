"""Thin async client for stats.nba.com.

Why this exists instead of calling `nba_api` from the request handler:
  * stats.nba.com sends no `Access-Control-Allow-Origin`, so a browser can
    never call it directly — a server-side proxy is mandatory, not optional.
  * It fingerprints clients: without the exact Referer/Origin/User-Agent set
    below it returns an empty 200 or hangs forever.
  * It rate-limits aggressively. One shared token bucket + the read-through
    cache in `core.cache` keeps us to ~0.6 req/s.

`nba_api` (github.com/swar/nba_api) is still the reference for endpoint names
and parameter spellings — see `nbasense.com` for the full 253-endpoint list.
The sync `nba_api` package is used by the offline ingest worker
(`scripts/ingest.py`); the API process uses this async client.
"""
from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

from app.core.cache import cached
from app.core.config import settings
from app.core.errors import UpstreamError

STATS_HEADERS = {
    "Host": "stats.nba.com",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nba.com/",
    "Origin": "https://www.nba.com",
    "x-nba-stats-origin": "stats",
    "x-nba-stats-token": "true",
    "Connection": "keep-alive",
}


class _TokenBucket:
    def __init__(self, qps: float) -> None:
        self._interval = 1.0 / qps
        self._next = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = time.monotonic()
            wait = self._next - now
            if wait > 0:
                await asyncio.sleep(wait)
            self._next = max(now, self._next) + self._interval


_bucket = _TokenBucket(settings.stats_rate_limit_qps)
_client: httpx.AsyncClient | None = None


def client() -> httpx.AsyncClient:
    global _client
    if _client is None:
        _client = httpx.AsyncClient(
            base_url=settings.stats_base,
            headers=STATS_HEADERS,
            timeout=settings.stats_timeout,
            http2=True,
        )
    return _client


@retry(
    reraise=True,
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1.5, min=2, max=12),
    retry=retry_if_exception_type((httpx.TransportError, UpstreamError)),
)
async def _fetch(endpoint: str, params: dict[str, Any]) -> dict:
    await _bucket.acquire()
    resp = await client().get(f"/stats/{endpoint}", params=params)
    if resp.status_code != 200 or not resp.content:
        raise UpstreamError(f"{endpoint} -> {resp.status_code} ({len(resp.content)}B)")
    return resp.json()


def rows_to_dicts(payload: dict, result_set: str | int = 0) -> list[dict]:
    """stats.nba.com returns column-oriented `resultSets`. Normalise to records."""
    sets = payload.get("resultSets") or payload.get("resultSet") or []
    if isinstance(sets, dict):
        sets = [sets]
    block = None
    if isinstance(result_set, int):
        block = sets[result_set]
    else:
        block = next(s for s in sets if s["name"] == result_set)
    headers = [h.lower() for h in block["headers"]]
    return [dict(zip(headers, row)) for row in block["rowSet"]]


async def get(endpoint: str, params: dict[str, Any], ttl: int | None = None) -> list[dict]:
    ttl = ttl if ttl is not None else settings.ttl_season
    payload = await cached("stats", {"e": endpoint, "p": params}, ttl,
                           lambda: _fetch(endpoint, params))
    return rows_to_dicts(payload)


# ---------------------------------------------------------------- helpers
async def all_players(season: str) -> list[dict]:
    return await get("commonallplayers",
                     {"LeagueID": "00", "Season": season, "IsOnlyCurrentSeason": 0},
                     ttl=settings.ttl_static)


async def player_info(player_id: int) -> list[dict]:
    return await get("commonplayerinfo", {"PlayerID": player_id, "LeagueID": "00"},
                     ttl=settings.ttl_static)


async def player_career(player_id: int) -> list[dict]:
    return await get("playercareerstats", {"PlayerID": player_id, "PerMode": "PerGame"})


async def player_game_logs(player_id: int, season: str, season_type: str = "Regular Season") -> list[dict]:
    return await get("playergamelog",
                     {"PlayerID": player_id, "Season": season, "SeasonType": season_type})


async def team_roster(team_id: int, season: str) -> list[dict]:
    return await get("commonteamroster", {"TeamID": team_id, "Season": season})


async def league_dash_team_stats(season: str, season_type: str = "Regular Season",
                                 measure: str = "Advanced") -> list[dict]:
    return await get("leaguedashteamstats", {
        "Season": season, "SeasonType": season_type, "MeasureType": measure,
        "PerMode": "PerGame", "LeagueID": "00", "PaceAdjust": "N", "PlusMinus": "N",
        "Rank": "N", "Month": 0, "OpponentTeamID": 0, "Period": 0,
        "LastNGames": 0, "GameSegment": "", "Location": "", "Outcome": "",
        "SeasonSegment": "", "VsConference": "", "VsDivision": "",
        "TeamID": 0, "Conference": "", "Division": "", "DateFrom": "", "DateTo": "",
        "PlayerExperience": "", "PlayerPosition": "", "StarterBench": "",
        "ShotClockRange": "", "TwoWay": 0,
    })


async def scoreboard(game_date: str) -> list[dict]:
    return await get("scoreboardv2", {"GameDate": game_date, "LeagueID": "00", "DayOffset": 0},
                     ttl=settings.ttl_live)
