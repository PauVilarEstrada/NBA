"""Model registry: what is loaded, what is active, what falls back to mock.

Load-once-at-boot with a hot-reload hook, so promoting a newly trained model is
`POST /admin/reload` and never a redeploy.
"""
from __future__ import annotations

import logging
import threading
from dataclasses import dataclass, field

from app.core.config import settings
from app.ml import player_model, team_model

log = logging.getLogger(__name__)


@dataclass
class Registry:
    player: dict[tuple[str, str], object] = field(default_factory=dict)   # (target, season_type)
    team: dict[str, object] = field(default_factory=dict)                 # season_type
    _lock: threading.Lock = field(default_factory=threading.Lock)

    def load(self) -> dict:
        with self._lock:
            self.player.clear()
            self.team.clear()
            for season_type in ("regular", "playoffs"):
                for target in player_model.TARGETS:
                    b = player_model.load(target, season_type, settings.model_dir)
                    if b is not None:
                        self.player[(target, season_type)] = b
                t = team_model.load(season_type, settings.model_dir)
                if t is not None:
                    self.team[season_type] = t
        return self.status()

    def status(self) -> dict:
        return {
            "playerModels": sorted(f"{t}/{s}" for t, s in self.player),
            "teamModels": sorted(self.team),
            "mockFallback": settings.allow_mock_inference,
            "mode": "live" if (self.player or self.team) else "mock",
        }

    def has_player(self, target: str, season_type: str) -> bool:
        return (target, season_type) in self.player

    def get_player(self, target: str, season_type: str):
        return self.player.get((target, season_type))

    def get_team(self, season_type: str):
        return self.team.get(season_type)


registry = Registry()
