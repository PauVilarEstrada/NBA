"""Franchise history: banners, arenas, founding years.

Championship years are public record and are what the team trophy case renders.
Titles won under a previous city or name (Minneapolis Lakers, Seattle
SuperSonics, Syracuse Nationals, Philadelphia/San Francisco Warriors, St. Louis
Hawks, Rochester Royals, Washington Bullets) count for the franchise, which is
how the NBA itself counts them — the UI labels those seasons so the history is
readable rather than confusing.
"""
from __future__ import annotations

# abbr: {championships, abaChampionships, founded, arena, relocations}
FRANCHISE: dict[str, dict] = {
    "ATL": {"championships": [1958], "founded": 1946, "arena": "State Farm Arena",
            "notes": {1958: "as the St. Louis Hawks"}},
    "BOS": {"championships": [1957, 1959, 1960, 1961, 1962, 1963, 1964, 1965, 1966,
                              1968, 1969, 1974, 1976, 1981, 1984, 1986, 2008, 2024],
            "founded": 1946, "arena": "TD Garden"},
    "BKN": {"championships": [], "abaChampionships": [1974, 1976], "founded": 1967,
            "arena": "Barclays Center", "notes": {1974: "as the New York Nets (ABA)",
                                                  1976: "as the New York Nets (ABA)"}},
    "CHA": {"championships": [], "founded": 1988, "arena": "Spectrum Center"},
    "CHI": {"championships": [1991, 1992, 1993, 1996, 1997, 1998], "founded": 1966,
            "arena": "United Center"},
    "CLE": {"championships": [2016], "founded": 1970, "arena": "Rocket Arena"},
    "DAL": {"championships": [2011], "founded": 1980, "arena": "American Airlines Center"},
    "DEN": {"championships": [2023], "founded": 1967, "arena": "Ball Arena"},
    "DET": {"championships": [1989, 1990, 2004], "founded": 1941,
            "arena": "Little Caesars Arena", "notes": {}},
    "GSW": {"championships": [1947, 1956, 1975, 2015, 2017, 2018, 2022], "founded": 1946,
            "arena": "Chase Center",
            "notes": {1947: "as the Philadelphia Warriors",
                      1956: "as the Philadelphia Warriors",
                      1975: "as the Golden State Warriors"}},
    "HOU": {"championships": [1994, 1995], "founded": 1967, "arena": "Toyota Center"},
    "IND": {"championships": [], "abaChampionships": [1970, 1972, 1973], "founded": 1967,
            "arena": "Gainbridge Fieldhouse"},
    "LAC": {"championships": [], "founded": 1970, "arena": "Intuit Dome"},
    "LAL": {"championships": [1949, 1950, 1952, 1953, 1954, 1972, 1980, 1982, 1985,
                              1987, 1988, 2000, 2001, 2002, 2009, 2010, 2020],
            "founded": 1947, "arena": "Crypto.com Arena",
            "notes": {1949: "as the Minneapolis Lakers", 1950: "as the Minneapolis Lakers",
                      1952: "as the Minneapolis Lakers", 1953: "as the Minneapolis Lakers",
                      1954: "as the Minneapolis Lakers"}},
    "MEM": {"championships": [], "founded": 1995, "arena": "FedExForum"},
    "MIA": {"championships": [2006, 2012, 2013], "founded": 1988, "arena": "Kaseya Center"},
    "MIL": {"championships": [1971, 2021], "founded": 1968, "arena": "Fiserv Forum"},
    "MIN": {"championships": [], "founded": 1989, "arena": "Target Center"},
    "NOP": {"championships": [], "founded": 2002, "arena": "Smoothie King Center"},
    "NYK": {"championships": [1970, 1973], "founded": 1946, "arena": "Madison Square Garden"},
    "OKC": {"championships": [1979, 2025], "founded": 1967, "arena": "Paycom Center",
            "notes": {1979: "as the Seattle SuperSonics"}},
    "ORL": {"championships": [], "founded": 1989, "arena": "Kia Center"},
    "PHI": {"championships": [1955, 1967, 1983], "founded": 1946, "arena": "Xfinity Mobile Arena",
            "notes": {1955: "as the Syracuse Nationals"}},
    "PHX": {"championships": [], "founded": 1968, "arena": "Footprint Center"},
    "POR": {"championships": [1977], "founded": 1970, "arena": "Moda Center"},
    "SAC": {"championships": [1951], "founded": 1945, "arena": "Golden 1 Center",
            "notes": {1951: "as the Rochester Royals"}},
    "SAS": {"championships": [1999, 2003, 2005, 2007, 2014], "founded": 1967,
            "arena": "Frost Bank Center"},
    "TOR": {"championships": [2019], "founded": 1995, "arena": "Scotiabank Arena"},
    "UTA": {"championships": [], "founded": 1974, "arena": "Delta Center"},
    "WAS": {"championships": [1978], "founded": 1961, "arena": "Capital One Arena",
            "notes": {1978: "as the Washington Bullets"}},
}

# Recent Finals, for the "last champions" strip on the teams page.
RECENT_FINALS: list[dict] = [
    {"year": 2025, "champion": "OKC", "runnerUp": "IND", "finalsMvp": "Shai Gilgeous-Alexander"},
    {"year": 2024, "champion": "BOS", "runnerUp": "DAL", "finalsMvp": "Jaylen Brown"},
    {"year": 2023, "champion": "DEN", "runnerUp": "MIA", "finalsMvp": "Nikola Jokic"},
    {"year": 2022, "champion": "GSW", "runnerUp": "BOS", "finalsMvp": "Stephen Curry"},
    {"year": 2021, "champion": "MIL", "runnerUp": "PHX", "finalsMvp": "Giannis Antetokounmpo"},
    {"year": 2020, "champion": "LAL", "runnerUp": "MIA", "finalsMvp": "LeBron James"},
    {"year": 2019, "champion": "TOR", "runnerUp": "GSW", "finalsMvp": "Kawhi Leonard"},
    {"year": 2018, "champion": "GSW", "runnerUp": "CLE", "finalsMvp": "Kevin Durant"},
]


def for_team(abbr: str) -> dict:
    f = dict(FRANCHISE.get(abbr, {}))
    titles = f.get("championships", [])
    aba = f.get("abaChampionships", [])
    return {
        "championships": titles,
        "titleCount": len(titles),
        "abaChampionships": aba,
        "lastTitle": max(titles) if titles else None,
        "titleDrought": (2025 - max(titles)) if titles else None,
        "founded": f.get("founded"),
        "arena": f.get("arena"),
        "notes": {str(k): v for k, v in (f.get("notes") or {}).items()},
    }
