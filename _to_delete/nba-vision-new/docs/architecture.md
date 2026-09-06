# Architecture

```
                         ┌──────────────────────────────────────────┐
  stats.nba.com ────┐    │  INGEST WORKER (offline, rate-limited)    │
  Basketball-Ref ───┼───▶│  scripts/ingest.py                        │
  Spotrac / HH ─────┤    │  teams → players → games → advanced       │
  RealGM ───────────┤    │  → contracts → feature store              │
  SportsDataIO ─────┘    └──────────────┬───────────────────────────┘
  (optional, JSON)                      │
                                        ▼
                              ┌────────────────────┐
                              │   PostgreSQL       │  entities · game logs
                              │   + feature store  │  features · model registry
                              └─────────┬──────────┘  prediction log
                                        │
                       ┌────────────────┴─────────────────┐
                       ▼                                  ▼
             ┌───────────────────┐             ┌────────────────────┐
             │  TRAINER          │  artefacts  │  FASTAPI           │
             │  app/ml/train.py  │────────────▶│  read-through      │
             │  XGBoost + quant. │             │  cache (Redis/disk)│
             │  Elo + ratings    │             │  model registry    │
             │  LSTM/Transformer │             └─────────┬──────────┘
             └───────────────────┘                       │ JSON
                                                         ▼
                                            ┌─────────────────────────┐
                                            │  REACT + TS + Tailwind  │
                                            │  Framer Motion          │
                                            │  offline engine fallback│
                                            └─────────────────────────┘
```

## Why a backend proxy is not optional

`stats.nba.com` sends no `Access-Control-Allow-Origin` header, so a browser can
never call it. It also fingerprints clients — without the exact
`Referer` / `Origin` / `x-nba-stats-token` header set in
`app/providers/nba_stats.py` it returns an empty 200 or hangs — and it
rate-limits aggressively enough to ban a datacentre IP within minutes.

So the API process is the only thing that talks to it, at ~0.6 req/s behind a
shared token bucket, and everything it fetches goes through a read-through cache
with per-key locks (so a cold key is fetched once, not once per concurrent
request). TTLs are tiered: a week for the player index, twelve hours for season
splits, a day for contracts, a minute for anything live.

## Three data planes

1. **Raw cache** — whatever the upstream returned, keyed by endpoint and params.
   Redis when available, on-disk JSON otherwise, so local development needs no
   infrastructure.
2. **Normalised entities** — `team`, `player`, `game`, `player_game_log`,
   `contract`, `transaction`. This is what the app reads.
3. **Feature store** — `feature_player_game` / `feature_team_game`: one
   materialised, point-in-time-correct row per (game, entity), with the label
   alongside. Training reads only this, which is what makes the "no leakage"
   guarantee auditable instead of aspirational.

## Two runtimes, one contract

`frontend/src/lib/api.ts` is the only place that knows whether a backend exists.

- `VITE_API_URL` **unset** → `lib/engine.ts`, a TypeScript port of the backend's
  baseline model and simulator, running against a seeded league bundled as JSON.
- `VITE_API_URL` **set** → the FastAPI service.

Both return identical shapes. That is what lets the site be a finished,
demoable product before a single model has been trained — and it is why the
"swap in the real model" step is a config change, not a refactor.

The demo dataset itself is generated from the backend
(`scripts/export_seed.py`), so there is one source of truth for the league and
the two engines cannot drift apart on rosters, ratings or prices.

## Request path, worked example

`POST /api/predict/player`

1. `services/predictions.py` loads the player and opponent from the catalogue
   (Postgres in live mode, the seed otherwise).
2. It builds the game-log history and derives a `MockContext` — venue, rest,
   opponent defensive rating, opponent pace, positional matchup, recent form.
3. If `ml/registry.py` holds a trained bundle for the target and season type,
   the feature row is assembled by `ml/features.py` and the XGBoost mean +
   quantile heads produce a `Projection`. Otherwise `ml/mock.py` produces the
   same object from the calibrated baseline.
4. `Projection.to_dict()` emits the median, the 80% interval, every quantile,
   and — for the counting stats — a sportsbook-style half-point line with
   `prob_over` / `prob_under`.
5. `_drivers()` exposes the individual effects that moved the number, so the UI
   can explain the projection instead of asserting it.
6. The response is tagged `"source": "model" | "mock"`.

## Frontend structure

- **`lib/`** — `api.ts` (adapter), `engine.ts` (offline model + simulator),
  `stats.ts` (quantile maths), `palette.ts` (validated chart colours),
  `rng.ts` (deterministic mulberry32), `format.ts`, `cap.ts`.
- **`components/ui/`** — glass card, page transition, segmented control,
  slider, toggle, badges, avatars with CDN fallback, type-ahead pickers.
- **`components/charts/`** — `ChartFrame` wraps every chart and guarantees a
  legend, a table view and horizontal scroll containment; then radar, trend
  line, grouped bars, and the projection strip / win-probability / driver bars.
- **`components/sim/`** — pre-game loader and the broadcast replay.
- **`store/`** — theme (persisted, dark by default) and the fantasy builder.

## Simulations run off the main thread

A single simulated game is ~200 possessions; the confidence band behind it
re-runs the whole engine another 100-500 times. That is hundreds of milliseconds
to several seconds of *synchronous* JavaScript — and if it runs on the main
thread, React never gets to paint the loading screen. The page appears to freeze
on the click and then jump to the result.

So every simulation goes through `lib/sim.worker.ts`:

```
  page ──postMessage({type:'simulate'|'simulateReal', …})──▶ worker
       ◀──{type:'progress', stage, pct}── (repeatedly, during the sweep)
       ◀──{type:'done', result}──
```

`lib/api.ts` wraps that in a promise with an `onProgress` callback, so the
pre-game screen reports what is actually happening rather than animating a fake
bar. A minimum display time (`atLeast`) keeps the tip-off animation from
flashing past when the work finishes in 300ms.

In live mode the same call is a `POST` to the backend and the worker is unused.

## Performance notes

- The seeded league is 88 KB of JSON; game logs, head-to-head history and
  career rows are *generated on demand* from baselines, so the bundle stays
  small and every chart still has dense data.
- The simulator plays ~200 possessions in a few milliseconds; the 200-run Monte
  Carlo sweep behind the win probability takes well under a second in the
  browser.
- Replay is a pure function of one number (elapsed game seconds), so scrubbing,
  pausing and skipping cost nothing and the box score can never disagree with
  the scoreboard.
