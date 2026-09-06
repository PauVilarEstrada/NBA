"""Team-vs-team prediction.

Three components, deliberately kept separable so each can be inspected:

1. **Elo with margin-of-victory** — a fast, well-calibrated prior on win
   probability that needs nothing but results. Survives roster churn badly, so
   it is a prior, not the answer.
2. **Four-factors / ratings projection** — expected possessions from pace, then
   points from the offence-vs-defence rating clash. This is what produces a
   *score*, not just a probability.
3. **Gradient-boosted correction** — XGBoost on the residual of (2), fed
   rest, travel, availability and Elo gap. It learns what the analytical model
   misses.

Playoffs are a different sport and get their own trained artefacts plus the
structural adjustments in `PLAYOFF_ADJUSTMENTS`: pace drops (fewer transition
possessions), defensive rating improves (shorter rotations, more scouting,
switch-everything coverages), star usage concentrates, and home advantage
grows. Training a single model on both and adding an `is_playoffs` flag
underfits the difference — the interaction is with almost every feature.
"""
from __future__ import annotations

import math
import os
from dataclasses import dataclass

import numpy as np
import pandas as pd

from app.ml.features import TEAM_FEATURE_ORDER

LEAGUE_AVG_RATING = 113.5
LEAGUE_AVG_PACE = 99.2
HOME_ADVANTAGE_PTS = 2.4          # measured post-2020; it used to be ~3.5

PLAYOFF_ADJUSTMENTS = dict(
    pace_multiplier=0.972,        # ~2.8% fewer possessions
    def_rating_delta=-2.1,        # both defences tighten
    home_advantage_pts=3.1,       # louder buildings, tighter whistles
    star_usage_boost=0.06,        # top-2 usage players absorb bench usage
    bench_minutes_multiplier=0.82,
    variance_multiplier=0.92,     # series are less random than a Tuesday in January
)


# ------------------------------------------------------------------- Elo
@dataclass
class EloConfig:
    k: float = 20.0
    home_edge: float = 68.0       # Elo points
    mov_scale: float = 7.5
    carry_over: float = 0.75      # season-to-season regression toward 1505


def elo_expected(rating_a: float, rating_b: float, home_edge: float = 0.0) -> float:
    return 1.0 / (1.0 + 10 ** (-((rating_a + home_edge) - rating_b) / 400.0))


def elo_update(rating_a: float, rating_b: float, margin: int, home_edge: float,
               cfg: EloConfig = EloConfig()) -> tuple[float, float]:
    """538-style MOV multiplier: blowouts move ratings more, but with
    diminishing returns and an autocorrelation correction so a good team
    beating a bad one 40-0 does not run away with the scale."""
    exp_a = elo_expected(rating_a, rating_b, home_edge)
    result = 1.0 if margin > 0 else 0.0
    elo_diff = (rating_a + home_edge) - rating_b
    mov_mult = ((abs(margin) + 3) ** 0.8) / (cfg.mov_scale + 0.006 * elo_diff * (1 if margin > 0 else -1))
    delta = cfg.k * mov_mult * (result - exp_a)
    return rating_a + delta, rating_b - delta


def season_regress(rating: float, cfg: EloConfig = EloConfig()) -> float:
    return 1505.0 + cfg.carry_over * (rating - 1505.0)


# ------------------------------------------------- analytical score model
def project_score(home: dict, away: dict, is_playoffs: bool = False) -> tuple[float, float, float]:
    """Return (home_pts, away_pts, possessions).

    Possessions are shared: both teams play (almost) the same number, so pace is
    a property of the *game*, not of one side.
    """
    adj = PLAYOFF_ADJUSTMENTS if is_playoffs else {}
    pace_mult = adj.get("pace_multiplier", 1.0)
    def_delta = adj.get("def_rating_delta", 0.0)
    home_edge = adj.get("home_advantage_pts", HOME_ADVANTAGE_PTS)

    poss = ((home["pace"] + away["pace"]) / 2) * pace_mult

    def points(off: dict, deff: dict) -> float:
        # Offence and defence are both expressed per-100; the expected rating in
        # this specific matchup is the league mean plus both deviations.
        off_dev = off["off_rating"] - LEAGUE_AVG_RATING
        def_dev = (deff["def_rating"] + def_delta) - LEAGUE_AVG_RATING
        return (LEAGUE_AVG_RATING + off_dev + def_dev) * poss / 100.0

    h = points(home, away) + home_edge / 2
    a = points(away, home) - home_edge / 2

    # rest: each extra day is worth ~0.35 pts, a back-to-back costs ~1.4
    h += 0.35 * (home.get("rest_days", 2) - 2) - 1.4 * home.get("is_b2b", 0)
    a += 0.35 * (away.get("rest_days", 2) - 2) - 1.4 * away.get("is_b2b", 0)
    return h, a, poss


def win_probability(margin_mean: float, margin_sigma: float = 11.8,
                    is_playoffs: bool = False) -> float:
    """NBA final margins are close to normal with sigma ~11.5-12."""
    sigma = margin_sigma * (PLAYOFF_ADJUSTMENTS["variance_multiplier"] if is_playoffs else 1.0)
    return float(0.5 * (1 + math.erf(margin_mean / (sigma * math.sqrt(2)))))


def series_probability(p_home_game: float, p_away_game: float,
                       format_2_2_1_1_1: bool = True) -> float:
    """Best-of-seven win probability for the higher seed, respecting the
    2-2-1-1-1 home split. Enumerates all 2^7 outcomes — exact, not simulated."""
    homes = [True, True, False, False, True, False, True] if format_2_2_1_1_1 else [True] * 7
    total = 0.0
    for mask in range(1 << 7):
        wins = losses = 0
        prob = 1.0
        for g in range(7):
            if wins == 4 or losses == 4:
                break
            won = bool(mask >> g & 1)
            p = p_home_game if homes[g] else p_away_game
            prob *= p if won else (1 - p)
            wins += won
            losses += not won
        if wins == 4:
            total += prob / (1 << (7 - (wins + losses)))
    return float(min(max(total, 0.0), 1.0))


# ---------------------------------------------------- learned correction
XGB_TEAM = dict(n_estimators=600, learning_rate=0.03, max_depth=4,
                subsample=0.85, colsample_bytree=0.8, reg_lambda=2.5,
                tree_method="hist", n_jobs=-1)


@dataclass
class TeamModelBundle:
    season_type: str
    margin_model: object
    total_model: object
    win_model: object
    feature_order: tuple[str, ...]
    metrics: dict

    def predict(self, X: pd.DataFrame) -> dict:
        X = X[list(self.feature_order)]
        margin = float(self.margin_model.predict(X)[0])
        total = float(self.total_model.predict(X)[0])
        p = float(self.win_model.predict_proba(X)[0][1])
        return {"margin": margin, "total": total, "home_win_prob": p}


def train(df: pd.DataFrame, season_type: str = "regular") -> TeamModelBundle:
    from sklearn.metrics import brier_score_loss, mean_absolute_error
    from sklearn.model_selection import GroupKFold
    from xgboost import XGBClassifier, XGBRegressor

    X = df[list(TEAM_FEATURE_ORDER)]
    groups = df["season_start"]

    cv = GroupKFold(n_splits=min(5, len(np.unique(groups))))
    maes, briers = [], []
    for tr, te in cv.split(X, df["label_margin"], groups):
        m = XGBRegressor(**XGB_TEAM).fit(X.iloc[tr], df["label_margin"].iloc[tr])
        maes.append(mean_absolute_error(df["label_margin"].iloc[te], m.predict(X.iloc[te])))
        c = XGBClassifier(**XGB_TEAM, eval_metric="logloss").fit(X.iloc[tr], df["label_win"].iloc[tr])
        briers.append(brier_score_loss(df["label_win"].iloc[te], c.predict_proba(X.iloc[te])[:, 1]))

    margin_model = XGBRegressor(**XGB_TEAM).fit(X, df["label_margin"])
    total_model = XGBRegressor(**XGB_TEAM).fit(X, df["label_total"])
    win_model = XGBClassifier(**XGB_TEAM, eval_metric="logloss").fit(X, df["label_win"])

    metrics = {
        "cv_margin_mae": float(np.mean(maes)),
        "cv_brier": float(np.mean(briers)),
        # reference points: Vegas closing spread lands ~9.1 MAE, a coin flip is 0.25 Brier
        "vegas_reference_mae": 9.1,
        "n_rows": int(len(df)),
    }
    return TeamModelBundle(season_type, margin_model, total_model, win_model,
                           TEAM_FEATURE_ORDER, metrics)


def save(bundle: TeamModelBundle, model_dir: str) -> str:
    import joblib

    os.makedirs(model_dir, exist_ok=True)
    path = os.path.join(model_dir, f"team_{bundle.season_type}.joblib")
    joblib.dump(bundle, path)
    return path


def load(season_type: str, model_dir: str) -> TeamModelBundle | None:
    import joblib

    path = os.path.join(model_dir, f"team_{season_type}.joblib")
    return joblib.load(path) if os.path.exists(path) else None
