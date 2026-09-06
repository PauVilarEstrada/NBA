from fastapi import APIRouter, HTTPException

from app.services import catalog

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams():
    return {"teams": catalog.all_teams()}


@router.get("/{key}")
def detail(key: str):
    t = catalog.get_team(key)
    if not t:
        raise HTTPException(404, "team not found")
    return {
        "team": t,
        "roster": catalog.roster(key),
        "leaders": catalog.team_leaders(key),
        "cap": catalog.cap_sheet(key),
    }


@router.get("/{key}/cap")
def cap(key: str):
    if not catalog.get_team(key):
        raise HTTPException(404, "team not found")
    return catalog.cap_sheet(key)


@router.get("/compare/{a}/{b}")
def compare(a: str, b: str):
    ta, tb = catalog.get_team(a), catalog.get_team(b)
    if not ta or not tb:
        raise HTTPException(404, "team not found")
    axes = ["offRating", "defRating", "netRating", "pace", "winPct"]
    return {
        "teams": [ta, tb],
        "rosters": [catalog.roster(a), catalog.roster(b)],
        "caps": [catalog.cap_sheet(a), catalog.cap_sheet(b)],
        "axes": [{"axis": k, "a": ta[k], "b": tb[k],
                  "betterIsLow": k == "defRating"} for k in axes],
    }
