from fastapi import APIRouter, HTTPException, Query

from app.schemas.api import SimulateRequest
from app.services import catalog, fantasy

router = APIRouter(prefix="/fantasy", tags=["fantasy"])


@router.get("/pool")
def pool(budget: int = Query(20_000_000, ge=1_000_000, le=1_000_000_000)):
    return {"budget": budget, "presets": fantasy.BUDGET_PRESETS,
            "rosterMin": fantasy.ROSTER_MIN, "rosterMax": fantasy.ROSTER_MAX,
            "players": fantasy.price_pool(budget)}


@router.post("/simulate")
def simulate(req: SimulateRequest):
    roster = []
    for pick in req.roster:
        base = catalog.get_player(pick.playerId)
        if not base:
            raise HTTPException(404, f"unknown player {pick.playerId}")
        roster.append({**base, "cost": pick.cost})

    check = fantasy.validate(roster, req.budget)
    if not check["valid"]:
        raise HTTPException(400, {"errors": check["errors"], "check": check})

    try:
        result = fantasy.simulate(roster, req.opponent, req.seed, req.isPlayoffs,
                                  req.userIsHome, req.monteCarloRuns)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    result["budgetCheck"] = check
    return result
