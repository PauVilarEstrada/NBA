# Mocking the AI convincingly

The product has to be finished before the model is. This is how the projections
work — and stay honest — while there is nothing trained in production.

**Files:** `backend/app/ml/mock.py`, `backend/app/services/synth.py`,
`frontend/src/lib/engine.ts`.

---

## The five rules

### 1. Anchor to something real

The centre of every distribution starts at the player's actual recent form —
his rolling averages — not at an invented number. `random.uniform(15, 35)`
produces a number; a baseline anchored to production produces a *projection*.

### 2. Apply the same causal effects the real model will learn

`_multiplier()` is a product of independent, individually defensible factors:

| Effect | Magnitude | Source |
|---|---|---|
| Home / away | ±1.5% | League-wide home scoring effect |
| Back-to-back | −3.8% points and minutes | Observed B2B penalty |
| 3+ days rest | +1.2% | |
| Opponent defence | ±0.9% per point of DRtg vs league average | |
| Pace | ±0.6% per possession vs league average | Affects every counting stat |
| Positional matchup | ±1.2% per point conceded to his slot | |
| Playoffs | pace ×0.972, scoring ×0.965, star usage +6% | See `PLAYOFF_ADJUSTMENTS` |
| Recent form | ±4.5%, hard-regressed with `tanh` | Hot streaks are mostly noise |

This is the property that matters: **move any input and the projection moves the
way it should.** A demo survives being poked at only if the causality is real.

### 3. Get the spread right, not just the mean

Dispersion (σ/μ) is taken from observed NBA game logs: points 0.315, rebounds
0.360, assists 0.400, minutes 0.150, threes 0.520. Low-count stats are floored
at Poisson-like variance (σ ≥ √μ·0.65) — assists cannot have a tight interval
just because the mean is small. Points carry a right skew (+0.16), because a
45-point night is more likely than a −45-point one is possible.

The intervals are therefore roughly the right width from day one, which means
the UI never has to be re-tuned when the trained model arrives.

### 4. Be deterministic

Every projection is seeded on `(player, opponent, venue, rest, playoffs)`.
Nothing destroys trust in a forecast page faster than a number that changes when
you hit refresh. Same in the simulator: `(roster, opponent, seed)` always
replays identically, which is why the backend can store just the seed.

### 5. Label it, always

Every mocked response carries `"source": "mock"` and the UI renders a visible
**Baseline model** badge with an explanatory tooltip. An unlabelled fake number
is a lie, and it is the one shortcut that will cost you the room in a demo.

---

## Synthetic history

`services/synth.py` (and its TypeScript twin) derives, from the same baselines
and the same multiplier:

- **82-game schedules** with realistic rest patterns (13-15 back-to-backs)
- **Game logs** that average back to the player's listed baseline
- **Head-to-head history** — ~3.6 meetings a season over six seasons, split by
  venue, with a mild age factor on older seasons
- **Career progression** along the standard aging curve, with steeper early
  development

Everything is internally consistent: the home/away split in the game log matches
the league-wide home effect the model applies, and his line against a good
defence really is worse than against a bad one. Charts built on it tell the
truth about the model's assumptions — which is what a portfolio demo needs.

---

## Swapping in the real model

`services/predictions.py` already does this:

```python
if any(registry.has_player(t, season_type) for t in ("pts", "reb", "ast")):
    ...                      # trained XGBoost bundles
else:
    projections = mock.project_player_vs_team(player, opponent, ctx)
```

Both branches return the same `Projection` objects and the same response shape.
Train, drop the artefacts into `NBA_MODEL_DIR`, `POST /api/admin/reload-models`,
and the badge flips from **Baseline model** to **Trained model**. No frontend
change, no schema change, no redeploy.

Set `NBA_ALLOW_MOCK_INFERENCE=false` in production if you would rather the API
fail loudly than quietly serve a baseline.

---

## What the mock is *not*

It is not a substitute for evaluation. It has no learned weights, so it cannot
discover an effect nobody encoded — and its stated intervals have never been
tested against outcomes. The moment real predictions are being served,
`prediction_log.actual` gets backfilled and the model is scored: MAE against the
last-10 baseline, and calibration (do 80% of results actually land inside the
80% interval?). Until then the numbers are plausible, not validated, and the
badge says so.
