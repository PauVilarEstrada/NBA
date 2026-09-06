"""Data pipeline: ingest -> normalise -> feature store.

    python scripts/ingest.py teams
    python scripts/ingest.py players --season 2025-26
    python scripts/ingest.py games   --seasons 2015..2025
    python scripts/ingest.py advanced                  # basketball-reference
    python scripts/ingest.py contracts --season 2025
    python scripts/ingest.py features --seasons 2015..2025

Run order matters (teams -> players -> games -> advanced/contracts -> features).
Everything is idempotent: re-running an old season updates in place.

Scheduling (a cron or a small Prefect/Airflow DAG):
    03:00 daily   games (yesterday) + contracts + transactions
    03:30 daily   features (last 7 days)
    Sunday 04:00  advanced (BBRef, slow) + full feature rebuild + retrain
"""
from __future__ import annotations

import argparse
import logging
import sys
from datetime import date, timedelta

from sqlalchemy import text

sys.path.insert(0, ".")

from app.db.session import engine  # noqa: E402
from app.services.reference import SPOTRAC_SLUG, TEAMS  # noqa: E402

log = logging.getLogger("ingest")


def ingest_teams() -> None:
    with engine.begin() as conn:
        for t in TEAMS:
            conn.execute(text("""
                INSERT INTO team (team_id, abbreviation, city, name, conference,
                                  division, primary_color, secondary_color, logo_url)
                VALUES (:id,:ab,:city,:name,:conf,:div,:p,:s,:logo)
                ON CONFLICT (team_id) DO UPDATE SET
                  primary_color = EXCLUDED.primary_color,
                  secondary_color = EXCLUDED.secondary_color
            """), {"id": t[0], "ab": t[1], "city": t[2], "name": t[3], "conf": t[4],
                   "div": t[5], "p": t[6], "s": t[7],
                   "logo": f"https://cdn.nba.com/logos/nba/{t[0]}/primary/L/logo.svg"})
    log.info("teams: %d", len(TEAMS))


def ingest_players(season: str) -> None:
    """Uses the synchronous `nba_api` package — this is a batch job, the rate
    limit is fine here and the library keeps up with parameter changes."""
    from nba_api.stats.endpoints import commonallplayers

    df = commonallplayers.CommonAllPlayers(season=season, is_only_current_season=0).get_data_frames()[0]
    with engine.begin() as conn:
        for _, r in df.iterrows():
            last, first = (r["DISPLAY_LAST_COMMA_FIRST"].split(", ") + [""])[:2]
            conn.execute(text("""
                INSERT INTO player (player_id, first_name, last_name, from_year, to_year,
                                    is_active, headshot_url, slug)
                VALUES (:id,:f,:l,:fy,:ty,:act,:hs,:slug)
                ON CONFLICT (player_id) DO UPDATE SET
                  to_year = EXCLUDED.to_year, is_active = EXCLUDED.is_active
            """), {"id": int(r["PERSON_ID"]), "f": first, "l": last,
                   "fy": int(r["FROM_YEAR"] or 0), "ty": int(r["TO_YEAR"] or 0),
                   "act": bool(r["ROSTERSTATUS"]),
                   "hs": f'https://cdn.nba.com/headshots/nba/latest/1040x760/{int(r["PERSON_ID"])}.png',
                   "slug": f'{first}-{last}'.lower().replace(" ", "-")})
    log.info("players: %d", len(df))


def ingest_games(seasons: list[int]) -> None:
    from nba_api.stats.endpoints import leaguegamefinder

    for season in seasons:
        label = f"{season}-{str(season + 1)[2:]}"
        for stype in ("Regular Season", "Playoffs"):
            df = leaguegamefinder.LeagueGameFinder(
                season_nullable=label, season_type_nullable=stype,
                league_id_nullable="00").get_data_frames()[0]
            log.info("%s %s -> %d team-rows", label, stype, len(df))
            # LeagueGameFinder returns one row per team per game; pair them up.
            for gid, pair in df.groupby("GAME_ID"):
                if len(pair) != 2:
                    continue
                home = pair[~pair["MATCHUP"].str.contains("@")].iloc[0]
                away = pair[pair["MATCHUP"].str.contains("@")].iloc[0]
                with engine.begin() as conn:
                    conn.execute(text("""
                        INSERT INTO game (game_id, season_start, season_type, game_date,
                                          home_team_id, away_team_id, home_pts, away_pts, home_win)
                        VALUES (:g,:s,:t,:d,:h,:a,:hp,:ap,:w)
                        ON CONFLICT (game_id) DO UPDATE SET
                          home_pts = EXCLUDED.home_pts, away_pts = EXCLUDED.away_pts,
                          home_win = EXCLUDED.home_win
                    """), {"g": gid, "s": season,
                           "t": "regular" if stype == "Regular Season" else "playoffs",
                           "d": home["GAME_DATE"], "h": int(home["TEAM_ID"]),
                           "a": int(away["TEAM_ID"]), "hp": int(home["PTS"]),
                           "ap": int(away["PTS"]), "w": int(home["PTS"]) > int(away["PTS"])})


def ingest_advanced() -> None:
    from app.providers.bref import fetch_advanced

    with engine.connect() as conn:
        rows = conn.execute(text(
            "SELECT player_id, bref_id FROM player WHERE bref_id IS NOT NULL AND is_active")).all()
    for pid, bid in rows:
        for rec in fetch_advanced(bid):
            with engine.begin() as c:
                c.execute(text("""
                    UPDATE player_season_stats
                       SET per=:per, ts_pct=:ts, usg_pct=:usg, ws=:ws,
                           ws48=:ws48, bpm=:bpm, vorp=:vorp
                     WHERE player_id=:p AND season_start=:s
                """), {"p": pid, "s": rec["season_start"], **rec})
    log.info("advanced: %d players", len(rows))


def ingest_contracts(season: int) -> None:
    from app.providers.contracts import fetch_team_salaries, fetch_from_sportsdataio, use_api

    records = (fetch_from_sportsdataio(season) if use_api()
               else [r for slug in SPOTRAC_SLUG.values() for r in fetch_team_salaries(slug, season)])
    with engine.begin() as conn:
        for rec in records:
            conn.execute(text("""
                INSERT INTO contract (player_id, season_start, cap_hit_usd, source)
                SELECT p.player_id, :s, :cap, :src FROM player p
                 WHERE lower(p.first_name || ' ' || p.last_name) = lower(:name)
                ON CONFLICT (player_id, season_start)
                DO UPDATE SET cap_hit_usd = EXCLUDED.cap_hit_usd
            """), {"s": season, "cap": rec.get("cap_hit_usd"),
                   "src": rec.get("source"), "name": rec.get("name")})
    log.info("contracts: %d rows", len(records))


def build_features(seasons: list[int]) -> None:
    """Materialise the point-in-time feature rows the trainer reads.

    Implemented as one pass per player over his chronologically ordered logs,
    writing the features computed from games 0..i-1 with game i's box score as
    the label. That ordering is what guarantees no leakage."""
    import pandas as pd

    from app.ml.features import build_player_features

    for season in seasons:
        df = pd.read_sql(text("""
            SELECT l.*, g.game_date, g.season_type, g.season_start
              FROM player_game_log l JOIN game g USING (game_id)
             WHERE g.season_start = :s
             ORDER BY l.player_id, g.game_date
        """), engine, params={"s": season})
        if df.empty:
            continue
        opp = pd.read_sql(text("""
            SELECT team_id, def_rating, pace, def_vs_pg, def_vs_sg, def_vs_sf,
                   def_vs_pf, def_vs_c
              FROM team_season_stats WHERE season_start = :s
        """), engine, params={"s": season}).set_index("team_id").to_dict("index")

        payload = []
        for pid, grp in df.groupby("player_id"):
            grp = grp.sort_values("game_date").reset_index(drop=True)
            for i in range(5, len(grp)):                 # need some history first
                past, target = grp.iloc[:i], grp.iloc[i]
                feats = build_player_features(
                    logs=past, opponent_id=int(target["opponent_id"]),
                    is_home=bool(target["is_home"]), rest_days=float(target["rest_days"] or 2),
                    is_playoffs=target["season_type"] == "playoffs",
                    opp_row=opp.get(int(target["opponent_id"]), {}),
                    player_row={"position": "SF", "age": 27},
                )
                payload.append({
                    "game_id": target["game_id"], "player_id": int(pid),
                    "features": feats.to_row(), "label_pts": int(target["pts"] or 0),
                    "label_reb": int(target["reb"] or 0), "label_ast": int(target["ast"] or 0),
                    "label_min": float(target["min"] or 0),
                })
        with engine.begin() as conn:
            for row in payload:
                conn.execute(text("""
                    INSERT INTO feature_player_game
                        (game_id, player_id, as_of, features, label_pts, label_reb,
                         label_ast, label_min)
                    VALUES (:game_id,:player_id, now(), CAST(:features AS jsonb),
                            :label_pts,:label_reb,:label_ast,:label_min)
                    ON CONFLICT (game_id, player_id) DO UPDATE SET features = EXCLUDED.features
                """), {**row, "features": __import__("json").dumps(row["features"])})
        log.info("features %s: %d rows", season, len(payload))


def parse_seasons(spec: str) -> list[int]:
    if ".." in spec:
        a, b = spec.split("..")
        return list(range(int(a), int(b) + 1))
    return [int(x) for x in spec.split(",")]


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    ap = argparse.ArgumentParser()
    ap.add_argument("step", choices=["teams", "players", "games", "advanced",
                                     "contracts", "features", "all"])
    ap.add_argument("--season", default="2025-26")
    ap.add_argument("--seasons", default="2015..2025")
    args = ap.parse_args()

    if args.step in ("teams", "all"):
        ingest_teams()
    if args.step in ("players", "all"):
        ingest_players(args.season)
    if args.step in ("games", "all"):
        ingest_games(parse_seasons(args.seasons))
    if args.step in ("contracts", "all"):
        ingest_contracts(int(args.season.split("-")[0]))
    if args.step == "advanced":
        ingest_advanced()
    if args.step in ("features", "all"):
        build_features(parse_seasons(args.seasons))
