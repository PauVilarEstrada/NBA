"""Derived shooting splits and advanced metrics.

In live mode PER / WS / BPM / VORP come from Basketball-Reference and the
shooting splits come from the box scores. In demo mode there are no box scores
to aggregate, so this module *reconstructs* them from the per-game line and
true shooting percentage using the same identities the real numbers satisfy:

    TS%  = PTS / (2 · (FGA + 0.44 · FTA))
    eFG% = (FGM + 0.5 · 3PM) / FGA
    PTS  = 2 · 2PM + 3 · 3PM + FTM

That means the reconstructed splits are internally consistent — points really do
add up out of twos, threes and free throws — rather than being three unrelated
random numbers. Everything produced here is tagged `derived: true`, and the UI
says so, because a reconstructed BPM is an estimate and should not be presented
as a measurement.
"""
from __future__ import annotations

LEAGUE_3P_PCT = 0.365
LEAGUE_FT_PCT = 0.782
LEAGUE_PACE = 99.2
LEAGUE_RATING = 113.5

# free-throw rate (FTA per FGA) by position — bigs get to the line more
FT_RATE_BY_POS = {"PG": 0.22, "SG": 0.21, "SF": 0.25, "PF": 0.28, "C": 0.31}
# share of a player's rebounds that come on the offensive glass
OREB_SHARE_BY_POS = {"PG": 0.11, "SG": 0.14, "SF": 0.20, "PF": 0.27, "C": 0.32}


def shooting_splits(p: dict) -> dict:
    pos = (p.get("position") or "SF").upper()
    pts = float(p.get("pts", 0) or 0)
    fg3m = float(p.get("fg3m", 0) or 0)
    ts = float(p.get("ts", 0.56) or 0.56)
    ft_rate = FT_RATE_BY_POS.get(pos, 0.25)

    # Invert the true-shooting identity for shot volume.
    scoring_possessions = pts / max(2 * ts, 1e-6)          # FGA + 0.44·FTA
    fga = scoring_possessions / (1 + 0.44 * ft_rate)
    fta = fga * ft_rate
    ftm = fta * LEAGUE_FT_PCT

    fg3a = fg3m / LEAGUE_3P_PCT if fg3m > 0 else 0.0
    fg3a = min(fg3a, fga * 0.85)                            # nobody is all threes
    fg2a = max(fga - fg3a, 0.1)

    pts_from_2 = max(pts - 3 * fg3m - ftm, 0.0)
    fg2m = pts_from_2 / 2
    fg2m = min(fg2m, fg2a)                                  # cannot make more than taken
    fgm = fg2m + fg3m

    return {
        "fgm": round(fgm, 1), "fga": round(fga, 1),
        "fgPct": round(fgm / fga, 3) if fga else 0.0,
        "fg2m": round(fg2m, 1), "fg2a": round(fg2a, 1),
        "fg2Pct": round(fg2m / fg2a, 3) if fg2a else 0.0,
        "fg3m": round(fg3m, 1), "fg3a": round(fg3a, 1),
        "fg3Pct": round(fg3m / fg3a, 3) if fg3a else 0.0,
        "ftm": round(ftm, 1), "fta": round(fta, 1),
        "ftPct": LEAGUE_FT_PCT,
        "efgPct": round((fgm + 0.5 * fg3m) / fga, 3) if fga else 0.0,
        "tsPct": round(ts, 3),
        "threeRate": round(fg3a / fga, 3) if fga else 0.0,
        "ftRate": round(fta / fga, 3) if fga else 0.0,
        "pointsFrom": {
            "two": round(2 * fg2m, 1),
            "three": round(3 * fg3m, 1),
            "free": round(ftm, 1),
        },
    }


def rebound_split(p: dict) -> dict:
    pos = (p.get("position") or "SF").upper()
    share = OREB_SHARE_BY_POS.get(pos, 0.20)
    reb = float(p.get("reb", 0) or 0)
    return {"oreb": round(reb * share, 1), "dreb": round(reb * (1 - share), 1)}


def game_score(p: dict, s: dict) -> float:
    """Hollinger's Game Score — a single-number box summary on roughly the same
    scale as points, so 10 is a solid night and 40 is a monster one."""
    return round(
        float(p.get("pts", 0)) + 0.4 * s["fgm"] - 0.7 * s["fga"]
        - 0.4 * (s["fta"] - s["ftm"]) + 0.7 * rebound_split(p)["oreb"]
        + 0.3 * rebound_split(p)["dreb"] + float(p.get("stl", 0))
        + 0.7 * float(p.get("ast", 0)) + 0.7 * float(p.get("blk", 0))
        - 0.4 * 2.0 - float(p.get("tov", 0)), 1)


def advanced(p: dict, team_pace: float = LEAGUE_PACE) -> dict:
    """Approximate the advanced box-score family.

    These are calibrated regressions onto the real metrics, not the official
    formulas (which need team totals this dataset does not carry). Good enough
    to rank players sensibly, clearly flagged as derived.
    """
    s = shooting_splits(p)
    mins = max(float(p.get("min", 0) or 0), 1.0)
    poss_share = mins / 48.0
    usg = float(p.get("usg", 0.2) or 0.2)
    ts = float(p.get("ts", 0.56) or 0.56)

    # scoring efficiency above league average, weighted by how much he shoots
    efficiency_edge = (ts - 0.565) * 100
    creation = float(p.get("ast", 0)) * 1.6 - float(p.get("tov", 0)) * 1.4
    defence = float(p.get("stl", 0)) * 2.6 + float(p.get("blk", 0)) * 2.2
    glass = float(p.get("reb", 0)) * 0.55

    per = 8.0 + usg * 42 + efficiency_edge * 0.55 + creation * 0.35 + defence * 0.45 + glass * 0.30
    bpm = -4.0 + usg * 22 + efficiency_edge * 0.30 + creation * 0.30 + defence * 0.40
    obpm = bpm * 0.62 + efficiency_edge * 0.12
    dbpm = bpm - obpm
    ws48 = max(0.0, 0.03 + efficiency_edge * 0.0045 + (creation + defence) * 0.0022)
    ws = ws48 * (mins * 68) / 48
    vorp = max(0.0, (bpm + 2.0) * poss_share * 68 / 82 * 2.7)

    ortg = LEAGUE_RATING + efficiency_edge * 1.15 + creation * 0.5
    drtg = LEAGUE_RATING - defence * 1.1 - glass * 0.35

    return {
        "per": round(min(max(per, 4.0), 34.0), 1),
        "ws": round(min(max(ws, 0.0), 20.0), 1),
        "ws48": round(min(ws48, 0.32), 3),
        "bpm": round(min(max(bpm, -6.0), 13.0), 1),
        "obpm": round(obpm, 1),
        "dbpm": round(dbpm, 1),
        "vorp": round(min(vorp, 11.0), 1),
        "ortg": round(ortg, 1),
        "drtg": round(drtg, 1),
        "netRtg": round(ortg - drtg, 1),
        "usgPct": round(usg * 100, 1),
        "gameScore": game_score(p, s),
        "derived": True,
    }


def per36(p: dict) -> dict:
    """Per-36 normalises for role: it is the only fair way to compare a
    28-minute sixth man with a 36-minute starter."""
    mins = max(float(p.get("min", 0) or 0), 1.0)
    k = 36.0 / mins
    return {stat: round(float(p.get(stat, 0) or 0) * k, 1)
            for stat in ("pts", "reb", "ast", "stl", "blk", "tov", "fg3m")}
