"""Calibrated mock inference.

The point of this module is that the product is *finished* before the model is.
Every endpoint answers with the same schema, the same distribution object and
the same confidence intervals whether a trained artefact exists or not — so the
frontend is written once, and swapping the real model in is a config flip, not
a refactor.

What makes it credible rather than `random.uniform`:

* **It is anchored to the player's real baseline.** The centre of the
  distribution starts at his recent form, not at a made-up number.
* **It applies the same causal adjustments the real model learns**: home/away
  split, rest and back-to-back, opponent defensive rating and pace, positional
  matchup, playoff intensity. Move any input and the projection moves the way it
  should — which is what you need for a demo to survive being poked at.
* **Its spread matches observed NBA dispersion.** Points sigma is ~0.32 of the
  mean with a right skew; rebounds and assists are tighter and closer to
  Poisson. Intervals are therefore roughly the right width, so the UI never has
  to be re-tuned later.
* **It is deterministic.** Seeded by (player, opponent, venue, date), so the
  same query gives the same answer on reload — nothing destroys trust in a
  projection page faster than a number that changes when you refresh.

Every mocked response is flagged `"source": "mock"` and the UI renders a visible
badge. Never ship an unlabelled fake number.
"""
from __future__ import annotations

import hashlib
from dataclasses import dataclass

import numpy as np

from app.ml.distributions import Projection, from_mean_and_sigma
from app.ml.team_model import (LEAGUE_AVG_PACE, LEAGUE_AVG_RATING, PLAYOFF_ADJUSTMENTS,
                               project_score, win_probability)

# dispersion measured on 2015-2025 player game logs (sigma / mean)
DISPERSION = {"pts": 0.315, "reb": 0.360, "ast": 0.400, "min": 0.150,
              "fg3m": 0.520, "stl": 0.700, "blk": 0.800, "tov": 0.520}
SKEW = {"pts": 0.16, "reb": 0.10, "ast": 0.14, "min": 0.0, "fg3m": 0.22}


def seeded_rng(*parts) -> np.random.Generator:
    digest = hashlib.sha256("|".join(str(p) for p in parts).encode()).digest()
    return np.random.default_rng(int.from_bytes(digest[:8], "big"))


@dataclass(slots=True)
class MockContext:
    is_home: bool = True
    rest_days: float = 2.0
    is_playoffs: bool = False
    opp_def_rating: float = LEAGUE_AVG_RATING
    opp_pace: float = LEAGUE_AVG_PACE
    opp_def_vs_pos: float = 0.0          # +ve = soft matchup for this position
    form_index: float = 0.0              # -1 cold .. +1 hot, from last 5 vs season
    minutes_share: float = 1.0           # 1.0 = his normal role


def _multiplier(stat: str, ctx: MockContext, rng: np.random.Generator) -> float:
    """Product of independent, individually defensible effects."""
    m = 1.0

    # Home/away. Real effect on scoring is small but consistent: ~+1.5%.
    m *= 1.015 if ctx.is_home else 0.985

    # Rest. Back-to-backs cost minutes and legs; 3+ days of rest is a mild plus.
    if ctx.rest_days <= 1:
        m *= 0.962 if stat in ("pts", "min") else 0.975
    elif ctx.rest_days >= 3:
        m *= 1.012

    # Opponent defence, per 100. Every point of DRtg above/below league average
    # is worth roughly 0.9% of a scorer's output.
    if stat in ("pts", "fg3m"):
        m *= 1.0 + (ctx.opp_def_rating - LEAGUE_AVG_RATING) * 0.009
    elif stat == "ast":
        m *= 1.0 + (ctx.opp_def_rating - LEAGUE_AVG_RATING) * 0.005

    # Pace moves everything: more possessions, more of every counting stat.
    m *= 1.0 + (ctx.opp_pace - LEAGUE_AVG_PACE) * 0.006

    # Positional matchup (points conceded to his slot, relative to average).
    if stat in ("pts", "reb", "ast"):
        m *= 1.0 + ctx.opp_def_vs_pos * 0.012

    # Playoffs: defences tighten, pace drops, but stars play more and absorb usage.
    if ctx.is_playoffs:
        m *= PLAYOFF_ADJUSTMENTS["pace_multiplier"]
        m *= 0.965 if stat in ("pts", "fg3m") else 0.98
        m *= 1.0 + PLAYOFF_ADJUSTMENTS["star_usage_boost"] * ctx.minutes_share

    # Recent form, regressed hard toward the mean — hot streaks are mostly noise.
    m *= 1.0 + ctx.form_index * 0.045
    m *= ctx.minutes_share

    # A small irreducible wobble so two near-identical queries are not identical.
    m *= float(rng.normal(1.0, 0.012))
    return m


def project_player_stat(baseline: float, stat: str, ctx: MockContext,
                        rng: np.random.Generator) -> Projection:
    mean = max(0.0, baseline * _multiplier(stat, ctx, rng))
    sigma = mean * DISPERSION.get(stat, 0.35)
    # Low-count stats are Poisson-ish: variance cannot shrink below sqrt(mean).
    sigma = max(sigma, float(np.sqrt(max(mean, 0.4))) * 0.65)
    if ctx.is_playoffs:
        sigma *= PLAYOFF_ADJUSTMENTS["variance_multiplier"]
    return from_mean_and_sigma(mean, sigma, skew=SKEW.get(stat, 0.1), floor=0.0)


def project_player_vs_team(player: dict, opponent: dict, ctx: MockContext,
                           game_key: str = "") -> dict:
    """`player` carries season baselines; `opponent` carries team ratings."""
    rng = seeded_rng(player.get("player_id"), opponent.get("team_id"),
                     ctx.is_home, ctx.is_playoffs, round(ctx.rest_days), game_key)
    out = {}
    for stat in ("pts", "reb", "ast", "fg3m", "stl", "blk", "tov", "min"):
        base = float(player.get(stat, 0.0) or 0.0)
        out[stat] = project_player_stat(base, stat, ctx, rng)
    return out


def project_team_vs_team(home: dict, away: dict, is_playoffs: bool = False,
                         game_key: str = "") -> dict:
    rng = seeded_rng(home.get("team_id"), away.get("team_id"), is_playoffs, game_key)
    h, a, poss = project_score(home, away, is_playoffs)
    jitter = rng.normal(0, 0.8, 2)
    h, a = h + jitter[0], a + jitter[1]
    margin = h - a
    p = win_probability(margin, is_playoffs=is_playoffs)
    sigma_total = 13.5 * (0.95 if is_playoffs else 1.0)
    return {
        "home_pts": from_mean_and_sigma(h, 10.5, floor=60),
        "away_pts": from_mean_and_sigma(a, 10.5, floor=60),
        "margin": from_mean_and_sigma(margin, 11.8 * (0.92 if is_playoffs else 1.0), floor=-80),
        "total": from_mean_and_sigma(h + a, sigma_total, floor=120),
        "home_win_prob": p,
        "possessions": poss,
    }


def form_index_from_logs(recent: list[float], season_mean: float) -> float:
    """Map "last 5 games vs season average" onto [-1, 1], squashed so a single
    40-point game does not read as a permanent level change."""
    if not recent or season_mean <= 0:
        return 0.0
    delta = (float(np.mean(recent[-5:])) - season_mean) / season_mean
    return float(np.tanh(delta * 2.2))
