"""Basketball-Reference scraper for the advanced metrics stats.nba.com does not
publish (PER, WS, WS/48, BPM, VORP) and for deep history (pre-1996 seasons).

Rules of engagement, because BBRef bans fast scrapers:
  * >= 3 s between requests, one worker only. Never called from a web request —
    only from `scripts/ingest.py`.
  * Results land in `player_season_stats`; the API always reads the DB.
  * Their `id` scheme is `jamesle01`; store it in `player.bref_id` once and reuse.
"""
from __future__ import annotations

import re
import time
from typing import Any

import httpx

BASE = "https://www.basketball-reference.com"
_MIN_INTERVAL = 3.2
_last = 0.0

ADVANCED_COLS = {
    "per": "per", "ts_pct": "ts_pct", "usg_pct": "usg_pct",
    "ws": "ws", "ws_per_48": "ws48", "bpm": "bpm", "vorp": "vorp",
}


def _throttle() -> None:
    global _last
    delta = time.monotonic() - _last
    if delta < _MIN_INTERVAL:
        time.sleep(_MIN_INTERVAL - delta)
    _last = time.monotonic()


def bref_id(first: str, last: str, seq: int = 1) -> str:
    norm = lambda s: re.sub(r"[^a-z]", "", s.lower())
    return f"{norm(last)[:5]}{norm(first)[:2]}{seq:02d}"


def fetch_advanced(bref_player_id: str) -> list[dict[str, Any]]:
    """Return one record per season from the player's Advanced table."""
    from bs4 import BeautifulSoup  # local import: only the ingest worker needs it

    _throttle()
    url = f"{BASE}/players/{bref_player_id[0]}/{bref_player_id}.html"
    html = httpx.get(url, timeout=30, headers={"User-Agent": "nba-vision/1.0"}).text
    # BBRef ships secondary tables inside HTML comments.
    html = html.replace("<!--", "").replace("-->", "")
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table", id="advanced")
    if table is None:
        return []

    out: list[dict[str, Any]] = []
    for tr in table.tbody.find_all("tr"):
        if tr.get("class") and "thead" in tr.get("class"):
            continue
        season = tr.find("th").get_text(strip=True)          # '2023-24'
        if "-" not in season:
            continue
        rec: dict[str, Any] = {"season_start": int(season.split("-")[0])}
        for src, dst in ADVANCED_COLS.items():
            cell = tr.find("td", {"data-stat": src})
            txt = cell.get_text(strip=True) if cell else ""
            rec[dst] = float(txt) if txt else None
        tm = tr.find("td", {"data-stat": "team_id"})
        rec["team_abbr"] = tm.get_text(strip=True) if tm else None
        out.append(rec)
    return out
