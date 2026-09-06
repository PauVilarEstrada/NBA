"""Fantasy builder: pricing, budget validation, and the roster-removal rule.

The rule that makes the mode interesting: signing a player *removes him from his
real team* for the duration of that simulation. So building the dream team also
weakens the opponent you might want to face — and the simulator sees that
change, because the opponent's roster and ratings are recomputed after the
removal, not before.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.ml.simulator import GameSimulator, SimPlayer, SimTeam, monte_carlo
from app.services import catalog
from app.services.market_value import to_fantasy_cost

BUDGET_PRESETS = [10_000_000, 20_000_000, 50_000_000, 100_000_000]
ROSTER_MIN, ROSTER_MAX = 5, 10


def price_pool(budget: int) -> list[dict]:
    """The whole league priced against this budget."""
    players = catalog.all_players()
    league_max = players[0]["leagueMax"]
    out = []
    for p in players:
        cost = to_fantasy_cost(p["marketPrice"], league_max, budget)
        out.append({
            **{k: p[k] for k in ("playerId", "name", "team", "teamId", "position",
                                 "headshot", "teamLogo", "age", "pts", "reb", "ast",
                                 "stl", "blk", "ts", "usg", "min", "salary")},
            "cost": cost,
            "costPct": round(100 * cost / budget, 1),
            "marketPrice": p["marketPrice"],
            "valueIndex": p["valueIndex"],
            # production per dollar — the stat that makes the mode a puzzle
            "efficiency": round((p["pts"] + 1.2 * p["reb"] + 1.5 * p["ast"]) / max(cost / budget * 100, 0.1), 2),
        })
    return sorted(out, key=lambda x: -x["cost"])


def validate(roster: list[dict], budget: int) -> dict:
    spent = sum(p["cost"] for p in roster)
    errors = []
    if len(roster) < ROSTER_MIN:
        errors.append(f"A lineup needs at least {ROSTER_MIN} players")
    if len(roster) > ROSTER_MAX:
        errors.append(f"Maximum {ROSTER_MAX} players")
    if spent > budget:
        errors.append(f"Over budget by ${spent - budget:,.0f}")
    return {"valid": not errors, "errors": errors, "spent": spent,
            "remaining": budget - spent, "count": len(roster)}


def _to_sim_player(p: dict, team_abbr: str, minutes: float) -> SimPlayer:
    return SimPlayer(
        player_id=p["playerId"], name=p["name"], team=team_abbr,
        position=p.get("position", "SF"), minutes=minutes,
        usage=float(p.get("usg", 0.20)), ts_pct=float(p.get("ts", 0.57)),
        three_rate=float(min(0.62, (p.get("fg3m", 1.0) or 0) / max(p.get("pts", 10) / 2.2, 1))),
        ft_rate=0.24,
        reb_rate=float(min(0.30, (p.get("reb", 4) or 0) / 44.0)),
        ast_rate=float(min(0.40, (p.get("ast", 3) or 0) / 24.0)),
        stl_rate=float((p.get("stl", 1.0) or 0) / 60.0),
        blk_rate=float((p.get("blk", 0.6) or 0) / 45.0),
        tov_rate=float(min(0.25, (p.get("tov", 2.0) or 0) / 16.0)),
    )


def build_user_team(roster: list[dict], name: str = "Your Team") -> SimTeam:
    """Minutes are allocated by usage, capped at 38 and floored at 12, then
    normalised to the 240 team-minutes a game actually has."""
    weights = [max(p.get("usg", 0.18), 0.08) for p in roster]
    total = sum(weights)
    minutes = [min(38.0, max(12.0, 240 * w / total)) for w in weights]
    scale = 240 / sum(minutes)
    players = [_to_sim_player(p, "YOU", m * scale) for p, m in zip(roster, minutes)]
    # ratings derived from the roster rather than assumed
    off = 104 + sum(p.get("pts", 0) for p in roster) * 0.42
    deff = 118 - sum((p.get("stl", 0) * 2.2 + p.get("blk", 0) * 2.6) for p in roster) * 0.55
    return SimTeam(team_id="user", name=name, abbr="YOU", players=players,
                   off_rating=float(min(126, off)), def_rating=float(max(103, deff)),
                   pace=100.5, is_home=False)


ROTATION_SIZE = 9


def _replacement_players(team: dict, n: int, start_index: int) -> list[dict]:
    """Replacement-level rotation filler.

    The demo seed carries the top of each roster, not all 15 contracts. Rather
    than let three stars play 48 minutes each — which would inflate every
    simulated box score — the rotation is completed with replacement-level
    players scaled to the team's own ratings, and each is flagged `isFiller`
    so the UI can grey them out. After `scripts/ingest.py` populates real
    rosters this function returns nothing.
    """
    quality = (team["offRating"] - 113.5) * 0.004
    return [{
        "playerId": -(team["teamId"] * 100 + i),
        "name": f'{team["abbr"]} Rotation {i + 1}',
        "position": ["PG", "SG", "SF", "PF", "C"][i % 5],
        "isFiller": True,
        "min": 16.0, "pts": 7.4, "reb": 3.2, "ast": 1.8, "stl": 0.6, "blk": 0.4,
        "tov": 1.1, "fg3m": 1.0, "ts": round(0.545 + quality, 3), "usg": 0.155,
        "age": 26, "salary": 2_500_000,
    } for i in range(start_index, start_index + n)]


def build_real_team(team_key: int | str, exclude: set[int] | None = None) -> SimTeam:
    """The opponent, minus anyone the user has signed away."""
    exclude = exclude or set()
    t = catalog.get_team(team_key)
    pool = [p for p in catalog.roster(t["teamId"]) if p["playerId"] not in exclude]
    if not pool:
        raise ValueError(f'You signed every listed {t["abbr"]} player — pick another opponent')
    if len(pool) < ROTATION_SIZE:
        pool = pool + _replacement_players(t, ROTATION_SIZE - len(pool), len(pool))

    weights = [max(p.get("usg", 0.18), 0.08) for p in pool]
    total = sum(weights)
    minutes = [min(36.0, max(8.0, 240 * w / total)) for w in weights]
    scale = 240 / sum(minutes)
    players = [_to_sim_player(p, t["abbr"], m * scale) for p, m in zip(pool, minutes)]

    # losing players degrades the team: each removed starter costs real rating
    removed = [p for p in catalog.roster(t["teamId"]) if p["playerId"] in exclude]
    off_penalty = sum(p["pts"] * 0.33 + p["ast"] * 0.28 for p in removed)
    def_penalty = sum(p["stl"] * 1.4 + p["blk"] * 1.6 for p in removed)
    return SimTeam(
        team_id=t["teamId"], name=t["fullName"], abbr=t["abbr"], players=players,
        off_rating=float(t["offRating"] - off_penalty),
        def_rating=float(t["defRating"] + def_penalty),
        pace=float(t["pace"]), is_home=True,
    )


def simulate(roster: list[dict], opponent_key: int | str, seed: int = 7,
             is_playoffs: bool = False, user_is_home: bool = False,
             monte_carlo_runs: int = 0) -> dict:
    signed = {p["playerId"] for p in roster}
    user = build_user_team(roster)
    real = build_real_team(opponent_key, exclude=signed)
    home, away = (user, real) if user_is_home else (real, user)
    home.is_home, away.is_home = True, False

    sim = GameSimulator(home, away, seed=seed, is_playoffs=is_playoffs)
    result = sim.run()
    result["userSide"] = "home" if user_is_home else "away"
    result["signedAway"] = [
        {"playerId": p["playerId"], "name": p["name"], "from": p["team"]}
        for p in roster
        if catalog.get_player(p["playerId"]) and
        catalog.get_player(p["playerId"])["teamId"] == catalog.get_team(opponent_key)["teamId"]
    ]
    result["seed"] = seed
    result["isPlayoffs"] = is_playoffs
    if monte_carlo_runs:
        result["distribution"] = monte_carlo(home, away, n=monte_carlo_runs,
                                             seed=seed, is_playoffs=is_playoffs)
    return result
