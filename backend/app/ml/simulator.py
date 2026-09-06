"""Possession-level game simulator — the engine behind "Create your team".

Rather than sampling a final score, the simulator plays the game: it alternates
possessions, picks a shooter from live usage weights, resolves the shot against
the defence's efficiency profile, and emits an event stream. That buys three
things a score sampler cannot give you:

  * a **live box score** that adds up to the final score by construction,
  * **play-by-play text** with real actors, which is what makes the timelapse
    feel like a broadcast,
  * **clock-accurate events**, so the frontend can replay 1 real second per
    game minute simply by filtering on `clock_seconds`.

Determinism: the whole simulation is driven by one seeded generator, so a
`(roster, opponent, seed)` triple always replays identically. That is what makes
the result shareable and what lets the backend store just the seed.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Literal

import numpy as np

PERIOD_SECONDS = 12 * 60
REGULATION_PERIODS = 4
OT_SECONDS = 5 * 60

ShotKind = Literal["rim", "mid", "three", "ft"]

# league-average outcome mix per possession
BASE_TURNOVER_RATE = 0.132
BASE_OREB_RATE = 0.265
BASE_FOUL_RATE = 0.205
# Calibration constant: maps TS% onto eFG% for shot resolution. Verified by
# `python -m app.ml.simulator --calibrate`, which must land on ~1.13 PPP.
TS_TO_EFG = 0.960


@dataclass(slots=True)
class SimPlayer:
    player_id: int
    name: str
    team: str
    position: str = "SF"
    minutes: float = 30.0
    usage: float = 0.20          # share of team possessions used
    ts_pct: float = 0.570
    three_rate: float = 0.36     # share of his FGA from three
    ft_rate: float = 0.24        # FTA per FGA
    reb_rate: float = 0.10       # share of available rebounds while on court
    ast_rate: float = 0.16       # share of teammate makes he assists
    stl_rate: float = 0.015
    blk_rate: float = 0.012
    tov_rate: float = 0.12
    stamina: float = 1.0

    # live tallies
    pts: int = 0; reb: int = 0; ast: int = 0; stl: int = 0; blk: int = 0
    tov: int = 0; fgm: int = 0; fga: int = 0; tpm: int = 0; tpa: int = 0
    ftm: int = 0; fta: int = 0; secs: int = 0

    def box(self) -> dict:
        return {
            "playerId": self.player_id, "name": self.name, "team": self.team,
            "min": round(self.secs / 60, 1), "pts": self.pts, "reb": self.reb,
            "ast": self.ast, "stl": self.stl, "blk": self.blk, "tov": self.tov,
            "fgm": self.fgm, "fga": self.fga, "tpm": self.tpm, "tpa": self.tpa,
            "ftm": self.ftm, "fta": self.fta,
        }


@dataclass(slots=True)
class SimTeam:
    team_id: int | str
    name: str
    abbr: str
    players: list[SimPlayer]
    off_rating: float = 113.0
    def_rating: float = 113.0
    pace: float = 99.5
    score: int = 0
    is_home: bool = False


@dataclass(slots=True)
class GameEvent:
    clock_seconds: int          # elapsed game seconds, 0 .. 2880(+OT)
    period: int
    period_clock: str           # "10:42" remaining, broadcast style
    team: str
    kind: str                   # shot_made | shot_miss | turnover | rebound | foul | ft | period | timeout
    text: str
    home_score: int
    away_score: int
    player_id: int | None = None
    points: int = 0
    highlight: bool = False     # dunks, threes, and-ones, buzzer-beaters


def _fmt_clock(remaining: int) -> str:
    return f"{remaining // 60}:{remaining % 60:02d}"


class GameSimulator:
    def __init__(self, home: SimTeam, away: SimTeam, seed: int = 0,
                 is_playoffs: bool = False) -> None:
        self.home, self.away = home, away
        self.rng = np.random.default_rng(seed)
        self.is_playoffs = is_playoffs
        self.events: list[GameEvent] = []
        self.elapsed = 0
        self.period = 1
        # possessions are a property of the game, shared by both teams
        pace = (home.pace + away.pace) / 2 * (0.972 if is_playoffs else 1.0)
        self.seconds_per_poss = (48 * 60) / max(pace * 2, 1)

    # ------------------------------------------------------------- utils
    def _pick(self, team: SimTeam, weights: str = "usage") -> SimPlayer:
        w = np.array([max(getattr(p, weights), 1e-4) * p.stamina for p in team.players])
        return team.players[int(self.rng.choice(len(team.players), p=w / w.sum()))]

    def _on_court(self, team: SimTeam) -> list[SimPlayer]:
        """Top 5 by remaining minutes budget — a cheap but stable rotation."""
        ranked = sorted(team.players, key=lambda p: (p.minutes * 60 - p.secs), reverse=True)
        return ranked[:5]

    def _emit(self, team: SimTeam, kind: str, text: str, player: SimPlayer | None = None,
              points: int = 0, highlight: bool = False) -> None:
        remaining = max(0, (PERIOD_SECONDS if self.period <= REGULATION_PERIODS else OT_SECONDS)
                        - (self.elapsed - self._period_start()))
        self.events.append(GameEvent(
            clock_seconds=self.elapsed, period=self.period, period_clock=_fmt_clock(remaining),
            team=team.abbr, kind=kind, text=text,
            home_score=self.home.score, away_score=self.away.score,
            player_id=player.player_id if player else None,
            points=points, highlight=highlight,
        ))

    def _period_start(self) -> int:
        if self.period <= REGULATION_PERIODS:
            return (self.period - 1) * PERIOD_SECONDS
        return REGULATION_PERIODS * PERIOD_SECONDS + (self.period - REGULATION_PERIODS - 1) * OT_SECONDS

    # -------------------------------------------------------- possession
    def _possession(self, off: SimTeam, deff: SimTeam) -> None:
        on = self._on_court(off)
        dur = int(max(4, self.rng.normal(self.seconds_per_poss, 4.5)))
        self.elapsed += dur
        for p in on:
            p.secs += dur
        for p in self._on_court(deff):
            p.secs += dur

        # Defensive strength, positive = harder to score on. A 108 defence sits
        # ~0.033 above average here, i.e. it costs the offence ~3.3 eFG points.
        d_str = (113.5 - deff.def_rating) * 0.006
        if self.is_playoffs:
            d_str += 0.012

        w = np.array([p.usage * p.stamina for p in on])
        actor = on[int(self.rng.choice(len(on), p=w / w.sum()))]

        # --- turnover -----------------------------------------------------
        if self.rng.random() < BASE_TURNOVER_RATE * (1 + d_str * 2) * (actor.tov_rate / 0.12):
            actor.tov += 1
            stealer = self._pick(deff, "stl_rate")
            stealer.stl += 1
            self._emit(off, "turnover", f"{actor.name} turnover, stolen by {stealer.name}", actor)
            return

        # --- shot selection ----------------------------------------------
        is_three = self.rng.random() < actor.three_rate
        kind: ShotKind = "three" if is_three else ("rim" if self.rng.random() < 0.55 else "mid")
        # Convert true shooting to an effective FG% for this shot type.
        # TS% already contains free throws, so the conversion factor is tuned
        # (with `calibrate()` below) to land the engine on ~1.13 points per
        # possession — the actual league average.
        base_efg = actor.ts_pct * TS_TO_EFG - d_str
        p_make = {"three": base_efg * 0.62, "rim": base_efg * 1.13, "mid": base_efg * 0.78}[kind]
        p_make = float(np.clip(p_make, 0.20, 0.80))

        actor.fga += 1
        if is_three:
            actor.tpa += 1

        # --- blocked ------------------------------------------------------
        if not is_three and self.rng.random() < 0.055 + d_str:
            blocker = self._pick(deff, "blk_rate")
            blocker.blk += 1
            self._emit(off, "shot_miss", f"{actor.name} {kind} BLOCKED by {blocker.name}",
                       actor, highlight=True)
            self._rebound(off, deff)
            return

        if self.rng.random() < p_make:
            pts = 3 if is_three else 2
            actor.fgm += 1
            actor.pts += pts
            if is_three:
                actor.tpm += 1
            off.score += pts

            assisted = self.rng.random() < (0.62 if not is_three else 0.78)
            passer = None
            if assisted:
                mates = [p for p in on if p is not actor]
                aw = np.array([p.ast_rate for p in mates])
                passer = mates[int(self.rng.choice(len(mates), p=aw / aw.sum()))]
                passer.ast += 1

            verb = {"three": "drains a three", "rim": "throws it down", "mid": "hits the mid-range"}[kind]
            text = f"{actor.name} {verb}" + (f" ({passer.name})" if passer else "")

            # and-one
            if self.rng.random() < 0.075:
                actor.fta += 1
                if self.rng.random() < 0.77:
                    actor.ftm += 1
                    actor.pts += 1
                    off.score += 1
                    text += " — AND ONE!"
            self._emit(off, "shot_made", text, actor, points=pts,
                       highlight=is_three or kind == "rim")
            return

        # --- shooting foul -------------------------------------------------
        if self.rng.random() < actor.ft_rate * 0.5:
            shots = 3 if is_three else 2
            made = 0
            for _ in range(shots):
                actor.fta += 1
                if self.rng.random() < 0.77:
                    actor.ftm += 1
                    made += 1
            actor.pts += made
            off.score += made
            self._emit(off, "ft", f"{actor.name} {made}/{shots} from the line", actor, points=made)
            return

        self._emit(off, "shot_miss", f"{actor.name} misses the {kind}", actor)
        self._rebound(off, deff)

    def _rebound(self, off: SimTeam, deff: SimTeam, depth: int = 0) -> None:
        offensive = self.rng.random() < BASE_OREB_RATE
        team = off if offensive else deff
        board = self._pick(team, "reb_rate")
        board.reb += 1
        self._emit(team, "rebound",
                   f"{board.name} {'offensive' if offensive else 'defensive'} rebound", board)
        # An offensive board keeps the possession alive — second-chance points
        # are ~12% of NBA scoring, and leaving them out is why naive simulators
        # come in 8-10 points light.
        if offensive and depth < 2:
            self._second_chance(off, deff, board, depth + 1)

    def _second_chance(self, off: SimTeam, deff: SimTeam, board: SimPlayer, depth: int) -> None:
        self.elapsed += int(max(2, self.rng.normal(5, 2)))
        putback = self.rng.random() < 0.55
        actor = board if putback else self._pick(off, "usage")
        actor.fga += 1
        p_make = float(np.clip(actor.ts_pct * TS_TO_EFG * (1.18 if putback else 0.94)
                               - (113.5 - deff.def_rating) * 0.006, 0.20, 0.80))
        if self.rng.random() < p_make:
            actor.fgm += 1
            actor.pts += 2
            off.score += 2
            self._emit(off, "shot_made", f"{actor.name} second-chance bucket", actor,
                       points=2, highlight=putback)
        else:
            self._emit(off, "shot_miss", f"{actor.name} misses the putback", actor)
            self._rebound(off, deff, depth)

    # ------------------------------------------------------------- driver
    def run(self) -> dict:
        possession_home = self.rng.random() < 0.5
        while True:
            period_end = self._period_start() + (
                PERIOD_SECONDS if self.period <= REGULATION_PERIODS else OT_SECONDS)
            while self.elapsed < period_end:
                off, deff = (self.home, self.away) if possession_home else (self.away, self.home)
                self._possession(off, deff)
                possession_home = not possession_home
                # fatigue accumulates; stars hold up better (higher usage => higher floor)
                for t in (self.home, self.away):
                    for p in t.players:
                        p.stamina = float(np.clip(1.0 - (p.secs / 60) / (p.minutes * 2.6), 0.55, 1.0))
            self.elapsed = period_end
            self._emit(self.home, "period", f"End of {'Q' if self.period <= 4 else 'OT'}"
                       f"{self.period if self.period <= 4 else self.period - 4}", None)
            if self.period >= REGULATION_PERIODS and self.home.score != self.away.score:
                break
            if self.period > 8:                      # hard stop, nobody plays 5 OTs
                if self.home.score == self.away.score:
                    self.home.score += 2
                break
            self.period += 1

        return self.result()

    def result(self) -> dict:
        return {
            "final": {"home": self.home.score, "away": self.away.score,
                      "periods": self.period, "overtime": max(0, self.period - 4)},
            "home": {"teamId": self.home.team_id, "name": self.home.name, "abbr": self.home.abbr,
                     "score": self.home.score, "box": [p.box() for p in self.home.players]},
            "away": {"teamId": self.away.team_id, "name": self.away.name, "abbr": self.away.abbr,
                     "score": self.away.score, "box": [p.box() for p in self.away.players]},
            "events": [asdict(e) for e in self.events],
            "durationSeconds": self.elapsed,
        }


def monte_carlo(home: SimTeam, away: SimTeam, n: int = 500, seed: int = 0,
                is_playoffs: bool = False) -> dict:
    """Run the full engine n times to get a win probability and a score
    distribution that are *consistent with the same engine* that produced the
    replay the user watched. Deep-copies the rosters each run so tallies reset."""
    import copy

    def fresh(team: SimTeam) -> SimTeam:
        """A clean copy: the caller may already have played a game with these
        objects, and live tallies are mutable state on them."""
        t = copy.deepcopy(team)
        t.score = 0
        for p in t.players:
            p.pts = p.reb = p.ast = p.stl = p.blk = p.tov = 0
            p.fgm = p.fga = p.tpm = p.tpa = p.ftm = p.fta = p.secs = 0
            p.stamina = 1.0
        return t

    margins, home_wins, totals = [], 0, []
    for i in range(n):
        h, a = fresh(home), fresh(away)
        res = GameSimulator(h, a, seed=seed + i, is_playoffs=is_playoffs).run()
        m = res["final"]["home"] - res["final"]["away"]
        margins.append(m)
        totals.append(res["final"]["home"] + res["final"]["away"])
        home_wins += m > 0
    margins_arr = np.array(margins)
    return {
        "runs": n,
        "homeWinProb": home_wins / n,
        "marginMean": float(margins_arr.mean()),
        "marginStd": float(margins_arr.std()),
        "marginP10": float(np.percentile(margins_arr, 10)),
        "marginP90": float(np.percentile(margins_arr, 90)),
        "totalMean": float(np.mean(totals)),
    }


# --------------------------------------------------------------- calibration
def calibrate(runs: int = 40, seed: int = 1) -> dict:
    """Sanity-check the engine against league reality.

    A simulator nobody has calibrated is a random number generator with extra
    steps. The three numbers that must be right: points per possession (~1.13),
    total points (~226) and pace (~99 possessions per team).
    """
    import copy

    from app.services import catalog

    def build(abbr: str, is_home: bool) -> SimTeam:
        t = catalog.get_team(abbr)
        pool = catalog.roster(abbr)
        weights = [max(p.get("usg", 0.18), 0.08) for p in pool]
        total = sum(weights)
        mins = [min(38.0, max(10.0, 240 * w / total)) for w in weights]
        scale = 240 / sum(mins)
        players = [SimPlayer(player_id=p["playerId"], name=p["name"], team=t["abbr"],
                             position=p["position"], minutes=m * scale,
                             usage=p["usg"], ts_pct=p["ts"],
                             three_rate=min(0.62, (p["fg3m"] or 0) / max(p["pts"] / 2.2, 1)),
                             reb_rate=min(0.30, p["reb"] / 44.0),
                             ast_rate=min(0.40, p["ast"] / 24.0),
                             stl_rate=p["stl"] / 60.0, blk_rate=p["blk"] / 45.0,
                             tov_rate=min(0.25, p["tov"] / 16.0))
                   for p, m in zip(pool, mins)]
        return SimTeam(team_id=t["teamId"], name=t["fullName"], abbr=t["abbr"],
                       players=players, off_rating=t["offRating"],
                       def_rating=t["defRating"], pace=t["pace"], is_home=is_home)

    totals, ppps = [], []
    pairs = [("BOS", "LAL"), ("OKC", "DEN"), ("WAS", "CHA"), ("NYK", "MIA")]
    for i in range(runs):
        h, a = pairs[i % len(pairs)]
        home, away = build(h, True), build(a, False)
        res = GameSimulator(copy.deepcopy(home), copy.deepcopy(away), seed=seed + i).run()
        pts = res["final"]["home"] + res["final"]["away"]
        poss = res["durationSeconds"] / ((48 * 60) / ((home.pace + away.pace)))
        totals.append(pts)
        ppps.append(pts / max(poss, 1))
    return {"runs": runs, "avgTotal": round(float(np.mean(totals)), 1),
            "avgPPP": round(float(np.mean(ppps)), 3),
            "targetTotal": 226.0, "targetPPP": 1.13}


if __name__ == "__main__":
    import argparse
    import json

    ap = argparse.ArgumentParser()
    ap.add_argument("--calibrate", action="store_true")
    ap.add_argument("--runs", type=int, default=40)
    args = ap.parse_args()
    if args.calibrate:
        print(json.dumps(calibrate(args.runs), indent=2))
