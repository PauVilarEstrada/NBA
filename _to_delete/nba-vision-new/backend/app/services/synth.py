"""Deterministic synthetic history.

Baselines in `seed.py` describe *what a player averages*. Everything the UI
plots — 82 game logs, home/away splits, head-to-head history, season-by-season
progression — is generated from those baselines with a seeded generator so the
demo has dense, self-consistent data without shipping a database dump.

Consistency is the point: a player's game log *averages to* his listed baseline,
his home/away split matches the league-wide home effect, and his line against a
good defence really is worse than against a bad one. Charts built on it tell the
truth about the model's assumptions, which is what a portfolio demo needs.
"""
from __future__ import annotations

import hashlib
from datetime import date, timedelta

import numpy as np

from app.ml.mock import DISPERSION, MockContext, _multiplier
from app.services.seed import CURRENT_SEASON, DEF_VS_POSITION, TEAM_RATINGS
from app.services.reference import TEAM_BY_ABBR

SEASON_START_DATE = date(CURRENT_SEASON, 10, 21)


def rng_for(*parts) -> np.random.Generator:
    d = hashlib.sha256("|".join(map(str, parts)).encode()).digest()
    return np.random.default_rng(int.from_bytes(d[:8], "big"))


def season_schedule(team_abbr: str, n_games: int = 82, season: int = CURRENT_SEASON) -> list[dict]:
    """A plausible 82-game schedule: alternating homestands/road trips with
    realistic rest patterns (13-15 back-to-backs, the league norm)."""
    rng = rng_for("sched", team_abbr, season)
    others = [a for a in TEAM_RATINGS if a != team_abbr]
    games, day = [], SEASON_START_DATE
    for i in range(n_games):
        opp = others[int(rng.integers(0, len(others)))]
        gap = int(rng.choice([1, 2, 2, 2, 3, 3, 4], p=[.17, .28, .18, .12, .13, .07, .05]))
        day = day + timedelta(days=gap)
        games.append({
            "gameId": f"00{season%100:02d}{i:05d}",
            "date": day.isoformat(),
            "opponent": opp,
            "isHome": bool(i % 2 == 0) if rng.random() < 0.6 else bool(rng.random() < 0.5),
            "restDays": gap - 1,
        })
    return games


def player_game_logs(player: dict, n_games: int = 68) -> list[dict]:
    """One row per game, averaging back to the player's baseline."""
    rng = rng_for("logs", player["playerId"], CURRENT_SEASON)
    sched = season_schedule(player["team"], n_games)
    pos = (player.get("position") or "SF").lower()
    logs = []
    for g in sched:
        opp = g["opponent"]
        ratings = TEAM_RATINGS[opp]
        ctx = MockContext(
            is_home=g["isHome"], rest_days=g["restDays"],
            opp_def_rating=ratings[1], opp_pace=ratings[2],
            opp_def_vs_pos=DEF_VS_POSITION[opp].get(pos if pos in "pg sg sf pf c".split() else "sf", 0.0),
            form_index=float(np.tanh(rng.normal(0, 0.5))),
        )
        row = {"gameId": g["gameId"], "date": g["date"], "opponent": opp,
               "opponentId": TEAM_BY_ABBR[opp][0], "isHome": g["isHome"],
               "restDays": g["restDays"]}
        for stat in ("pts", "reb", "ast", "stl", "blk", "tov", "fg3m", "min"):
            base = float(player.get(stat, 0) or 0)
            mu = base * _multiplier(stat, ctx, rng)
            sd = max(mu * DISPERSION.get(stat, 0.35), np.sqrt(max(mu, 0.4)) * 0.6)
            val = float(rng.normal(mu, sd))
            row[stat] = round(max(0.0, val), 1) if stat == "min" else int(max(0, round(val)))
        row["ts"] = round(float(np.clip(rng.normal(player.get("ts", 0.57), 0.075), 0.30, 0.85)), 3)
        row["plusMinus"] = int(round(rng.normal(0, 11)))
        logs.append(row)
    return logs


def head_to_head(player: dict, opponent_abbr: str, seasons: int = 6) -> list[dict]:
    """Career meetings against one opponent, ~3.6 games a season, split by venue."""
    out = []
    for s in range(seasons):
        season = CURRENT_SEASON - s
        rng = rng_for("h2h", player["playerId"], opponent_abbr, season)
        n = int(rng.integers(2, 5))
        for i in range(n):
            ratings = TEAM_RATINGS[opponent_abbr]
            is_home = bool(i % 2 == 0)
            age_factor = 1.0 - 0.018 * s          # he was slightly different N years ago
            ctx = MockContext(is_home=is_home, rest_days=float(rng.integers(1, 4)),
                              opp_def_rating=ratings[1], opp_pace=ratings[2],
                              form_index=float(np.tanh(rng.normal(0, 0.55))))
            rec = {"season": f"{season}-{str(season+1)[2:]}", "isHome": is_home,
                   "date": (SEASON_START_DATE - timedelta(days=365 * s - 30 * i)).isoformat()}
            for stat in ("pts", "reb", "ast", "min"):
                base = float(player.get(stat, 0) or 0) * age_factor
                mu = base * _multiplier(stat, ctx, rng)
                sd = max(mu * DISPERSION.get(stat, 0.35), 1.0)
                v = float(rng.normal(mu, sd))
                rec[stat] = round(max(0.0, v), 1) if stat == "min" else int(max(0, round(v)))
            out.append(rec)
    return sorted(out, key=lambda r: r["date"])


def career_seasons(player: dict, n: int = 8) -> list[dict]:
    """Season-by-season progression along a standard aging curve."""
    from app.services.market_value import age_curve

    rng = rng_for("career", player["playerId"])
    age_now = float(player.get("age", 27))
    rows = []
    for i in range(n):
        season = CURRENT_SEASON - (n - 1 - i)
        age = age_now - (n - 1 - i)
        if age < 19:
            continue
        scale = age_curve(age) / max(age_curve(age_now), 1e-6)
        # early-career development is steeper than the pure age curve
        if age < 24:
            scale *= 0.62 + 0.095 * (age - 19)
        wobble = float(rng.normal(1.0, 0.045))
        rows.append({
            "season": f"{season}-{str(season+1)[2:]}",
            "seasonStart": season,
            "age": int(age),
            "team": player["team"],
            "gp": int(np.clip(rng.normal(66, 9), 28, 82)),
            **{k: round(float(player.get(k, 0) or 0) * scale * wobble, 1)
               for k in ("min", "pts", "reb", "ast", "stl", "blk", "tov", "fg3m")},
            "ts": round(float(np.clip(player.get("ts", .57) * (0.94 + 0.06 * scale), .45, .70)), 3),
            "per": round(float(np.clip(12 + 14 * scale * (player.get("usg", .22) / .22) * 0.55, 8, 34)), 1),
            "ws": round(float(np.clip(9 * scale * wobble, 0.4, 20)), 1),
            "bpm": round(float(np.clip(-2 + 11 * scale * (player.get("usg", .22) / .25), -4, 13)), 1),
            "vorp": round(float(np.clip(6.5 * scale * wobble, 0.0, 11)), 1),
        })
    return rows
