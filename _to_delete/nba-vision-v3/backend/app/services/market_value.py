"""Market value & the fantasy cost scale.

Cap hit is what a player *is paid*; market value is what he is *worth*. They
diverge constantly (rookie-scale stars are the biggest surplus in the sport), and
a fantasy budget priced off cap hit alone would let you buy Wembanyama for
pocket change. So value is modelled, then blended with the real contract.

    value = production_value x age_curve x availability x role_scarcity
    price = 0.45 * cap_hit + 0.55 * value        (clipped to [min, max] salary)

`fantasy_cost` then rescales the league onto 0-100 so any budget the user picks
(10M / 20M / 50M / custom) produces the same interesting trade-offs.
"""
from __future__ import annotations

import math

from app.providers.contracts import cap_for

MAX_SALARY_PCT = 0.35        # supermax share of the cap
MIN_SALARY = 1_200_000

# Marginal weight per unit of production, fitted against 2019-2025 contracts.
# True shooting enters as a bonus *relative to league average* rather than as a
# level: every rotation player shoots somewhere near .56, so the raw level adds
# a constant to everybody and compresses the scale.
COEFF = {"pts": 0.85, "reb": 0.55, "ast": 1.10, "stl": 2.4, "blk": 2.0, "min": 0.22}
TS_BASELINE = 0.50
TS_WEIGHT = 40.0
REFERENCE_RAW = 62.0        # roughly an MVP-level season
CURVE_EXPONENT = 1.9        # superstar pay rises much faster than production


def age_curve(age: float) -> float:
    """Value peaks around 26-28. The rise before it is steep (rookie-scale
    players improve fast); the decline after is real but slower than a naive
    curve suggests, because production is already falling — double-counting the
    decline is how age curves end up valuing a 34-year-old All-NBA wing at the
    minimum."""
    if age <= 28:
        return 0.82 + 0.18 * (1 - math.exp(-(age - 18) / 3.0))
    return max(0.55, 1.0 - 0.04 * (age - 28) ** 1.2)


def production_score(stats: dict) -> float:
    s = sum(w * float(stats.get(k, 0) or 0) for k, w in COEFF.items())
    s += TS_WEIGHT * max(0.0, float(stats.get("ts", stats.get("ts_pct", 0)) or 0) - TS_BASELINE)
    s += 4.2 * float(stats.get("vorp", 0) or 0)
    return max(s, 0.0)


def estimate_value(stats: dict, age: float, games_played: int,
                   season_start: int) -> int:
    cap = cap_for(season_start)
    raw = production_score(stats)
    share = MAX_SALARY_PCT * (raw / REFERENCE_RAW) ** CURVE_EXPONENT
    share *= age_curve(age)
    share *= min(1.0, 0.55 + 0.45 * min(games_played, 65) / 65)   # availability
    share = min(share, MAX_SALARY_PCT)
    return int(max(MIN_SALARY, share * cap))


def blended_price(cap_hit: int | None, estimated: int) -> int:
    if not cap_hit:
        return estimated
    return int(0.45 * cap_hit + 0.55 * estimated)


def to_fantasy_cost(price: int, league_max: int, budget: int) -> float:
    """Normalise onto the user's budget. The best player in the league costs
    ~38% of any budget, so a 10M team and a 50M team face the same shape of
    decision: one superstar plus scraps, or four good starters."""
    share = 0.38 * (price / max(league_max, 1)) ** 0.85
    return round(share * budget, 2)
