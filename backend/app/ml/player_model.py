"""Player-vs-team projection.

Architecture
------------
For each target (pts / reb / ast / min / fg3m) we train:
  * one **mean** model      — XGBoost `reg:squarederror`
  * seven **quantile** models — XGBoost `reg:quantileerror` at QUANTILES

Quantile regression rather than "mean ± k·sigma" because the spread is
conditional: a bench guard on a minutes leash and a 38-minute star with foul
trouble risk have very different shapes, and only the quantile heads learn that.

Training is *grouped by season* for cross-validation (`GroupKFold`) so a game
from the same week never lands in both folds — the standard way time-series
leakage sneaks back in.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Sequence

import numpy as np
import pandas as pd

from app.ml.distributions import QUANTILES, Projection
from app.ml.features import FEATURE_ORDER

TARGETS = ("pts", "reb", "ast", "min", "fg3m")

XGB_BASE = dict(
    n_estimators=700,
    learning_rate=0.035,
    max_depth=5,
    min_child_weight=8,
    subsample=0.85,
    colsample_bytree=0.75,
    reg_lambda=2.0,
    reg_alpha=0.4,
    tree_method="hist",
    n_jobs=-1,
)


@dataclass
class PlayerModelBundle:
    """One bundle per (target, season_type). Serialised with joblib."""
    target: str
    season_type: str
    mean_model: object
    quantile_models: dict[float, object]
    feature_order: tuple[str, ...]
    metrics: dict

    def predict(self, X: pd.DataFrame) -> Projection:
        X = X[list(self.feature_order)]
        mean = float(self.mean_model.predict(X)[0])
        q = {lvl: float(m.predict(X)[0]) for lvl, m in self.quantile_models.items()}
        return Projection(mean=mean, q=q, floor=0.0)


def _make(objective: str, alpha: float | None = None):
    from xgboost import XGBRegressor

    kw = dict(XGB_BASE)
    kw["objective"] = objective
    if alpha is not None:
        kw["quantile_alpha"] = alpha
    return XGBRegressor(**kw)


def train_target(df: pd.DataFrame, target: str, season_type: str = "regular",
                 groups: Sequence | None = None) -> PlayerModelBundle:
    """`df` = feature columns + one label column per target."""
    from sklearn.metrics import mean_absolute_error
    from sklearn.model_selection import GroupKFold

    X = df[list(FEATURE_ORDER)]
    y = df[f"label_{target}"]
    groups = groups if groups is not None else df["season_start"]

    # --- honest CV score ------------------------------------------------
    cv = GroupKFold(n_splits=min(5, len(np.unique(groups))))
    maes, baselines = [], []
    for tr, te in cv.split(X, y, groups):
        m = _make("reg:squarederror")
        m.fit(X.iloc[tr], y.iloc[tr])
        pred = m.predict(X.iloc[te])
        maes.append(mean_absolute_error(y.iloc[te], pred))
        # the bar every sports model must clear: "his last-10 average"
        baselines.append(mean_absolute_error(y.iloc[te], X.iloc[te][f"{target}_r10"]
                                             if f"{target}_r10" in X else np.full(len(te), y.mean())))

    mean_model = _make("reg:squarederror").fit(X, y)
    qmodels = {lvl: _make("reg:quantileerror", alpha=lvl).fit(X, y) for lvl in QUANTILES}

    metrics = {
        "cv_mae": float(np.mean(maes)),
        "baseline_mae_last10": float(np.mean(baselines)),
        "skill_vs_baseline": float(1 - np.mean(maes) / max(np.mean(baselines), 1e-6)),
        "n_rows": int(len(df)),
    }
    return PlayerModelBundle(target, season_type, mean_model, qmodels,
                             FEATURE_ORDER, metrics)


def save(bundle: PlayerModelBundle, model_dir: str) -> str:
    import joblib

    os.makedirs(model_dir, exist_ok=True)
    path = os.path.join(model_dir, f"player_{bundle.target}_{bundle.season_type}.joblib")
    joblib.dump(bundle, path)
    with open(path.replace(".joblib", ".metrics.json"), "w") as fh:
        json.dump(bundle.metrics, fh, indent=2)
    return path


def load(target: str, season_type: str, model_dir: str) -> PlayerModelBundle | None:
    import joblib

    path = os.path.join(model_dir, f"player_{target}_{season_type}.joblib")
    if not os.path.exists(path):
        return None
    return joblib.load(path)
