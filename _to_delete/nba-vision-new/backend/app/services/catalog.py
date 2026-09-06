"""In-memory catalogue built from the seed (demo mode) or from Postgres (live).

Services always call the catalogue, never the seed directly, so switching to the
database is one branch here and no change anywhere else.

Everything a profile page needs is assembled once, at import time: the per-game
line, reconstructed shooting splits, derived advanced metrics, per-36 rates,
league percentile ranks, listed measurements, career path and honours.
"""
from __future__ import annotations

import re
from functools import lru_cache

from app.providers.assets import headshot, team_logo
from app.services import advanced as adv
from app.services import bios, franchise
from app.services import market_value as mv
from app.services.reference import TEAM_BY_ABBR, team_dict
from app.services.seed import CURRENT_SEASON, DEF_VS_POSITION, PLAYERS, TEAM_RATINGS

_FIELDS = ("playerId", "firstName", "lastName", "team", "position", "age", "min",
           "pts", "reb", "ast", "stl", "blk", "tov", "fg3m", "ts", "usg", "salary")

SEASON_LABEL = f"{CURRENT_SEASON}-{str(CURRENT_SEASON + 1)[2:]}"

# Stats the profile shows a league percentile for. `False` = lower is better.
PERCENTILE_STATS: dict[str, bool] = {
    "pts": True, "reb": True, "ast": True, "stl": True, "blk": True, "tov": False,
    "fg3m": True, "min": True, "ts": True, "usg": True,
    "per": True, "bpm": True, "vorp": True, "ws": True, "efgPct": True,
    "fg3Pct": True, "fgPct": True, "gameScore": True, "marketPrice": True,
}


def _slug(first: str, last: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", f"{first} {last}".lower()).strip("-")


def _percentile(sorted_values: list[float], value: float, higher_is_better: bool) -> int:
    """Share of the league this player is at or above (or below, for turnovers)."""
    n = len(sorted_values)
    if n < 2:
        return 50
    below = sum(1 for v in sorted_values if v < value)
    pct = 100 * below / (n - 1)
    return int(round(pct if higher_is_better else 100 - pct))


def _stat_of(row: dict, stat: str) -> float:
    if stat in row:
        return float(row[stat] or 0)
    for block in ("advanced", "shooting"):
        if stat in row.get(block, {}):
            return float(row[block][stat] or 0)
    return 0.0


@lru_cache(maxsize=1)
def all_players() -> list[dict]:
    rows: list[dict] = []
    for raw in PLAYERS:
        p = dict(zip(_FIELDS, raw))
        p["name"] = f'{p["firstName"]} {p["lastName"]}'
        p["slug"] = _slug(p["firstName"], p["lastName"])
        p["teamId"] = TEAM_BY_ABBR[p["team"]][0]
        p["headshot"] = headshot(p["playerId"])
        p["teamLogo"] = team_logo(p["teamId"])
        p["season"] = SEASON_LABEL

        team_pace = TEAM_RATINGS[p["team"]][2]
        p["shooting"] = adv.shooting_splits(p)
        p.update({k: v for k, v in p["shooting"].items()
                  if k in ("fgPct", "fg3Pct", "efgPct", "fga", "fgm", "fg3a", "fta", "ftm")})
        p["rebounding"] = adv.rebound_split(p)
        p["advanced"] = adv.advanced(p, team_pace)
        p["per36"] = adv.per36(p)
        for k in ("per", "bpm", "vorp", "ws", "gameScore"):
            p[k] = p["advanced"][k]

        est = mv.estimate_value({**p, "vorp": p["vorp"]}, p["age"], 68, CURRENT_SEASON)
        p["estimatedValue"] = est
        p["marketPrice"] = mv.blended_price(p["salary"], est)

        b = bios.bio_for(p["playerId"], p["position"])
        p["bio"] = b
        p["honours"] = bios.honours_for(p["playerId"])
        p["rings"] = sum(h["count"] for h in p["honours"] if h["label"] == "NBA Champion")
        p["stints"] = bios.stints_for(p["playerId"], p["team"], b["draftYear"])
        p["experience"] = (CURRENT_SEASON - b["draftYear"]) if b["draftYear"] else 3
        p["isRookie"] = b["draftYear"] == CURRENT_SEASON
        rows.append(p)

    league_max = max(r["marketPrice"] for r in rows)
    # percentile ranks — computed once across the whole league
    pools = {stat: sorted(_stat_of(r, stat) for r in rows) for stat in PERCENTILE_STATS}
    for r in rows:
        r["valueIndex"] = round(100 * r["marketPrice"] / league_max, 1)
        r["surplus"] = r["estimatedValue"] - r["salary"]
        r["leagueMax"] = league_max
        r["percentiles"] = {
            stat: _percentile(pools[stat], _stat_of(r, stat), higher)
            for stat, higher in PERCENTILE_STATS.items()
        }
    return rows


@lru_cache(maxsize=1)
def players_by_id() -> dict[int, dict]:
    return {p["playerId"]: p for p in all_players()}


def get_player(player_id: int) -> dict | None:
    return players_by_id().get(int(player_id))


def search_players(q: str, limit: int = 20) -> list[dict]:
    q = (q or "").strip().lower()
    pool = all_players()
    if not q:
        return sorted(pool, key=lambda p: -p["pts"])[:limit]
    scored = []
    for p in pool:
        name = p["name"].lower()
        if name.startswith(q):
            score = 0
        elif q in name:
            score = 1
        elif q == p["team"].lower():
            score = 2
        elif q == p["position"].lower():
            score = 3
        else:
            continue
        scored.append((score, -p["pts"], p))
    scored.sort(key=lambda t: (t[0], t[1]))
    return [p for _, _, p in scored[:limit]]


def rookies() -> list[dict]:
    """The current draft class, ordered by where they went."""
    rows = [p for p in all_players() if p["isRookie"]]
    return sorted(rows, key=lambda p: (p["bio"]["draftPick"] or 99))


# ------------------------------------------------------------------- teams
@lru_cache(maxsize=1)
def all_teams() -> list[dict]:
    out = []
    for abbr, (off, deff, pace, w, l) in TEAM_RATINGS.items():
        t = team_dict(TEAM_BY_ABBR[abbr][0])
        roster_rows = [p for p in all_players() if p["team"] == abbr]
        minutes = sum(p["min"] for p in roster_rows) or 1

        def weighted(key: str, rows=roster_rows, total=minutes) -> float:
            return sum(_stat_of(p, key) * p["min"] for p in rows) / total

        t.update({
            "offRating": off, "defRating": deff, "netRating": round(off - deff, 1),
            "pace": pace, "wins": w, "losses": l,
            "winPct": round(w / (w + l), 3),
            "defVsPosition": DEF_VS_POSITION[abbr],
            "season": SEASON_LABEL,
            # scoring identity: rating is points per 100, pace is possessions per 48
            "pointsPerGame": round(off * pace / 100, 1),
            "pointsAllowed": round(deff * pace / 100, 1),
            "pointDiff": round((off - deff) * pace / 100, 1),
            "tsPct": round(weighted("ts"), 3),
            "threeRate": round(weighted("threeRate"), 3),
            "payroll": sum(p["salary"] for p in roster_rows),
            "avgAge": round(sum(p["age"] * p["min"] for p in roster_rows) / minutes, 1),
            "franchise": franchise.for_team(abbr),
        })
        out.append(t)

    # league ranks — a rating means nothing without knowing where it sits
    for key, higher in (("offRating", True), ("defRating", False), ("netRating", True),
                        ("pace", True), ("winPct", True), ("pointsPerGame", True)):
        ordered = sorted(out, key=lambda t: t[key], reverse=higher)
        for i, t in enumerate(ordered, 1):
            t[f"{key}Rank"] = i
    return out


@lru_cache(maxsize=1)
def teams_by_id() -> dict[int, dict]:
    return {t["teamId"]: t for t in all_teams()}


@lru_cache(maxsize=1)
def teams_by_abbr() -> dict[str, dict]:
    return {t["abbr"]: t for t in all_teams()}


def get_team(key: int | str) -> dict | None:
    if isinstance(key, str) and not key.isdigit():
        return teams_by_abbr().get(key.upper())
    return teams_by_id().get(int(key))


def roster(team_key: int | str) -> list[dict]:
    t = get_team(team_key)
    if not t:
        return []
    return sorted([p for p in all_players() if p["teamId"] == t["teamId"]],
                  key=lambda p: -p["pts"])


def team_leaders(team_key: int | str) -> dict:
    r = roster(team_key)
    if not r:
        return {}
    out = {}
    for stat in ("pts", "reb", "ast", "stl", "blk", "fg3m", "per"):
        best = max(r, key=lambda p: p[stat])
        out[stat] = {"playerId": best["playerId"], "name": best["name"],
                     "value": best[stat], "headshot": best["headshot"]}
    return out


def cap_sheet(team_key: int | str) -> dict:
    from app.providers.contracts import cap_for

    t = get_team(team_key)
    r = roster(team_key)
    cap = cap_for(CURRENT_SEASON)
    committed = sum(p["salary"] for p in r)
    return {
        "teamId": t["teamId"], "abbr": t["abbr"], "salaryCap": cap,
        "committed": committed, "capSpace": cap - committed,
        "overCap": committed > cap,
        "luxuryTax": int(cap * 1.2158),
        "taxBill": max(0, committed - int(cap * 1.2158)),
        "players": [{"playerId": p["playerId"], "name": p["name"],
                     "salary": p["salary"], "estimatedValue": p["estimatedValue"],
                     "surplus": p["surplus"], "age": p["age"]} for p in r],
    }
