"""The inference layer the API routes call.

One contract for the whole app: build features -> if a trained artefact exists
use it, otherwise use the calibrated mock -> return the same `Projection`
objects either way, tagged with the source so the UI can badge it.
"""
from __future__ import annotations

from datetime import date

import numpy as np
import pandas as pd

from app.core.config import settings
from app.ml import mock
from app.ml.distributions import Projection, blend
from app.ml.features import POSITION_SLOT, build_player_features
from app.ml.registry import registry
from app.ml.team_model import (PLAYOFF_ADJUSTMENTS, project_score, series_probability,
                               win_probability)
from app.services import catalog, synth

DEFAULT_LINES = {"pts": None, "reb": None, "ast": None, "fg3m": None}


def _lines_from(proj: dict[str, Projection]) -> dict[str, float]:
    """Sportsbook-style half-point lines centred on the median."""
    return {k: round(float(np.floor(p.median)) + 0.5, 1) for k, p in proj.items()}


def predict_player_vs_team(player_id: int, opponent_key: int | str, is_home: bool,
                           rest_days: float = 2.0, is_playoffs: bool = False,
                           lines: dict[str, float] | None = None) -> dict:
    player = catalog.get_player(player_id)
    opponent = catalog.get_team(opponent_key)
    if player is None or opponent is None:
        raise LookupError("unknown player or team")

    logs = synth.player_game_logs(player)
    recent = [g["pts"] for g in logs[-8:]]
    season_type = "playoffs" if is_playoffs else "regular"
    pos = POSITION_SLOT.get((player.get("position") or "SF").upper(), "sf")

    ctx = mock.MockContext(
        is_home=is_home, rest_days=rest_days, is_playoffs=is_playoffs,
        opp_def_rating=opponent["defRating"], opp_pace=opponent["pace"],
        opp_def_vs_pos=opponent["defVsPosition"].get(pos, 0.0),
        form_index=mock.form_index_from_logs(recent, player["pts"]),
    )

    used_model = False
    projections: dict[str, Projection] = {}

    if any(registry.has_player(t, season_type) for t in ("pts", "reb", "ast")):
        df = pd.DataFrame([_feature_row(player, opponent, logs, ctx)])
        for target in ("pts", "reb", "ast", "min"):
            bundle = registry.get_player(target, season_type)
            if bundle is not None:
                projections[target] = bundle.predict(df)
                used_model = True
        # anything the model does not cover still gets a projection
        fallback = mock.project_player_vs_team(player, opponent, ctx)
        for k, v in fallback.items():
            projections.setdefault(k, v)
    else:
        if not settings.allow_mock_inference:
            raise RuntimeError("no trained model available and mock inference is disabled")
        projections = mock.project_player_vs_team(player, opponent, ctx)

    lines = lines or _lines_from({k: projections[k] for k in ("pts", "reb", "ast", "fg3m")})

    return {
        "player": {k: player[k] for k in ("playerId", "name", "team", "teamId",
                                          "position", "headshot", "teamLogo")},
        "opponent": {k: opponent[k] for k in ("teamId", "abbr", "fullName", "logo",
                                              "primaryColor", "defRating", "pace")},
        "context": {
            "venue": "home" if is_home else "away",
            "restDays": rest_days,
            "seasonType": season_type,
            "formIndex": round(ctx.form_index, 3),
            "matchupDefVsPosition": ctx.opp_def_vs_pos,
        },
        "projections": {
            k: v.to_dict(lines.get(k)) for k, v in projections.items()
        },
        "drivers": _drivers(player, opponent, ctx),
        "source": "model" if used_model else "mock",
        "modelStatus": registry.status(),
    }


def _feature_row(player: dict, opponent: dict, logs: list[dict], ctx: mock.MockContext) -> dict:
    df = pd.DataFrame(logs)
    df["game_date"] = pd.to_datetime(df["date"])
    df["ts_pct"] = df["ts"]
    df["usg_pct"] = player.get("usg", 0.22)
    feats = build_player_features(
        logs=df, opponent_id=opponent["teamId"], is_home=ctx.is_home,
        rest_days=ctx.rest_days, is_playoffs=ctx.is_playoffs,
        opp_row={"def_rating": opponent["defRating"], "pace": opponent["pace"],
                 **{f"def_vs_{k}": v for k, v in opponent["defVsPosition"].items()}},
        player_row={"position": player["position"], "age": player["age"],
                    "team_off_rating": catalog.get_team(player["teamId"])["offRating"]},
    )
    return feats.to_row()


def _drivers(player: dict, opponent: dict, ctx: mock.MockContext) -> list[dict]:
    """What moved the projection, in points, so the UI can show *why*.
    These are the same effects `ml.mock._multiplier` applies — exposing them is
    what turns a number into an explanation."""
    base = player["pts"]
    out = [
        {"label": "Venue", "detail": "Home court" if ctx.is_home else "On the road",
         "impact": round(base * (0.015 if ctx.is_home else -0.015), 2)},
        {"label": "Opponent defence",
         "detail": f'{opponent["abbr"]} DRtg {opponent["defRating"]:.1f}',
         "impact": round(base * (opponent["defRating"] - 113.5) * 0.009, 2)},
        {"label": "Pace", "detail": f'{opponent["abbr"]} plays at {opponent["pace"]:.1f}',
         "impact": round(base * (opponent["pace"] - 99.2) * 0.006, 2)},
        {"label": "Rest",
         "detail": "Back-to-back" if ctx.rest_days <= 1 else f"{int(ctx.rest_days)} days off",
         "impact": round(base * (-0.038 if ctx.rest_days <= 1 else (0.012 if ctx.rest_days >= 3 else 0)), 2)},
        {"label": "Matchup", "detail": f"{player['position']} defence vs league average",
         "impact": round(base * ctx.opp_def_vs_pos * 0.012, 2)},
        {"label": "Recent form", "detail": "Last 5 games vs season average",
         "impact": round(base * ctx.form_index * 0.045, 2)},
    ]
    if ctx.is_playoffs:
        out.append({"label": "Playoff intensity",
                    "detail": "Tighter defence, shorter rotations",
                    "impact": round(base * -0.035 + base * 0.06, 2)})
    return sorted(out, key=lambda d: -abs(d["impact"]))


# ------------------------------------------------------------ team vs team
def predict_team_vs_team(home_key: int | str, away_key: int | str,
                         is_playoffs: bool = False, home_rest: float = 2.0,
                         away_rest: float = 2.0, series: bool = False) -> dict:
    home, away = catalog.get_team(home_key), catalog.get_team(away_key)
    if home is None or away is None:
        raise LookupError("unknown team")

    def ratings(t: dict, rest: float) -> dict:
        return {"team_id": t["teamId"], "off_rating": t["offRating"],
                "def_rating": t["defRating"], "pace": t["pace"],
                "rest_days": rest, "is_b2b": int(rest <= 1)}

    h, a = ratings(home, home_rest), ratings(away, away_rest)
    result = mock.project_team_vs_team(h, a, is_playoffs)
    used_model = False

    bundle = registry.get_team("playoffs" if is_playoffs else "regular")
    if bundle is not None:
        from app.ml.features import TEAM_FEATURE_ORDER, TeamGameFeatures
        f = TeamGameFeatures(
            off_rating=home["offRating"], def_rating=home["defRating"], pace=home["pace"],
            net_rating=home["netRating"], is_home=1, rest_days=home_rest,
            is_b2b=int(home_rest <= 1), opp_off_rating=away["offRating"],
            opp_def_rating=away["defRating"], opp_pace=away["pace"],
            opp_rest_days=away_rest, is_playoffs=int(is_playoffs),
        )
        pred = bundle.predict(pd.DataFrame([f.to_row()], columns=list(TEAM_FEATURE_ORDER)))
        result["home_win_prob"] = pred["home_win_prob"]
        used_model = True

    # per-player contribution, so the team number is decomposable
    contributions = []
    for team, opp, at_home in ((home, away, True), (away, home, False)):
        for p in catalog.roster(team["teamId"])[:8]:
            pos = POSITION_SLOT.get((p.get("position") or "SF").upper(), "sf")
            ctx = mock.MockContext(is_home=at_home, is_playoffs=is_playoffs,
                                   opp_def_rating=opp["defRating"], opp_pace=opp["pace"],
                                   opp_def_vs_pos=opp["defVsPosition"].get(pos, 0.0),
                                   minutes_share=1.0)
            proj = mock.project_player_vs_team(p, opp, ctx)
            contributions.append({
                "playerId": p["playerId"], "name": p["name"], "team": team["abbr"],
                "headshot": p["headshot"],
                "pts": round(proj["pts"].mean, 1), "reb": round(proj["reb"].mean, 1),
                "ast": round(proj["ast"].mean, 1), "min": round(proj["min"].mean, 1),
            })

    out = {
        "home": {**{k: home[k] for k in ("teamId", "abbr", "fullName", "logo",
                                         "primaryColor", "offRating", "defRating", "pace")},
                 "restDays": home_rest},
        "away": {**{k: away[k] for k in ("teamId", "abbr", "fullName", "logo",
                                         "primaryColor", "offRating", "defRating", "pace")},
                 "restDays": away_rest},
        "seasonType": "playoffs" if is_playoffs else "regular",
        "projection": {
            "homePts": result["home_pts"].to_dict(),
            "awayPts": result["away_pts"].to_dict(),
            "margin": result["margin"].to_dict(0.0),
            "total": result["total"].to_dict(),
            "homeWinProb": round(result["home_win_prob"], 4),
            "awayWinProb": round(1 - result["home_win_prob"], 4),
            "possessions": round(result["possessions"], 1),
            "spread": round(-result["margin"].mean, 1),
        },
        "contributions": sorted(contributions, key=lambda c: -c["pts"]),
        "playoffAdjustments": PLAYOFF_ADJUSTMENTS if is_playoffs else None,
        "source": "model" if used_model else "mock",
    }

    if series:
        p_home = result["home_win_prob"]
        away_result = mock.project_team_vs_team(a, h, is_playoffs)
        p_away = 1 - away_result["home_win_prob"]        # home team winning *away*
        out["series"] = {
            "homeWinsSeries": round(series_probability(p_home, p_away), 4),
            "gameHomeProb": round(p_home, 4),
            "gameAwayProb": round(p_away, 4),
            "format": "2-2-1-1-1",
        }
    return out
