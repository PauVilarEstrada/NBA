"""Feature engineering.

The one rule that matters: **every feature must be computable strictly before
tip-off**. Rolling windows are shifted by one game, opponent ratings are the
ratings as of the day before, and injuries are the pre-game report. Anything
else leaks the label and produces a model that looks brilliant offline and is
worthless live.
"""
from __future__ import annotations

from dataclasses import dataclass, asdict, field
from typing import Iterable, Sequence

import numpy as np
import pandas as pd

ROLLING_WINDOWS = (3, 5, 10, 25)
BOX_COLS = ("pts", "reb", "ast", "stl", "blk", "tov", "fg3m", "min", "ts_pct", "usg_pct")

POSITION_SLOT = {"PG": "pg", "SG": "sg", "SF": "sf", "PF": "pf", "C": "c",
                 "G": "sg", "F": "sf", "G-F": "sg", "F-G": "sf", "F-C": "pf", "C-F": "c"}


@dataclass(slots=True)
class PlayerGameFeatures:
    """The exact vector the player model consumes, at train and at inference."""
    # form
    pts_r3: float = 0.0;  pts_r5: float = 0.0;  pts_r10: float = 0.0; pts_r25: float = 0.0
    reb_r5: float = 0.0;  reb_r10: float = 0.0
    ast_r5: float = 0.0;  ast_r10: float = 0.0
    min_r5: float = 0.0;  min_r10: float = 0.0
    ts_r10: float = 0.0;  usg_r10: float = 0.0
    fg3m_r10: float = 0.0
    # volatility — drives the width of the interval, not the mean
    pts_std10: float = 0.0
    min_std10: float = 0.0
    # season baseline
    pts_season: float = 0.0; reb_season: float = 0.0; ast_season: float = 0.0
    min_season: float = 0.0; usg_season: float = 0.0
    games_played: int = 0
    # context
    is_home: int = 0
    rest_days: float = 2.0
    is_b2b: int = 0
    is_playoffs: int = 0
    days_into_season: int = 0
    age: float = 27.0
    # opponent
    opp_def_rating: float = 113.0
    opp_pace: float = 99.5
    opp_def_vs_pos: float = 0.0        # +ve = concedes more than average to this position
    opp_opp_fg3_pct: float = 0.36
    # historical head-to-head with this opponent (career, shifted)
    h2h_pts_mean: float = 0.0
    h2h_games: int = 0
    h2h_home_delta: float = 0.0        # career home minus away split vs this opponent
    # team context
    teammate_usage_out: float = 0.0    # usage% of listed-out teammates, redistributed
    team_off_rating: float = 113.0

    def to_row(self) -> dict[str, float]:
        return {k: float(v) for k, v in asdict(self).items()}


FEATURE_ORDER: tuple[str, ...] = tuple(PlayerGameFeatures().to_row().keys())


def rolling_frame(logs: pd.DataFrame) -> pd.DataFrame:
    """logs: one row per game, ascending by date, for a single player.
    Returns the same index with shifted rolling aggregates attached."""
    df = logs.sort_values("game_date").copy()
    for col in BOX_COLS:
        if col not in df:
            df[col] = np.nan
        shifted = df[col].shift(1)                       # <- no leakage
        for w in ROLLING_WINDOWS:
            df[f"{col}_r{w}"] = shifted.rolling(w, min_periods=1).mean()
        df[f"{col}_std10"] = shifted.rolling(10, min_periods=3).std()
    df["games_played"] = np.arange(len(df))
    df["rest_days"] = df["game_date"].diff().dt.days.fillna(3).clip(0, 10)
    df["is_b2b"] = (df["rest_days"] <= 1).astype(int)
    return df


def build_player_features(
    logs: pd.DataFrame,
    opponent_id: int,
    is_home: bool,
    rest_days: float,
    is_playoffs: bool,
    opp_row: dict,
    player_row: dict,
    teammate_usage_out: float = 0.0,
) -> PlayerGameFeatures:
    """Inference-time builder: `logs` is everything played *before* the game."""
    df = rolling_frame(logs)
    if df.empty:
        return PlayerGameFeatures(is_home=int(is_home), rest_days=rest_days,
                                  is_playoffs=int(is_playoffs))
    last = df.iloc[-1]
    g = lambda k, d=0.0: float(last[k]) if k in last and pd.notna(last[k]) else d

    h2h = logs[logs["opponent_id"] == opponent_id]
    h2h_home = h2h[h2h["is_home"]]["pts"].mean() if not h2h.empty else np.nan
    h2h_away = h2h[~h2h["is_home"]]["pts"].mean() if not h2h.empty else np.nan

    pos = POSITION_SLOT.get((player_row.get("position") or "SF").upper(), "sf")

    return PlayerGameFeatures(
        pts_r3=g("pts_r3"), pts_r5=g("pts_r5"), pts_r10=g("pts_r10"), pts_r25=g("pts_r25"),
        reb_r5=g("reb_r5"), reb_r10=g("reb_r10"),
        ast_r5=g("ast_r5"), ast_r10=g("ast_r10"),
        min_r5=g("min_r5", 28.0), min_r10=g("min_r10", 28.0),
        ts_r10=g("ts_pct_r10", 0.56), usg_r10=g("usg_pct_r10", 0.20),
        fg3m_r10=g("fg3m_r10"),
        pts_std10=g("pts_std10", 6.0), min_std10=g("min_std10", 4.0),
        pts_season=float(logs["pts"].mean()), reb_season=float(logs["reb"].mean()),
        ast_season=float(logs["ast"].mean()), min_season=float(logs["min"].mean()),
        usg_season=float(logs.get("usg_pct", pd.Series([0.2])).mean()),
        games_played=int(len(logs)),
        is_home=int(is_home), rest_days=float(rest_days), is_b2b=int(rest_days <= 1),
        is_playoffs=int(is_playoffs),
        days_into_season=int(g("days_into_season", 60)),
        age=float(player_row.get("age", 27.0)),
        opp_def_rating=float(opp_row.get("def_rating", 113.0)),
        opp_pace=float(opp_row.get("pace", 99.5)),
        opp_def_vs_pos=float(opp_row.get(f"def_vs_{pos}", 0.0)),
        opp_opp_fg3_pct=float(opp_row.get("opp_fg3_pct", 0.36)),
        h2h_pts_mean=float(h2h["pts"].mean()) if not h2h.empty else float(logs["pts"].mean()),
        h2h_games=int(len(h2h)),
        h2h_home_delta=float((h2h_home - h2h_away)) if pd.notna(h2h_home) and pd.notna(h2h_away) else 0.0,
        teammate_usage_out=float(teammate_usage_out),
        team_off_rating=float(player_row.get("team_off_rating", 113.0)),
    )


def to_matrix(feats: Iterable[PlayerGameFeatures]) -> pd.DataFrame:
    return pd.DataFrame([f.to_row() for f in feats], columns=list(FEATURE_ORDER))


# ------------------------------------------------------------------ teams
@dataclass(slots=True)
class TeamGameFeatures:
    off_rating: float = 113.0
    def_rating: float = 113.0
    net_rating: float = 0.0
    pace: float = 99.5
    off_rating_r10: float = 113.0
    def_rating_r10: float = 113.0
    win_pct_r10: float = 0.5
    elo: float = 1500.0
    rest_days: float = 2.0
    is_b2b: int = 0
    is_home: int = 0
    travel_km: float = 0.0
    opp_off_rating: float = 113.0
    opp_def_rating: float = 113.0
    opp_pace: float = 99.5
    opp_elo: float = 1500.0
    opp_rest_days: float = 2.0
    is_playoffs: int = 0
    series_game_no: int = 0
    starters_available: float = 5.0
    opp_starters_available: float = 5.0

    def to_row(self) -> dict[str, float]:
        return {k: float(v) for k, v in asdict(self).items()}


TEAM_FEATURE_ORDER: tuple[str, ...] = tuple(TeamGameFeatures().to_row().keys())
