from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PlayerSummary(BaseModel):
    playerId: int
    name: str
    team: str
    teamId: int
    position: str
    age: int
    headshot: str
    teamLogo: str
    pts: float
    reb: float
    ast: float
    marketPrice: int
    valueIndex: float


class PredictPlayerRequest(BaseModel):
    playerId: int
    opponent: str | int
    isHome: bool = True
    restDays: float = Field(2.0, ge=0, le=10)
    isPlayoffs: bool = False
    lines: dict[str, float] | None = None


class PredictTeamRequest(BaseModel):
    home: str | int
    away: str | int
    isPlayoffs: bool = False
    homeRest: float = 2.0
    awayRest: float = 2.0
    series: bool = False


class RosterPick(BaseModel):
    playerId: int
    cost: float
    position: str | None = None
    usg: float | None = None
    ts: float | None = None
    pts: float | None = None
    reb: float | None = None
    ast: float | None = None
    stl: float | None = None
    blk: float | None = None
    tov: float | None = None
    fg3m: float | None = None
    min: float | None = None
    name: str | None = None
    team: str | None = None


class SimulateRequest(BaseModel):
    budget: int = 20_000_000
    roster: list[RosterPick]
    opponent: str | int
    seed: int = 7
    isPlayoffs: bool = False
    userIsHome: bool = False
    monteCarloRuns: int = Field(0, ge=0, le=2000)


class SimulateGameRequest(BaseModel):
    """Two real teams. `excluded` is the injury report — ids sitting this one out."""
    home: str | int
    away: str | int
    excluded: list[int] = Field(default_factory=list)
    seed: int = 11
    isPlayoffs: bool = False
    monteCarloRuns: int = Field(0, ge=0, le=2000)
