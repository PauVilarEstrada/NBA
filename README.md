# NBA Vision

A full-stack NBA analytics, projection and simulation lab. Search and compare
players and teams, look up head-to-head history split by venue, project a
player's line against a specific defence, forecast a full game (regular season
*or* playoffs, on separate models), and build a roster under a budget to play
against a real NBA team with a possession-level simulator and a live timelapse
replay.

**It runs with zero setup.** `cd frontend && npm install && npm run dev` gives
you the whole site against a built-in demo league and a calibrated baseline
model. Add the backend for live stats.nba.com data, PostgreSQL caching and
trained models — the API contract is identical, so nothing in the UI changes.

---

## Quick start

### Frontend only (demo mode — no Python, no database)

```bash
cd frontend
npm install
npm run dev            # http://localhost:5173
```

### Full stack

```bash
cp .env.example .env
docker compose up -d db redis
cd backend
pip install -r requirements.txt
psql "$NBA_DATABASE_URL" -f sql/schema.sql
uvicorn app.main:app --reload        # http://localhost:8000/docs

# point the frontend at it
cd ../frontend
echo 'VITE_API_URL=http://localhost:8000/api' > .env.local
npm run dev
```

Or the whole thing at once:

```bash
docker compose up --build
```

### Load real data and train

```bash
cd backend
python scripts/ingest.py teams
python scripts/ingest.py players  --season 2025-26
python scripts/ingest.py games    --seasons 2015..2025    # slow: rate-limited on purpose
python scripts/ingest.py contracts --season 2025
python scripts/ingest.py features --seasons 2015..2025
python -m app.ml.train --what all --season-type both
curl -XPOST localhost:8000/api/admin/reload-models
```

---

## What is where

```
nba-vision/
├─ backend/
│  ├─ app/
│  │  ├─ main.py                 FastAPI app, CORS, gzip, timing, model boot
│  │  ├─ core/                   settings, two-tier cache, errors
│  │  ├─ db/                     SQLAlchemy session + mapped models
│  │  ├─ sql/schema.sql          the source of truth for the database
│  │  ├─ providers/              stats.nba.com, Basketball-Reference, Spotrac,
│  │  │                          HoopsHype, RealGM, cdn.nba.com assets
│  │  ├─ services/               catalogue, market value, synthetic history,
│  │  │                          predictions, fantasy builder
│  │  ├─ ml/                     features, distributions, player model,
│  │  │                          team model, sequence model, simulator,
│  │  │                          registry, calibrated mock, training CLI
│  │  └─ api/routes/             players, teams, h2h, predict, fantasy, meta
│  └─ scripts/                   ingest.py, export_seed.py
├─ frontend/
│  └─ src/
│     ├─ lib/                    api adapter, offline engine, stats, palette
│     ├─ i18n/                   en.ts / es.ts dictionaries, locale store
│     ├─ lib/assistant/          in-page Q&A: rules, entities, answers
│     ├─ components/ui|charts|player|team|sim|assistant
│     ├─ pages/                  the seven sections
│     └─ store/                  theme, fantasy builder
└─ docs/                         architecture, data sources, ML pipeline,
                                 how the AI is mocked, design system, i18n,
                                 the in-page assistant
```

## Two languages

The site is fully bilingual — **English** and **Castellano** — switched from the
EN / ES control in the header. The language changes the copy, the number and
currency formats (`113,5` and `55,2 M$` in Spanish), dates, ordinals, and the
sentences the models generate: the play-by-play re-narrates itself, and the
scouting reports, award components and loader stages are all written at render
time from language-free tokens.

Completeness is enforced by the compiler rather than by review: `es.ts` is typed
against `en.ts`, so a missing or misspelt key fails `npm run build`. See
`docs/i18n.md`.

## Ask about this page

Player and team pages carry a floating assistant that answers questions about
**that** player or **that** team — its numbers, and what to make of them — in
either language. Ask it about anybody else and it says so, and links you to the
right page.

It runs entirely in the browser: no model, no API key, no network call. Answers
are built by rules from the same objects the charts read, so the panel cannot
contradict the page it sits on, and it works offline. Suggestion chips make it
usable without typing, and it says plainly when it did not understand rather
than guessing. See `docs/assistant.md`.

## The eleven sections

Everything on the site describes one season (currently **2025-26**), named in the
header chip and on every profile so no page has to caveat itself.

| Route | What it does |
|---|---|
| `/players`, `/players/:id` | Index, then a seven-tab profile: **Overview** (game log, skill radar, league percentiles, where the points come from), **Scouting AI** (statistically similar players by nearest-neighbour search, a rule-based archetype, a generated scouting report and all eighteen percentiles), **Shooting** (full FG/3P/FT line, shot diet, efficiency vs volume), **Advanced** (PER, BPM, VORP, WS, ORtg/DRtg, per-36), **Splits** (home/away, rest, back-to-back, month by month), **Game log**, **Career**, **Honours** (trophy case + career timeline) |
| `/season` | The season hub: both conference tables with the play-in picture, fourteen statistical leaderboards, and scored models of the MVP / DPOY / ROY / MIP / 6MOY races with every component shown |
| `/league` | **Simulate the whole season** — all 1,230 games, then the play-in, the bracket and the Finals. Drop a franchise you invented (name, code, conference, roster) into the league in place of a real team and see where it finishes |
| `/rookies` | The current draft class: draft board with pick, school and country, a scored Rookie of the Year race with its components shown, and a full class table |
| `/compare` | Two to four players scored category by category, with a percentile bar on every line, radar overlay, grouped bars and both trophy cases |
| `/teams`, `/teams/:abbr` | Index with league table, then five tabs: **Roster** (cards + full table), **Team stats** (percentiles, ranks, matchup defence by position, head-to-head against any rival), **Arena & gate** (the building, capacity, average crowd, fill rate, sellouts, ticket prices and the last six home dates), **Cap sheet** (payroll against the tax line, best and worst contracts), **History** (championship banners, franchise facts, recent Finals) |
| `/head-to-head` | Every meeting between a player and one opponent, home and away plotted separately |
| `/predict/player` | Points / rebounds / assists / threes vs a chosen defence, with an 80% interval, an over/under, and a breakdown of what moved the number |
| `/predict/team` | Score, spread, total, win probability; playoffs switch to a different model and add an exact best-of-seven probability |
| `/simulate` | **Two real teams**, possession by possession. Rule any player out for injury and watch his minutes redistribute and the team ratings move; switch between regular season and playoffs; swap home court; then watch the replay |
| `/builder` | A budget, the league priced at real market value, roster building, opponent selection, and a possession-level simulation replayed at 1 real second per game minute |

## Design and honesty rules this project follows

- **No projection ships without its uncertainty.** Every forecast carries an
  interval and an over/under built from predicted quantiles, not a point estimate.
- **Every mocked number is labelled.** When no trained artefact is loaded the
  response is tagged `"source": "mock"` and the UI renders a visible badge.
- **Colour never carries meaning alone.** Every chart has a legend, direct
  labels and a table view; the categorical palette was validated for
  colour-vision deficiency against both the dark and the light surface.
- **No dual-axis charts.** Two measures on different scales get two charts.
- **Deterministic output.** Projections and simulations are seeded, so the same
  question always gives the same answer.
- **Nothing blocks the main thread.** Simulations run in a Web Worker, so the
  pre-game screen animates and the page stays at 60fps while a game and its
  200-run confidence sweep are computed.
- **Every async surface has a loading state**, and a render error shows a
  readable panel instead of a blank page.
- **Both languages are complete by construction.** The Spanish dictionary is
  typed against the English one, so a string added in one language and not the
  other does not build.
- **The assistant cannot invent.** It answers from the same objects the page
  renders, refuses anything outside the open page, and says plainly when it did
  not understand rather than guessing.

Read `docs/` for the details.

## Licence and attribution

Portfolio project. Not affiliated with or endorsed by the NBA. Player and team
imagery is served from the official `cdn.nba.com` endpoints and remains © NBA.
Respect each data source's terms before pointing the ingest jobs at production.
