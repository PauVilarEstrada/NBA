# Data sources

| Need | Source | How it is used | Notes |
|---|---|---|---|
| Official & advanced stats | **stats.nba.com** via [`nba_api`](https://github.com/swar/nba_api) | `providers/nba_stats.py` (async, in-process) and `scripts/ingest.py` (sync `nba_api`, batch) | No CORS headers, fingerprints clients, rate-limits hard. Proxy is mandatory. [nbasense.com](https://nbasense.com) documents all 253 endpoints |
| Historical & advanced metrics (PER, TS%, WS, WS/48, BPM, VORP) | **Basketball-Reference** | `providers/bref.py`, ingest only | ≥3.2 s between requests, one worker. Secondary tables are inside HTML comments — strip them before parsing |
| Contracts, cap hits, options | **Spotrac** (primary), **HoopsHype** (cross-check) | `providers/contracts.py` | Scraped daily by the worker, never from a web request |
| Trades and transactions | **RealGM** transaction tracker | `providers/transactions.py` | Most complete free source; stable markup |
| Trade legality | **ESPN Trade Machine** | Not scraped — the salary-matching rules are reimplemented | No public API |
| Draft & rookies | **NBA.com/draft** (`drafthistory` endpoint) and Basketball-Reference draft history | ingest | |
| Structured JSON alternative | **SportsDataIO**, **Sportradar** (official NBA data provider) | `providers/contracts.py::fetch_from_sportsdataio` | Paid with free tiers; add injuries, daily transactions and free agents. Set `NBA_SPORTSDATAIO_KEY` and the ingest job switches over transparently |
| Player headshots | `https://cdn.nba.com/headshots/nba/latest/1040x760/{player_id}.png` | `providers/assets.py`, `components/ui/Media.tsx` | No auth, hotlinkable. Not every id resolves — the UI falls back to an initials tile on the team colour rather than showing a broken image |
| Team logos | `https://cdn.nba.com/logos/nba/{team_id}/primary/L/logo.svg` | same | Team ids are the NBA's canonical ones (`1610612747` = Lakers), identical across every endpoint |

## Rate limiting and etiquette

Everything that scrapes runs in the **offline worker**, never in a request
handler:

| Source | Interval | Where |
|---|---|---|
| stats.nba.com | ~1.7 s (0.6 req/s token bucket) + read-through cache | `providers/nba_stats.py` |
| Basketball-Reference | 3.2 s, single worker | `providers/bref.py` |
| Spotrac / HoopsHype | 2.5 s | `providers/contracts.py` |
| RealGM | 2.0 s | `providers/transactions.py` |

Suggested schedule:

```
03:00 daily    games (yesterday) + contracts + transactions
03:30 daily    features (last 7 days)
Sun 04:00      Basketball-Reference advanced + full feature rebuild + retrain
```

## Cache TTLs

| Data | TTL | Why |
|---|---|---|
| Player index, team metadata, draft history | 7 days | Changes a handful of times a season |
| Season splits, advanced stats | 12 hours | One update per game day is plenty |
| Contracts | 24 hours | Spotrac updates in batches |
| Scoreboard, injuries | 60 s | The only genuinely live data |

## What the demo dataset carries, and what it does not

The bundled league (`backend/app/services/seed.py`, exported to
`frontend/src/lib/seed.generated.json`) holds 124 players across all 30 teams
with their per-game line, listed measurements, draft slot, career path and
honours, plus franchise championship history.

Three honest caveats, all surfaced in the UI:

1. **Advanced metrics are reconstructed**, not measured. Shooting splits are
   inverted out of the true-shooting identity, and PER / BPM / VORP / WS are
   calibrated approximations (`app/services/advanced.py`). They rank players
   sensibly; they are not the published values. Running the
   Basketball-Reference ingest replaces them.
2. **Rosters are the top of each team**, not all 15 contracts. The simulator
   completes each rotation with replacement-level players, visibly labelled
   *filler*, so three stars never play 48 minutes each.
3. **Player ids for the most recent draft classes are approximate.** Ids for
   established players are canonical; for 2024-25 rookies they are best-effort,
   so a headshot may not resolve — the avatar falls back to initials on the team
   colour. `scripts/ingest.py players` fixes them authoritatively.

## Legal note

Every source above has its own terms of use. `stats.nba.com` is not a public
API, and Basketball-Reference, Spotrac and RealGM all prohibit aggressive
automated access. The throttles in this repo are deliberate. Before running any
of it against production traffic, read those terms — and if you need a licence,
that is exactly what Sportradar (the NBA's official data partner) and
SportsDataIO sell.
