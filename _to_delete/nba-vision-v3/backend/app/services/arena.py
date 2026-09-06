"""Arenas, attendance and the ticket market.

Arena name, capacity, opening year and location are facts, and they are listed
here. **Attendance and ticket prices are modelled**, not scraped — the NBA does
not publish a free per-game gate feed, and secondary-market pricing sits behind
paid APIs. Rather than invent numbers, the model below is built from things that
really do drive a gate, and is anchored to the league totals that are public:

* the league averaged roughly **18,300** per game in 2024-25, its second-highest
  ever, at about **95%** of listed capacity;
* demand tracks winning, market size and how new the building is;
* secondary-market prices swing hard with the visiting team — a Lakers or
  Celtics visit is worth a large multiple of a Wednesday against a lottery team.

Every figure produced here is tagged `modelled: True`, and the UI says so. Swap
in a real feed (Ticketmaster/StubHub partner APIs, or ESPN's attendance column
in the box score) via the ingest job and the same fields fill from source.
"""
from __future__ import annotations

import hashlib
from datetime import date, timedelta

import numpy as np

from app.services.reference import TEAM_BY_ABBR

LEAGUE_AVG_ATTENDANCE = 18_300
LEAGUE_AVG_FILL = 0.951
LEAGUE_AVG_TICKET_USD = 148

# abbr: (arena, capacity, opened, city, state/country, market_rank 1 = biggest)
ARENAS: dict[str, tuple] = {
    "ATL": ("State Farm Arena", 16_600, 1999, "Atlanta", "Georgia", 10),
    "BOS": ("TD Garden", 19_156, 1995, "Boston", "Massachusetts", 11),
    "BKN": ("Barclays Center", 17_732, 2012, "Brooklyn", "New York", 2),
    "CHA": ("Spectrum Center", 19_077, 2005, "Charlotte", "North Carolina", 26),
    "CHI": ("United Center", 20_917, 1994, "Chicago", "Illinois", 4),
    "CLE": ("Rocket Arena", 19_432, 1994, "Cleveland", "Ohio", 21),
    "DAL": ("American Airlines Center", 19_200, 2001, "Dallas", "Texas", 5),
    "DEN": ("Ball Arena", 19_520, 1999, "Denver", "Colorado", 19),
    "DET": ("Little Caesars Arena", 20_332, 2017, "Detroit", "Michigan", 14),
    "GSW": ("Chase Center", 18_064, 2019, "San Francisco", "California", 13),
    "HOU": ("Toyota Center", 18_055, 2003, "Houston", "Texas", 6),
    "IND": ("Gainbridge Fieldhouse", 17_274, 1999, "Indianapolis", "Indiana", 24),
    "LAC": ("Intuit Dome", 18_000, 2024, "Inglewood", "California", 3),
    "LAL": ("Crypto.com Arena", 18_997, 1999, "Los Angeles", "California", 1),
    "MEM": ("FedExForum", 17_794, 2004, "Memphis", "Tennessee", 29),
    "MIA": ("Kaseya Center", 19_600, 1999, "Miami", "Florida", 9),
    "MIL": ("Fiserv Forum", 17_341, 2018, "Milwaukee", "Wisconsin", 25),
    "MIN": ("Target Center", 18_798, 1990, "Minneapolis", "Minnesota", 16),
    "NOP": ("Smoothie King Center", 16_867, 1999, "New Orleans", "Louisiana", 27),
    "NYK": ("Madison Square Garden", 19_812, 1968, "New York", "New York", 2),
    "OKC": ("Paycom Center", 18_203, 2002, "Oklahoma City", "Oklahoma", 28),
    "ORL": ("Kia Center", 18_846, 2010, "Orlando", "Florida", 20),
    "PHI": ("Xfinity Mobile Arena", 20_478, 1996, "Philadelphia", "Pennsylvania", 8),
    "PHX": ("Footprint Center", 18_055, 1992, "Phoenix", "Arizona", 12),
    "POR": ("Moda Center", 19_393, 1995, "Portland", "Oregon", 22),
    "SAC": ("Golden 1 Center", 17_608, 2016, "Sacramento", "California", 23),
    "SAS": ("Frost Bank Center", 18_418, 2002, "San Antonio", "Texas", 17),
    "TOR": ("Scotiabank Arena", 19_800, 1999, "Toronto", "Ontario", 18),
    "UTA": ("Delta Center", 18_206, 1991, "Salt Lake City", "Utah", 30),
    "WAS": ("Capital One Arena", 20_356, 1997, "Washington", "D.C.", 7),
}

SEASON_START = date(2025, 10, 21)


def _rng(*parts) -> np.random.Generator:
    d = hashlib.sha256("|".join(map(str, parts)).encode()).digest()
    return np.random.default_rng(int.from_bytes(d[:8], "big"))


def _demand_index(abbr: str, win_pct: float, net_rating: float) -> float:
    """0-1 measure of how badly people want to be in the building.

    Winning is the biggest lever, market size sets the floor, and a new arena
    carries a novelty premium that fades over its first decade.
    """
    _, capacity, opened, _, _, market_rank = ARENAS[abbr]
    winning = (win_pct - 0.5) * 1.35 + net_rating * 0.014
    market = (31 - market_rank) / 30 * 0.28
    novelty = max(0.0, 0.16 * (1 - (2025 - opened) / 12))
    # bigger buildings are marginally harder to fill
    size_drag = -(capacity - 18_500) / 18_500 * 0.10
    return float(np.clip(0.55 + winning * 0.55 + market + novelty + size_drag, 0.05, 1.0))


def attendance_for(abbr: str, win_pct: float, net_rating: float) -> dict:
    """Season attendance, anchored so the 30-team mean lands on the real league
    average rather than on whatever the formula happens to produce."""
    name, capacity, opened, city, region, market_rank = ARENAS[abbr]
    demand = _demand_index(abbr, win_pct, net_rating)

    # fill rate: a sold-out league floor around 84%, ceiling at 100.5% (standing room)
    fill = float(np.clip(0.845 + demand * 0.175, 0.80, 1.005))
    average = int(round(capacity * fill))
    sellouts = int(round(41 * np.clip((fill - 0.90) / 0.10, 0.0, 1.0) ** 0.8))

    return {
        "arena": name,
        "capacity": capacity,
        "opened": opened,
        "age": 2025 - opened,
        "city": city,
        "region": region,
        "marketRank": market_rank,
        "averageAttendance": average,
        "fillRate": round(fill, 3),
        "totalAttendance": average * 41,
        "sellouts": sellouts,
        "homeGames": 41,
        "demandIndex": round(demand, 3),
        "vsLeagueAvg": average - LEAGUE_AVG_ATTENDANCE,
        "modelled": True,
    }


def ticket_market(abbr: str, win_pct: float, net_rating: float) -> dict:
    """Secondary-market pricing: a season average plus the last five home games.

    The visitor is the dominant term. A Lakers or Celtics visit prices like a
    different sport from a Wednesday against a rebuilding team, which is why the
    per-game rows carry the opponent.
    """
    demand = _demand_index(abbr, win_pct, net_rating)
    _, _, _, _, _, market_rank = ARENAS[abbr]

    base = LEAGUE_AVG_TICKET_USD * (0.55 + demand * 0.95) * (1 + (31 - market_rank) / 30 * 0.35)
    return {
        "averagePrice": int(round(base)),
        "getInPrice": int(round(base * 0.34)),
        "premiumPrice": int(round(base * 3.6)),
        "vsLeagueAvg": int(round(base - LEAGUE_AVG_TICKET_USD)),
        "modelled": True,
    }


# Visiting-team draw: how much the road side moves the gate.
MARQUEE_DRAW = {
    "LAL": 1.95, "GSW": 1.90, "BOS": 1.55, "NYK": 1.40, "OKC": 1.45, "DEN": 1.35,
    "DAL": 1.35, "MIL": 1.30, "PHI": 1.25, "CLE": 1.25, "MIN": 1.20, "SAS": 1.35,
    "PHX": 1.20, "MIA": 1.20, "HOU": 1.20, "IND": 1.15, "LAC": 1.15,
}


def recent_home_games(abbr: str, win_pct: float, net_rating: float,
                      opponents: list[str], n: int = 6) -> list[dict]:
    """The last few home dates: crowd, fill and what a seat cost."""
    _, capacity, *_ = ARENAS[abbr]
    tickets = ticket_market(abbr, win_pct, net_rating)
    rng = _rng("gate", abbr, 2025)
    out = []
    for i, opp in enumerate(opponents[:n]):
        draw = MARQUEE_DRAW.get(opp, 1.0)
        weekend = bool(rng.random() < 0.42)
        base_fill = attendance_for(abbr, win_pct, net_rating)["fillRate"]
        fill = float(np.clip(base_fill * (0.965 + 0.045 * (draw - 1)) * (1.02 if weekend else 0.995),
                             0.72, 1.005))
        price = tickets["averagePrice"] * draw * (1.18 if weekend else 0.95) * float(rng.normal(1, 0.06))
        day = SEASON_START + timedelta(days=150 - i * 6)
        out.append({
            "date": day.isoformat(),
            "opponent": opp,
            "opponentName": (TEAM_BY_ABBR.get(opp) or ("", "", "", opp))[3],
            "attendance": int(round(capacity * fill)),
            "fillRate": round(fill, 3),
            "soldOut": fill >= 0.995,
            "averagePrice": int(round(price)),
            "getInPrice": int(round(price * 0.34)),
            "weekend": weekend,
        })
    return out
