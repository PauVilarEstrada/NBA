from fastapi import APIRouter, HTTPException, Query

from app.services import catalog, synth

router = APIRouter(prefix="/players", tags=["players"])


@router.get("")
def search(q: str = "", limit: int = Query(20, le=100)):
    return {"results": catalog.search_players(q, limit)}


@router.get("/rookies")
def rookie_class():
    """Declared before /{player_id} on purpose — FastAPI matches in order, and
    otherwise "rookies" would be parsed as a player id."""
    return {"players": catalog.rookies()}


@router.get("/{player_id}")
def detail(player_id: int, seasons: int = 8):
    p = catalog.get_player(player_id)
    if not p:
        raise HTTPException(404, "player not found")
    team = catalog.get_team(p["teamId"])
    logs = synth.player_game_logs(p)
    return {
        "player": p,
        "team": team,
        "career": synth.career_seasons(p, seasons),
        "gameLogs": logs,
        "splits": _splits(logs),
        "monthly": _monthly(logs),
        "radar": _radar(p),
    }


@router.get("/{player_id}/logs")
def logs(player_id: int, limit: int = 82):
    p = catalog.get_player(player_id)
    if not p:
        raise HTTPException(404, "player not found")
    return {"logs": synth.player_game_logs(p)[-limit:]}


def _splits(logs: list[dict]) -> dict:
    def agg(rows: list[dict]) -> dict:
        if not rows:
            return {}
        n = len(rows)
        return {"gp": n, **{k: round(sum(r[k] for r in rows) / n, 1)
                            for k in ("pts", "reb", "ast", "min", "fg3m")}}
    return {
        "home": agg([r for r in logs if r["isHome"]]),
        "away": agg([r for r in logs if not r["isHome"]]),
        "rested": agg([r for r in logs if r["restDays"] >= 2]),
        "backToBack": agg([r for r in logs if r["restDays"] <= 0]),
    }


def _monthly(logs: list[dict]) -> list[dict]:
    """Month-by-month form. A season average hides a player who started cold and
    has been the best version of himself since January."""
    from collections import defaultdict
    from datetime import date

    buckets: dict[str, list[dict]] = defaultdict(list)
    for row in logs:
        buckets[row["date"][:7]].append(row)

    out = []
    for month in sorted(buckets):
        rows = buckets[month]
        n = len(rows)
        y, m = month.split("-")
        out.append({
            "month": month,
            "label": date(int(y), int(m), 1).strftime("%b %y"),
            "gp": n,
            **{k: round(sum(r[k] for r in rows) / n, 1)
               for k in ("pts", "reb", "ast", "min")},
            "ts": round(sum(r["ts"] for r in rows) / n, 3),
        })
    return out


def _radar(p: dict) -> list[dict]:
    """Six skill axes, each scaled 0-100 against a league reference so the shape
    is comparable across players (a raw-stat radar is meaningless)."""
    refs = {"Scoring": 30.0, "Playmaking": 11.0, "Rebounding": 13.0,
            "Defence": 3.6, "Efficiency": 0.65, "Volume": 38.0}
    vals = {
        "Scoring": p["pts"], "Playmaking": p["ast"], "Rebounding": p["reb"],
        "Defence": p["stl"] * 1.6 + p["blk"] * 1.9, "Efficiency": p["ts"],
        "Volume": p["min"],
    }
    return [{"axis": k, "value": round(min(100, 100 * vals[k] / refs[k]), 1),
             "raw": round(vals[k], 2)} for k in refs]
