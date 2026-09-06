"""Trades & transactions.

RealGM's transaction tracker is the most complete free source and its markup is
stable. NBA.com/draft and BBRef draft history cover the rookie/draft side.
ESPN's Trade Machine has no public API — we reimplement its cap-legality check
in `services/trade_rules.py` instead of scraping it.
"""
from __future__ import annotations

import time
from datetime import date, datetime
from typing import Any

import httpx

REALGM_WIRETAP = "https://basketball.realgm.com/nba/transactions/{year}/{month}"
NBA_DRAFT = "https://stats.nba.com/stats/drafthistory"
_last = 0.0


def _throttle(interval: float = 2.0) -> None:
    global _last
    d = time.monotonic() - _last
    if d < interval:
        time.sleep(interval - d)
    _last = time.monotonic()


def fetch_month(year: int, month: int) -> list[dict[str, Any]]:
    from bs4 import BeautifulSoup

    _throttle()
    url = REALGM_WIRETAP.format(year=year, month=month)
    html = httpx.get(url, timeout=30, headers={"User-Agent": "nba-vision/1.0"}).text
    soup = BeautifulSoup(html, "lxml")
    out: list[dict[str, Any]] = []
    for block in soup.select(".wiretap"):
        head = block.select_one(".wiretap-header")
        body = block.select_one(".wiretap-body")
        if not head or not body:
            continue
        try:
            when = datetime.strptime(head.get_text(strip=True), "%B %d, %Y").date()
        except ValueError:
            when = date(year, month, 1)
        text = body.get_text(" ", strip=True)
        kind = ("trade" if "trade" in text.lower()
                else "signing" if "sign" in text.lower()
                else "waive" if "waiv" in text.lower()
                else "other")
        out.append({"happened_on": when, "kind": kind, "detail": text,
                    "source": "realgm", "source_url": url})
    return out
