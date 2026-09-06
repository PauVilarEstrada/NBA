"""Static NBA reference data: canonical team ids, colours and CDN assets.

Team ids are the NBA's own (1610612747 = Lakers) — the same ids stats.nba.com,
cdn.nba.com and every other endpoint use, so nothing here needs mapping.
"""
from __future__ import annotations

TEAMS: list[dict] = [
    # id, abbr, city, name, conf, division, primary, secondary
    (1610612737, "ATL", "Atlanta", "Hawks", "East", "Southeast", "#E03A3E", "#C1D32F"),
    (1610612738, "BOS", "Boston", "Celtics", "East", "Atlantic", "#007A33", "#BA9653"),
    (1610612751, "BKN", "Brooklyn", "Nets", "East", "Atlantic", "#000000", "#FFFFFF"),
    (1610612766, "CHA", "Charlotte", "Hornets", "East", "Southeast", "#1D1160", "#00788C"),
    (1610612741, "CHI", "Chicago", "Bulls", "East", "Central", "#CE1141", "#000000"),
    (1610612739, "CLE", "Cleveland", "Cavaliers", "East", "Central", "#860038", "#FDBB30"),
    (1610612742, "DAL", "Dallas", "Mavericks", "West", "Southwest", "#00538C", "#B8C4CA"),
    (1610612743, "DEN", "Denver", "Nuggets", "West", "Northwest", "#0E2240", "#FEC524"),
    (1610612765, "DET", "Detroit", "Pistons", "East", "Central", "#C8102E", "#1D42BA"),
    (1610612744, "GSW", "Golden State", "Warriors", "West", "Pacific", "#1D428A", "#FFC72C"),
    (1610612745, "HOU", "Houston", "Rockets", "West", "Southwest", "#CE1141", "#000000"),
    (1610612754, "IND", "Indiana", "Pacers", "East", "Central", "#002D62", "#FDBB30"),
    (1610612746, "LAC", "LA", "Clippers", "West", "Pacific", "#C8102E", "#1D428A"),
    (1610612747, "LAL", "Los Angeles", "Lakers", "West", "Pacific", "#552583", "#FDB927"),
    (1610612763, "MEM", "Memphis", "Grizzlies", "West", "Southwest", "#5D76A9", "#12173F"),
    (1610612748, "MIA", "Miami", "Heat", "East", "Southeast", "#98002E", "#F9A01B"),
    (1610612749, "MIL", "Milwaukee", "Bucks", "East", "Central", "#00471B", "#EEE1C6"),
    (1610612750, "MIN", "Minnesota", "Timberwolves", "West", "Northwest", "#0C2340", "#236192"),
    (1610612740, "NOP", "New Orleans", "Pelicans", "West", "Southwest", "#0C2340", "#C8102E"),
    (1610612752, "NYK", "New York", "Knicks", "East", "Atlantic", "#006BB6", "#F58426"),
    (1610612760, "OKC", "Oklahoma City", "Thunder", "West", "Northwest", "#007AC1", "#EF3B24"),
    (1610612753, "ORL", "Orlando", "Magic", "East", "Southeast", "#0077C0", "#C4CED4"),
    (1610612755, "PHI", "Philadelphia", "76ers", "East", "Atlantic", "#006BB6", "#ED174C"),
    (1610612756, "PHX", "Phoenix", "Suns", "West", "Pacific", "#1D1160", "#E56020"),
    (1610612757, "POR", "Portland", "Trail Blazers", "West", "Northwest", "#E03A3E", "#000000"),
    (1610612758, "SAC", "Sacramento", "Kings", "West", "Pacific", "#5A2D81", "#63727A"),
    (1610612759, "SAS", "San Antonio", "Spurs", "West", "Southwest", "#C4CED4", "#000000"),
    (1610612761, "TOR", "Toronto", "Raptors", "East", "Atlantic", "#CE1141", "#000000"),
    (1610612762, "UTA", "Utah", "Jazz", "West", "Northwest", "#002B5C", "#00471B"),
    (1610612764, "WAS", "Washington", "Wizards", "East", "Southeast", "#002B5C", "#E31837"),
]

TEAM_BY_ID = {t[0]: t for t in TEAMS}
TEAM_BY_ABBR = {t[1]: t for t in TEAMS}

SPOTRAC_SLUG = {
    "ATL": "atlanta-hawks", "BOS": "boston-celtics", "BKN": "brooklyn-nets",
    "CHA": "charlotte-hornets", "CHI": "chicago-bulls", "CLE": "cleveland-cavaliers",
    "DAL": "dallas-mavericks", "DEN": "denver-nuggets", "DET": "detroit-pistons",
    "GSW": "golden-state-warriors", "HOU": "houston-rockets", "IND": "indiana-pacers",
    "LAC": "los-angeles-clippers", "LAL": "los-angeles-lakers", "MEM": "memphis-grizzlies",
    "MIA": "miami-heat", "MIL": "milwaukee-bucks", "MIN": "minnesota-timberwolves",
    "NOP": "new-orleans-pelicans", "NYK": "new-york-knicks", "OKC": "oklahoma-city-thunder",
    "ORL": "orlando-magic", "PHI": "philadelphia-76ers", "PHX": "phoenix-suns",
    "POR": "portland-trail-blazers", "SAC": "sacramento-kings", "SAS": "san-antonio-spurs",
    "TOR": "toronto-raptors", "UTA": "utah-jazz", "WAS": "washington-wizards",
}


def team_dict(team_id: int) -> dict:
    t = TEAM_BY_ID[team_id]
    return {
        "teamId": t[0], "abbr": t[1], "city": t[2], "name": t[3],
        "fullName": f"{t[2]} {t[3]}", "conference": t[4], "division": t[5],
        "primaryColor": t[6], "secondaryColor": t[7],
        "logo": f"https://cdn.nba.com/logos/nba/{t[0]}/primary/L/logo.svg",
    }
