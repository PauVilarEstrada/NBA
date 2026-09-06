"""Salary / cap-hit ingestion.

Primary: Spotrac (per-year cap hits, guarantees, options).
Secondary: HoopsHype (simpler tables, good cross-check and a fallback when
Spotrac changes markup).

Both are scraped by the offline worker only, once a day, into `contract`.
If you have a budget, SportsDataIO's `/scores/json/Players` and Sportradar's
league profile give the same numbers as clean JSON under a licence — set
NBA_SPORTSDATAIO_KEY and `use_api()` takes over transparently.
"""
from __future__ import annotations

import re
import time
from typing import Any

import httpx

from app.core.config import settings

SPOTRAC_TEAM = "https://www.spotrac.com/nba/{team_slug}/yearly/"
HOOPSHYPE_TEAM = "https://hoopshype.com/salaries/{team_slug}/"
_MIN_INTERVAL = 2.5
_last = 0.0


def _throttle() -> None:
    global _last
    d = time.monotonic() - _last
    if d < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - d)
    _last = time.monotonic()


def _money(text: str) -> int | None:
    digits = re.sub(r"[^0-9]", "", text or "")
    return int(digits) if digits else None


def use_api() -> bool:
    return bool(settings.sportsdataio_key)


def fetch_from_sportsdataio(season: int) -> list[dict[str, Any]]:
    url = f"https://api.sportsdata.io/v3/nba/scores/json/Players"
    r = httpx.get(url, params={"key": settings.sportsdataio_key}, timeout=30)
    r.raise_for_status()
    return [
        {
            "external_id": p.get("NbaDotComPlayerID"),
            "name": f'{p.get("FirstName")} {p.get("LastName")}',
            "team_abbr": p.get("Team"),
            "season_start": season,
            "cap_hit_usd": p.get("Salary"),
            "source": "sportsdataio",
        }
        for p in r.json()
    ]


def fetch_team_salaries(team_slug: str, season: int) -> list[dict[str, Any]]:
    from bs4 import BeautifulSoup

    _throttle()
    url = SPOTRAC_TEAM.format(team_slug=team_slug)
    html = httpx.get(url, timeout=30, headers={"User-Agent": "nba-vision/1.0"}).text
    soup = BeautifulSoup(html, "lxml")
    rows: list[dict[str, Any]] = []
    for tr in soup.select("table tbody tr"):
        cells = tr.find_all("td")
        if len(cells) < 3:
            continue
        name = cells[0].get_text(" ", strip=True)
        cap = _money(cells[-1].get_text(strip=True))
        if not name or cap is None:
            continue
        rows.append({"name": name, "team_slug": team_slug, "season_start": season,
                     "cap_hit_usd": cap, "source": "spotrac", "source_url": url})
    return rows


# Salary-cap constants used by the cap-space view and the fantasy budget scale.
CAP_BY_SEASON = {
    2023: 136_021_000,
    2024: 140_588_000,
    2025: 154_647_000,
    2026: 165_872_000,   # projected — replace with the official figure once set
}


def cap_for(season_start: int) -> int:
    if season_start in CAP_BY_SEASON:
        return CAP_BY_SEASON[season_start]
    latest = max(CAP_BY_SEASON)
    return int(CAP_BY_SEASON[latest] * (1.07 ** (season_start - latest)))
