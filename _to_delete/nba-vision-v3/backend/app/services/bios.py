"""Player biography, career path and honours.

Three tables, all keyed by the NBA person id:

* `BIO`      — listed height/weight, nationality, draft slot. Height and weight
               are stored in the units the NBA lists them in (inches, pounds)
               and converted once, on the way out.
* `STINTS`   — where he has played, as (team, first season, last season). This
               is what draws the career timeline; `None` as the end season
               means "still there".
* `HONOURS`  — championships, MVPs, All-Star selections and the rest, as a list
               of (label, years). The trophy case renders this directly.

Only honours that are a matter of public record are listed. A player with an
empty list has no entry here — the UI shows "no major honours yet" rather than
inventing one. Once `scripts/ingest.py` runs, all three come from the database.
"""
from __future__ import annotations

CM_PER_INCH = 2.54
KG_PER_LB = 0.45359237

# player_id: (height_inches, weight_lb, country, draft_year, draft_round, draft_pick)
BIO: dict[int, tuple] = {
    2544:    (81, 250, "USA", 2003, 1, 1),      # LeBron James
    201939:  (74, 185, "USA", 2009, 1, 7),      # Stephen Curry
    201142:  (83, 240, "USA", 2007, 1, 2),      # Kevin Durant
    203507:  (83, 243, "Greece", 2013, 1, 15),  # Giannis Antetokounmpo
    203999:  (83, 284, "Serbia", 2014, 2, 41),  # Nikola Jokic
    1629029: (79, 230, "Slovenia", 2018, 1, 3), # Luka Doncic
    203954:  (84, 280, "Cameroon", 2014, 1, 3), # Joel Embiid
    1628369: (80, 210, "USA", 2017, 1, 3),      # Jayson Tatum
    1628983: (78, 195, "Canada", 2018, 1, 11),  # Shai Gilgeous-Alexander
    1641705: (88, 235, "France", 2023, 1, 1),   # Victor Wembanyama
    203076:  (82, 253, "USA", 2012, 1, 1),      # Anthony Davis
    1626164: (77, 206, "USA", 2015, 1, 13),     # Devin Booker
    1628378: (74, 215, "USA", 2017, 1, 13),     # Donovan Mitchell
    1630169: (77, 185, "USA", 2020, 1, 12),     # Tyrese Haliburton
    1629630: (74, 174, "USA", 2019, 1, 2),      # Ja Morant
    201935:  (77, 220, "USA", 2009, 1, 3),      # James Harden
    202695:  (79, 225, "USA", 2011, 1, 15),     # Kawhi Leonard
    202681:  (74, 195, "USA", 2011, 1, 1),      # Kyrie Irving
    1627759: (78, 223, "USA", 2016, 1, 3),      # Jaylen Brown
    1631094: (82, 250, "USA", 2022, 1, 1),      # Paolo Banchero
    1630163: (79, 180, "USA", 2020, 1, 3),      # LaMelo Ball
    1628368: (75, 185, "USA", 2017, 1, 5),      # De'Aaron Fox
    1628389: (81, 255, "USA", 2017, 1, 14),     # Bam Adebayo
    1627734: (82, 240, "Lithuania", 2016, 1, 11),  # Domantas Sabonis
    1629627: (78, 284, "USA", 2019, 1, 1),      # Zion Williamson
    1627750: (76, 215, "Canada", 2016, 1, 7),   # Jamal Murray
    1630578: (83, 243, "Turkey", 2021, 1, 16),  # Alperen Sengun
    1630178: (74, 200, "USA", 2020, 1, 21),     # Tyrese Maxey
    1628973: (74, 190, "USA", 2018, 2, 33),     # Jalen Brunson
    1629008: (82, 218, "USA", 2018, 1, 14),     # Michael Porter Jr.
    203944:  (80, 250, "USA", 2014, 1, 7),      # Julius Randle
    1630162: (76, 225, "USA", 2020, 1, 1),      # Anthony Edwards
    1626157: (83, 248, "Dominican Republic", 2015, 1, 1),  # Karl-Anthony Towns
    1628386: (79, 232, "England", 2017, 2, 23), # OG Anunoby
    1628401: (76, 190, "USA", 2017, 1, 29),     # Derrick White
    203110:  (78, 230, "USA", 2012, 2, 35),     # Draymond Green
    203497:  (85, 258, "France", 2013, 1, 27),  # Rudy Gobert
    203932:  (80, 235, "USA", 2014, 1, 4),      # Aaron Gordon
    1630595: (78, 220, "USA", 2021, 1, 1),      # Cade Cunningham
    1630532: (82, 220, "Germany", 2021, 1, 8),  # Franz Wagner
    1630581: (80, 216, "Australia", 2021, 1, 6),# Josh Giddey
    1631114: (78, 211, "USA", 2022, 1, 12),     # Jalen Williams
    1630591: (76, 205, "USA", 2021, 1, 5),      # Jalen Suggs
    1631099: (80, 215, "USA", 2022, 1, 4),      # Keegan Murray
    1631097: (78, 210, "Canada", 2022, 1, 6),   # Bennedict Mathurin
    1630224: (76, 186, "USA", 2021, 1, 2),      # Jalen Green
    1631095: (83, 220, "USA", 2022, 1, 3),      # Jabari Smith Jr.
    1631096: (85, 208, "USA", 2022, 1, 2),      # Chet Holmgren
    1630567: (79, 237, "USA", 2021, 1, 4),      # Scottie Barnes
    1630596: (83, 215, "USA", 2021, 1, 3),      # Evan Mobley
    1629636: (73, 192, "USA", 2019, 1, 5),      # Darius Garland
    1629639: (77, 195, "USA", 2019, 1, 13),     # Tyler Herro
    1630217: (82, 242, "USA", 2018, 1, 4),      # Jaren Jackson Jr.
    1627783: (80, 230, "Cameroon", 2016, 1, 27),# Pascal Siakam
    1629027: (73, 164, "USA", 2018, 1, 5),      # Trae Young
    203897:  (77, 200, "USA", 2014, 1, 13),     # Zach LaVine
    1628374: (84, 240, "Finland", 2017, 1, 7),  # Lauri Markkanen
    1629675: (81, 264, "USA", None, None, None),# Naz Reid (undrafted)
    1626156: (75, 193, "USA", 2015, 1, 2),      # D'Angelo Russell
    1629014: (83, 250, "Bahamas", 2018, 1, 1),  # Deandre Ayton
    1629651: (83, 215, "USA", 2019, 2, 31),     # Nic Claxton
    1629684: (78, 214, "Canada", 2019, 1, 3),   # RJ Barrett
    1630208: (75, 190, "USA", 2020, 1, 25),     # Immanuel Quickley
    1630228: (78, 225, "DR Congo", 2021, 1, 7), # Jonathan Kuminga
    1630559: (77, 197, "USA", None, None, None),# Austin Reaves (undrafted)
    1630170: (75, 210, "USA", 2021, 2, 27),     # Cam Thomas
    1630543: (81, 206, "USA", 2021, 1, 17),     # Trey Murphy III
    1629661: (76, 194, "USA", 2019, 1, 28),     # Jordan Poole
    1628404: (81, 221, "USA", 2017, 1, 27),     # Kyle Kuzma
    1629003: (82, 250, "USA", 2015, 1, 22),     # Bobby Portis
    1628960: (78, 236, "USA", 2019, 1, 22),     # Grant Williams
    1629632: (77, 195, "USA", 2019, 1, 7),      # Coby White
    1630541: (80, 219, "USA", 2021, 1, 20),     # Jalen Johnson
    1630557: (78, 224, "USA", 2021, 1, 15),     # Corey Kispert
    1641731: (79, 195, "France", 2023, 1, 7),   # Bilal Coulibaly
    1641706: (81, 200, "USA", 2023, 1, 2),      # Brandon Miller
    1641708: (79, 214, "USA", 2023, 1, 4),      # Amen Thompson
    1631101: (77, 200, "Canada", 2022, 1, 7),   # Shaedon Sharpe
    1631128: (78, 216, "USA", 2022, 1, 21),     # Christian Braun
    1630180: (82, 250, "USA", 2022, 1, 13),     # Jalen Duren
    1641739: (79, 220, "Belgium", 2023, 2, 52), # Toumani Camara
    1631157: (87, 300, "Canada", 2024, 1, 9),   # Zach Edey
    1630640: (77, 205, "USA", 2024, 2, 39),     # Jaylen Wells
    1631107: (84, 230, "USA", 2024, 1, 15),     # Kel'el Ware
    1631111: (86, 280, "USA", 2024, 1, 7),      # Donovan Clingan
    1642267: (85, 224, "France", 2024, 1, 2),   # Alex Sarr
    1641740: (81, 200, "France", 2024, 1, 1),   # Zaccharie Risacher
    1641712: (81, 197, "USA", 2024, 1, 11),     # Matas Buzelis
    1641763: (80, 216, "USA", 2024, 1, 28),     # Ryan Dunn
    1641748: (75, 203, "USA", 2024, 1, 16),     # Jared McCain
    1631119: (75, 182, "USA", 2024, 1, 3),      # Reed Sheppard
    1631115: (75, 193, "USA", 2024, 1, 13),     # Devin Carter
    1631130: (79, 197, "USA", 2024, 1, 5),      # Ron Holland II
    1642270: (78, 215, "USA", 2024, 1, 4),      # Stephon Castle
    1631105: (78, 201, "Serbia", 2024, 1, 12),  # Nikola Topic
    1642264: (75, 205, "USA", 2024, 1, 29),     # Isaiah Collier
    1641709: (80, 205, "USA", 2023, 1, 13),     # Gradey Dick
    1631121: (76, 200, "USA", 2023, 2, 53),     # Jaylen Clark
    # 2025 draft class — the rookies section is built off these draft slots
    1642261: (81, 205, "USA", 2025, 1, 1),          # Cooper Flagg — Duke
    1642269: (78, 215, "USA", 2025, 1, 2),          # Dylan Harper — Rutgers
    1642262: (77, 193, "Bahamas", 2025, 1, 3),      # VJ Edgecombe — Baylor
    1642263: (79, 217, "USA", 2025, 1, 4),          # Kon Knueppel — Duke
    1642268: (82, 200, "USA", 2025, 1, 5),          # Ace Bailey — Rutgers
    1642265: (78, 190, "USA", 2025, 1, 6),          # Tre Johnson — Texas
    1642266: (76, 182, "USA", 2025, 1, 7),          # Jeremiah Fears — Oklahoma
    1642271: (81, 190, "Russia", 2025, 1, 8),       # Egor Demin — BYU
    1642272: (79, 245, "USA", 2025, 1, 9),          # Collin Murray-Boyles — South Carolina
    1642273: (86, 250, "South Sudan", 2025, 1, 10), # Khaman Maluach — Duke
    1642274: (78, 206, "USA", 2025, 1, 11),         # Cedric Coward — Washington State
    1642275: (81, 198, "France", 2025, 1, 12),      # Noa Essengue — Ratiopharm Ulm
    1642276: (82, 246, "USA", 2025, 1, 13),         # Derik Queen — Maryland
    1642277: (80, 215, "USA", 2025, 1, 14),         # Carter Bryant — Arizona
    1642278: (81, 255, "USA", 2025, 1, 15),         # Thomas Sorber — Georgetown
    1642282: (83, 235, "France", 2025, 1, 17),      # Joan Beringer — Cedevita Olimpija
    1642279: (74, 195, "USA", 2025, 1, 18),         # Walter Clayton Jr. — Florida
    1642280: (77, 205, "Lithuania", 2025, 1, 20),   # Kasparas Jakucionis — Illinois
    1642281: (75, 185, "USA", 2025, 1, 25),         # Jase Richardson — Michigan State
    # rotation depth
    1627826: (84, 240, "Croatia", 2016, 2, 32),     # Ivica Zubac
    1626181: (75, 215, "USA", 2015, 2, 46),         # Norman Powell
    1628969: (78, 209, "USA", 2018, 1, 10),         # Mikal Bridges
    1630202: (73, 195, "USA", 2020, 1, 26),         # Payton Pritchard
    202691:  (78, 220, "USA", 2011, 1, 11),         # Klay Thompson
    1629614: (77, 193, "Canada", 2022, 2, 31),      # Andrew Nembhard
    1641764: (76, 205, "USA", 2023, 1, 19),         # Brandin Podziemski
    1627741: (76, 220, "Bahamas", 2016, 1, 6),      # Buddy Hield
}

# Where the 2025 class came from — the draft board needs a school, not just a pick.
DRAFT_ORIGIN: dict[int, str] = {
    1642261: "Duke", 1642269: "Rutgers", 1642262: "Baylor", 1642263: "Duke",
    1642268: "Rutgers", 1642265: "Texas", 1642266: "Oklahoma", 1642271: "BYU",
    1642272: "South Carolina", 1642273: "Duke", 1642274: "Washington State",
    1642275: "Ratiopharm Ulm (GER)", 1642276: "Maryland", 1642277: "Arizona",
    1642278: "Georgetown", 1642282: "Cedevita Olimpija (SLO)", 1642279: "Florida",
    1642280: "Illinois", 1642281: "Michigan State",
}

# player_id: [(team_abbr, first_season_start, last_season_start | None)]
STINTS: dict[int, list[tuple]] = {
    2544:    [("CLE", 2003, 2009), ("MIA", 2010, 2013), ("CLE", 2014, 2017), ("LAL", 2018, None)],
    201939:  [("GSW", 2009, None)],
    201142:  [("OKC", 2007, 2015), ("GSW", 2016, 2018), ("BKN", 2019, 2022),
              ("PHX", 2022, 2024), ("HOU", 2025, None)],
    203507:  [("MIL", 2013, None)],
    203999:  [("DEN", 2015, None)],
    1629029: [("DAL", 2018, 2024), ("LAL", 2024, None)],
    203954:  [("PHI", 2016, None)],
    1628369: [("BOS", 2017, None)],
    1628983: [("LAC", 2018, 2018), ("OKC", 2019, None)],
    1641705: [("SAS", 2023, None)],
    203076:  [("NOP", 2012, 2018), ("LAL", 2019, 2024), ("DAL", 2024, None)],
    202681:  [("CLE", 2011, 2016), ("BOS", 2017, 2018), ("BKN", 2019, 2022), ("DAL", 2022, None)],
    201935:  [("OKC", 2009, 2011), ("HOU", 2012, 2020), ("BKN", 2020, 2021),
              ("PHI", 2022, 2022), ("LAC", 2023, None)],
    202695:  [("SAS", 2011, 2017), ("TOR", 2018, 2018), ("LAC", 2019, None)],
    1627734: [("OKC", 2016, 2016), ("IND", 2017, 2021), ("SAC", 2022, None)],
    1626157: [("MIN", 2015, 2023), ("NYK", 2024, None)],
    1627783: [("TOR", 2016, 2023), ("IND", 2023, None)],
    203497:  [("UTA", 2013, 2021), ("MIN", 2022, None)],
    203932:  [("ORL", 2014, 2020), ("DEN", 2020, None)],
    1629008: [("DEN", 2018, 2024), ("BKN", 2025, None)],
    1628374: [("CHI", 2017, 2019), ("CLE", 2020, 2021), ("UTA", 2022, None)],
    1629684: [("NYK", 2019, 2023), ("TOR", 2023, None)],
    1630208: [("NYK", 2020, 2023), ("TOR", 2023, None)],
    203897:  [("MIN", 2014, 2016), ("CHI", 2017, 2021), ("SAC", 2024, None)],
    1628404: [("LAL", 2017, 2019), ("WAS", 2021, 2023), ("MIL", 2024, None)],
    1629661: [("GSW", 2019, 2022), ("WAS", 2023, 2024), ("NOP", 2025, None)],
    1628386: [("TOR", 2017, 2023), ("NYK", 2023, None)],
    1628368: [("SAC", 2017, 2024), ("SAS", 2025, None)],
    1629014: [("PHX", 2018, 2022), ("POR", 2023, 2024), ("LAL", 2025, None)],
    1628960: [("BOS", 2019, 2022), ("DAL", 2023, 2023), ("CHA", 2024, None)],
    1630581: [("OKC", 2021, 2023), ("CHI", 2024, None)],
    1630228: [("GSW", 2021, None)],
    1630170: [("BKN", 2021, None)],
    1630163: [("CHA", 2020, None)],
    1629627: [("NOP", 2019, None)],
    1629630: [("MEM", 2019, None)],
    1630162: [("MIN", 2020, None)],
    1626164: [("PHX", 2015, None)],
    1628378: [("UTA", 2017, 2021), ("CLE", 2022, None)],
    1630169: [("SAC", 2020, 2021), ("IND", 2022, None)],
    1630224: [("HOU", 2021, 2024), ("PHX", 2025, None)],
}

# player_id: [(label, [years])]  — an empty list of years means "count only".
HONOURS: dict[int, list[tuple]] = {
    2544: [("NBA Champion", [2012, 2013, 2016, 2020]), ("Finals MVP", [2012, 2013, 2016, 2020]),
           ("Most Valuable Player", [2009, 2010, 2012, 2013]), ("Rookie of the Year", [2004]),
           ("Scoring champion", [2008]), ("All-Star", list(range(2005, 2026)))],
    201939: [("NBA Champion", [2015, 2017, 2018, 2022]), ("Finals MVP", [2022]),
             ("Most Valuable Player", [2015, 2016]), ("Scoring champion", [2016, 2021]),
             ("All-Star", [2014, 2015, 2016, 2017, 2018, 2019, 2021, 2022, 2023, 2024, 2025])],
    201142: [("NBA Champion", [2017, 2018]), ("Finals MVP", [2017, 2018]),
             ("Most Valuable Player", [2014]), ("Rookie of the Year", [2008]),
             ("Scoring champion", [2010, 2011, 2012, 2014])],
    203507: [("NBA Champion", [2021]), ("Finals MVP", [2021]),
             ("Most Valuable Player", [2019, 2020]), ("Defensive Player of the Year", [2020]),
             ("Most Improved Player", [2017])],
    203999: [("NBA Champion", [2023]), ("Finals MVP", [2023]),
             ("Most Valuable Player", [2021, 2022, 2024])],
    1628983: [("NBA Champion", [2025]), ("Finals MVP", [2025]),
              ("Most Valuable Player", [2025]), ("Scoring champion", [2025])],
    203954: [("Most Valuable Player", [2023]), ("Scoring champion", [2022, 2023])],
    1629029: [("Rookie of the Year", [2019])],
    1628369: [("NBA Champion", [2024])],
    1627759: [("NBA Champion", [2024]), ("Finals MVP", [2024])],
    1628401: [("NBA Champion", [2024])],
    203076: [("NBA Champion", [2020])],
    202681: [("NBA Champion", [2016]), ("Rookie of the Year", [2012])],
    201935: [("Most Valuable Player", [2018]), ("Scoring champion", [2018, 2019, 2020]),
             ("Sixth Man of the Year", [2012])],
    202695: [("NBA Champion", [2014, 2019]), ("Finals MVP", [2014, 2019]),
             ("Defensive Player of the Year", [2015, 2016])],
    203110: [("NBA Champion", [2015, 2017, 2018, 2022]), ("Defensive Player of the Year", [2017])],
    1627750: [("NBA Champion", [2023])],
    203932: [("NBA Champion", [2023])],
    1629008: [("NBA Champion", [2023])],
    1631096: [("NBA Champion", [2025])],
    1631114: [("NBA Champion", [2025])],
    1631105: [("NBA Champion", [2025])],
    203497: [("Defensive Player of the Year", [2018, 2019, 2021, 2024])],
    1627783: [("NBA Champion", [2019]), ("Most Improved Player", [2019])],
    1626157: [("Rookie of the Year", [2016])],
    1641705: [("Rookie of the Year", [2024])],
    1631094: [("Rookie of the Year", [2023])],
    1630567: [("Rookie of the Year", [2022])],
    1630163: [("Rookie of the Year", [2021])],
    1629630: [("Rookie of the Year", [2020]), ("Most Improved Player", [2022])],
    1642270: [("Rookie of the Year", [2025])],
    1630178: [("Most Improved Player", [2024])],
    1628374: [("Most Improved Player", [2023])],
    1628973: [("Clutch Player of the Year", [2024])],
}

TROPHY_ICON = {
    "NBA Champion": "ring",
    "Finals MVP": "trophy",
    "Most Valuable Player": "mvp",
    "Defensive Player of the Year": "shield",
    "Rookie of the Year": "star",
    "Most Improved Player": "arrow",
    "Sixth Man of the Year": "bench",
    "Clutch Player of the Year": "clock",
    "Scoring champion": "ball",
    "All-Star": "star",
}


def bio_for(player_id: int, position: str = "SF") -> dict:
    """Listed measurements. Falls back to position-typical values, flagged, so
    the profile never renders an empty row."""
    fallback = {"PG": (75, 190), "SG": (78, 200), "SF": (80, 215),
                "PF": (82, 235), "C": (84, 250)}
    row = BIO.get(player_id)
    estimated = row is None
    if row is None:
        h, w = fallback.get((position or "SF").upper(), (80, 215))
        country, dy, dr, dp = "USA", None, None, None
    else:
        h, w, country, dy, dr, dp = row
    return {
        "heightIn": h,
        "heightCm": round(h * CM_PER_INCH),
        "heightLabel": f"{h // 12}'{h % 12}\"",
        "weightLb": w,
        "weightKg": round(w * KG_PER_LB),
        "country": country,
        "draftYear": dy,
        "draftRound": dr,
        "draftPick": dp,
        "draftLabel": (f"{dy} · Round {dr}, pick {dp}" if dy else "Undrafted"),
        "origin": DRAFT_ORIGIN.get(player_id),
        "measurementsEstimated": estimated,
    }


def honours_for(player_id: int) -> list[dict]:
    out = []
    for label, years in HONOURS.get(player_id, []):
        out.append({
            "label": label,
            "count": len(years),
            "years": years,
            "icon": TROPHY_ICON.get(label, "star"),
        })
    return out


def stints_for(player_id: int, current_team: str, draft_year: int | None) -> list[dict]:
    rows = STINTS.get(player_id)
    if not rows:
        start = draft_year if draft_year else 2020
        rows = [(current_team, start, None)]
    return [{"team": t, "from": a, "to": b, "seasons": (b or 2025) - a + 1} for t, a, b in rows]
