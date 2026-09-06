"""Offline training entrypoint.

    python -m app.ml.train --what player --season-type regular --from 2015

Reads the feature store (`feature_player_game` / `feature_team_game`), trains,
writes artefacts to NBA_MODEL_DIR and registers the version row. Promotion is
manual and gated on the CV metrics beating the incumbent — a model that does not
beat "his last 10 games" is not a model, it is a slower average.
"""
from __future__ import annotations

import argparse
import json
import logging
from datetime import datetime, timezone

import pandas as pd
from sqlalchemy import text

from app.core.config import settings
from app.db.session import SessionLocal, engine
from app.ml import player_model, team_model
from app.ml.features import FEATURE_ORDER, TEAM_FEATURE_ORDER

log = logging.getLogger("train")


def load_player_frame(season_from: int, season_type: str) -> pd.DataFrame:
    sql = text("""
        SELECT f.features, f.label_pts, f.label_reb, f.label_ast, f.label_min,
               g.season_start
        FROM feature_player_game f
        JOIN game g USING (game_id)
        WHERE g.season_start >= :s AND g.season_type = :t
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"s": season_from, "t": season_type}).mappings().all()
    if not rows:
        raise SystemExit("feature store is empty — run scripts/ingest.py first")
    feats = pd.DataFrame([r["features"] for r in rows]).reindex(columns=list(FEATURE_ORDER)).fillna(0)
    labels = pd.DataFrame([{k: r[k] for k in
                            ("label_pts", "label_reb", "label_ast", "label_min")} for r in rows])
    labels["label_fg3m"] = 0
    meta = pd.DataFrame([{"season_start": r["season_start"]} for r in rows])
    return pd.concat([feats, labels, meta], axis=1)


def load_team_frame(season_from: int, season_type: str) -> pd.DataFrame:
    sql = text("""
        SELECT f.features, f.label_pts, f.label_win, g.season_start,
               g.home_pts, g.away_pts
        FROM feature_team_game f
        JOIN game g USING (game_id)
        WHERE g.season_start >= :s AND g.season_type = :t AND f.team_id = g.home_team_id
    """)
    with engine.connect() as conn:
        rows = conn.execute(sql, {"s": season_from, "t": season_type}).mappings().all()
    feats = pd.DataFrame([r["features"] for r in rows]).reindex(columns=list(TEAM_FEATURE_ORDER)).fillna(0)
    extra = pd.DataFrame([{
        "label_margin": r["home_pts"] - r["away_pts"],
        "label_total": r["home_pts"] + r["away_pts"],
        "label_win": int(bool(r["label_win"])),
        "season_start": r["season_start"],
    } for r in rows])
    return pd.concat([feats, extra], axis=1)


def register(name: str, kind: str, season_type: str, uri: str, metrics: dict,
             features: list[str]) -> None:
    with SessionLocal() as db:
        db.execute(text("""
            INSERT INTO model_version (name, kind, season_type, version, artifact_uri,
                                       trained_at, train_rows, metrics, feature_list, is_active)
            VALUES (:n,:k,:st,:v,:u,:ts,:rows,:m,:f, FALSE)
            ON CONFLICT (name, season_type, version) DO UPDATE
              SET metrics = EXCLUDED.metrics, artifact_uri = EXCLUDED.artifact_uri
        """), {"n": name, "k": kind, "st": season_type,
               "v": datetime.now(timezone.utc).strftime("%Y%m%d%H%M"),
               "u": uri, "ts": datetime.now(timezone.utc),
               "rows": metrics.get("n_rows"), "m": json.dumps(metrics),
               "f": json.dumps(features)})
        db.commit()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--what", choices=["player", "team", "all"], default="all")
    ap.add_argument("--season-type", choices=["regular", "playoffs", "both"], default="both")
    ap.add_argument("--from", dest="season_from", type=int, default=2015)
    args = ap.parse_args()
    logging.basicConfig(level=logging.INFO)

    season_types = ["regular", "playoffs"] if args.season_type == "both" else [args.season_type]
    for st in season_types:
        if args.what in ("player", "all"):
            df = load_player_frame(args.season_from, st)
            for target in ("pts", "reb", "ast", "min"):
                bundle = player_model.train_target(df, target, st)
                uri = player_model.save(bundle, settings.model_dir)
                register(f"player_{target}", "xgboost", st, uri, bundle.metrics,
                         list(FEATURE_ORDER))
                log.info("player/%s/%s  MAE %.3f  (baseline %.3f, skill %+.1f%%)",
                         target, st, bundle.metrics["cv_mae"],
                         bundle.metrics["baseline_mae_last10"],
                         100 * bundle.metrics["skill_vs_baseline"])
        if args.what in ("team", "all"):
            df = load_team_frame(args.season_from, st)
            bundle = team_model.train(df, st)
            uri = team_model.save(bundle, settings.model_dir)
            register("team_margin", "xgboost", st, uri, bundle.metrics, list(TEAM_FEATURE_ORDER))
            log.info("team/%s  margin MAE %.2f  Brier %.4f",
                     st, bundle.metrics["cv_margin_mae"], bundle.metrics["cv_brier"])


if __name__ == "__main__":
    main()
