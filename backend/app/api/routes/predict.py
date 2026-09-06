from fastapi import APIRouter, HTTPException

from app.ml.registry import registry
from app.schemas.api import PredictPlayerRequest, PredictTeamRequest
from app.services import predictions

router = APIRouter(prefix="/predict", tags=["predict"])


@router.post("/player")
def player(req: PredictPlayerRequest):
    try:
        return predictions.predict_player_vs_team(
            req.playerId, req.opponent, req.isHome, req.restDays,
            req.isPlayoffs, req.lines)
    except LookupError as exc:
        raise HTTPException(404, str(exc))


@router.post("/team")
def team(req: PredictTeamRequest):
    try:
        return predictions.predict_team_vs_team(
            req.home, req.away, req.isPlayoffs, req.homeRest, req.awayRest, req.series)
    except LookupError as exc:
        raise HTTPException(404, str(exc))


@router.get("/status")
def status():
    return registry.status()
