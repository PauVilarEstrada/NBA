from fastapi import APIRouter, HTTPException

from app.schemas.api import SimulateGameRequest
from app.services import catalog, fantasy
from app.ml.simulator import GameSimulator, monte_carlo

router = APIRouter(prefix="/simulate", tags=["simulate"])


@router.post("/game")
def game(req: SimulateGameRequest):
    """Two real teams, with anyone listed in `excluded` ruled out.

    Sitting a player is not cosmetic: `fantasy.build_real_team` redistributes his
    minutes to the players behind him and moves the team's offensive and
    defensive ratings by what he actually contributes, so the possession engine
    plays the game with the roster that is left.
    """
    home = catalog.get_team(req.home)
    away = catalog.get_team(req.away)
    if not home or not away:
        raise HTTPException(404, "unknown team")
    if home["teamId"] == away["teamId"]:
        raise HTTPException(400, "pick two different teams")

    excluded = set(req.excluded)
    try:
        home_team = fantasy.build_real_team(req.home, exclude=excluded)
        away_team = fantasy.build_real_team(req.away, exclude=excluded)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    home_team.is_home, away_team.is_home = True, False

    sim = GameSimulator(home_team, away_team, seed=req.seed, is_playoffs=req.isPlayoffs)
    result = sim.run()
    result["userSide"] = "home"
    result["seed"] = req.seed
    result["isPlayoffs"] = req.isPlayoffs
    result["excluded"] = [
        {"playerId": pid, "name": (catalog.get_player(pid) or {}).get("name")}
        for pid in excluded
    ]
    if req.monteCarloRuns:
        result["distribution"] = monte_carlo(home_team, away_team, n=req.monteCarloRuns,
                                             seed=req.seed, is_playoffs=req.isPlayoffs)
    return result
