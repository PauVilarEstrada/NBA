from fastapi import APIRouter, HTTPException

from app.services import catalog, synth

router = APIRouter(prefix="/h2h", tags=["head-to-head"])


@router.get("/{player_id}/{opponent}")
def player_vs_team(player_id: int, opponent: str, seasons: int = 6):
    p = catalog.get_player(player_id)
    t = catalog.get_team(opponent)
    if not p or not t:
        raise HTTPException(404, "player or team not found")

    games = synth.head_to_head(p, t["abbr"], seasons)
    home = [g for g in games if g["isHome"]]
    away = [g for g in games if not g["isHome"]]

    def agg(rows):
        if not rows:
            return {"gp": 0}
        n = len(rows)
        out = {"gp": n}
        for k in ("pts", "reb", "ast", "min"):
            vals = [r[k] for r in rows]
            out[k] = round(sum(vals) / n, 1)
            out[f"{k}Best"] = max(vals)
        return out

    return {
        "player": p, "opponent": t,
        "games": games,
        "totals": agg(games),
        "home": agg(home),
        "away": agg(away),
        "venueDelta": {
            k: round(agg(home).get(k, 0) - agg(away).get(k, 0), 1)
            for k in ("pts", "reb", "ast")
        } if home and away else {},
    }
