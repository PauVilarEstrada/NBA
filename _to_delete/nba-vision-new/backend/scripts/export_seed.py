"""Dump the demo dataset to JSON for the frontend's offline mode.

    python scripts/export_seed.py ../frontend/src/lib/seed.generated.json

Keeps a single source of truth for the demo league: the frontend never
hand-maintains a parallel roster.
"""
from __future__ import annotations

import json
import sys

sys.path.insert(0, ".")

from app.services import catalog  # noqa: E402
from app.services.franchise import RECENT_FINALS  # noqa: E402
from app.services.seed import CURRENT_SEASON, DEF_VS_POSITION  # noqa: E402

PLAYER_FIELDS = (
    "playerId", "name", "firstName", "lastName", "slug", "team", "teamId",
    "position", "age", "season", "min", "pts", "reb", "ast", "stl", "blk", "tov",
    "fg3m", "ts", "usg", "salary", "estimatedValue", "marketPrice", "valueIndex",
    "surplus", "leagueMax", "headshot", "teamLogo",
    "fga", "fgm", "fgPct", "fg3a", "fg3Pct", "efgPct", "fta", "ftm",
    "per", "bpm", "vorp", "ws", "gameScore",
    "shooting", "rebounding", "advanced", "per36", "percentiles",
    "bio", "honours", "rings", "stints", "experience", "isRookie",
)

out = {
    "season": CURRENT_SEASON,
    "seasonLabel": f"{CURRENT_SEASON}-{str(CURRENT_SEASON + 1)[2:]}",
    "generatedBy": "backend/scripts/export_seed.py",
    "teams": catalog.all_teams(),
    "players": [{k: p[k] for k in PLAYER_FIELDS} for p in catalog.all_players()],
    "defVsPosition": DEF_VS_POSITION,
    "recentFinals": RECENT_FINALS,
}

path = sys.argv[1] if len(sys.argv) > 1 else "seed.json"
with open(path, "w", encoding="utf-8") as fh:
    json.dump(out, fh, indent=1)
print(f"wrote {path}: {len(out['players'])} players, {len(out['teams'])} teams")
