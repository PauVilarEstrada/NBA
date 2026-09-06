# The models

Four models, kept separable so each can be inspected, replaced or disabled on
its own.

---

## 1. Player projection — gradient-boosted quantile regression

**Question:** what will this player do against this defence, in this venue, on
this much rest?

**File:** `app/ml/player_model.py`, features in `app/ml/features.py`.

For each target (`pts`, `reb`, `ast`, `min`, `fg3m`) we train:

- one **mean** model — XGBoost `reg:squarederror`
- seven **quantile** models — XGBoost `reg:quantileerror` at
  0.05 / 0.15 / 0.25 / 0.50 / 0.75 / 0.85 / 0.95

Quantile heads rather than "mean ± k·σ" because dispersion is *conditional*: a
bench guard on a minutes leash and a 38-minute star at foul-trouble risk have
completely different shapes, and only quantile regression learns that. The
predicted quantiles are then interpolated into a distribution-free quantile
function (`app/ml/distributions.py`), which is what produces the interval and
the over/under probability. NBA box scores are visibly non-Gaussian — points are
right-skewed, minutes are bimodal because of blowouts — so assuming normal
residuals would systematically misprice the tails.

### Features

| Group | Features |
|---|---|
| Form | rolling means of pts/reb/ast/min/TS%/USG% over 3, 5, 10, 25 games |
| Volatility | 10-game standard deviation of points and minutes — drives the *width*, not the mean |
| Season baseline | season-to-date averages, games played |
| Context | home/away, rest days, back-to-back flag, playoffs flag, days into season, age |
| Opponent | defensive rating, pace, points conceded to his position vs league average, opponent 3P% allowed |
| Head-to-head | career average vs this opponent, meetings played, career home-minus-away split vs this opponent |
| Team | usage vacated by players listed out, own team's offensive rating |

### The one rule that matters

**Every feature must be computable strictly before tip-off.** Rolling windows
are `.shift(1)`-ed, opponent ratings are as of the day before, and the feature
store is built by walking each player's games in chronological order and writing
the features from games `0..i-1` with game `i`'s box score as the label. Any
other ordering produces a model that looks brilliant offline and is worthless
live.

### Validation

`GroupKFold` grouped by season, so games from the same week never land in both
folds. Every run reports `cv_mae` **next to** `baseline_mae_last10` — the mean
absolute error of simply predicting his last-10 average. A model that does not
beat that baseline is not a model, it is a slower average, and it does not get
promoted.

---

## 2. Sequence head — LSTM / Transformer (optional)

**File:** `app/ml/sequence_model.py`. Requires `requirements-dl.txt` (PyTorch);
the API never hard-depends on it.

A fixed rolling window is a lossy summary: a player trending up over four games
and a player oscillating around the same mean have identical 10-game averages
and different next-game distributions. The sequence model sees the *shape*.

- `build_lstm()` — 2-layer LSTM over the last 25 games. Cheap, strong on short
  sequences, the default.
- `build_transformer()` — 2-layer encoder, learned positional embeddings,
  causal mask. Better once you have >100k player-games.

Both emit monotone quantiles by construction (cumulative softplus, so quantiles
cannot cross) and are trained with the pinball loss. That means the deep head
speaks the same language as the XGBoost quantile heads, and the two are fused in
quantile space via `distributions.blend`.

---

## 3. Team model — Elo + four factors + learned correction

**File:** `app/ml/team_model.py`.

1. **Elo with margin of victory** — a well-calibrated prior on win probability
   that needs nothing but results. 538-style MOV multiplier with the
   autocorrelation correction, plus season-to-season regression toward 1505. It
   handles roster churn badly, so it is a prior, not the answer.
2. **Ratings projection** — expected possessions from the two teams' pace (pace
   is a property of the *game*, so both sides get the same number), then points
   from the offence-vs-defence rating clash, plus home advantage (≈2.4 points
   post-2020, not the ≈3.5 it used to be) and a rest adjustment (≈0.35 pts per
   extra day, ≈−1.4 for a back-to-back). This is what produces a *score*.
3. **Gradient-boosted correction** — XGBoost on the residual, fed rest, travel,
   availability and the Elo gap.

Win probability comes from the normal CDF of the projected margin with σ≈11.8,
which is the observed spread of NBA final margins.

Reference points printed at train time: a Vegas closing spread lands around
**9.1 MAE**; a coin flip scores **0.25 Brier**.

### Playoffs are a different sport

They get **separate trained artefacts** plus structural adjustments
(`PLAYOFF_ADJUSTMENTS`):

| Adjustment | Value | Why |
|---|---|---|
| Pace | ×0.972 | Fewer transition possessions |
| Defensive rating | −2.1 | Shorter rotations, more scouting, switch-everything coverages |
| Home advantage | 3.1 pts (vs 2.4) | Louder buildings, tighter whistles |
| Star usage | +6% | Top-two usage players absorb bench usage |
| Bench minutes | ×0.82 | Rotations shorten |
| Variance | ×0.92 | A playoff series is less random than a Tuesday in January |

Training one model on both and adding an `is_playoffs` flag underfits the
difference, because the interaction is with almost every feature.

`series_probability()` computes the best-of-seven probability **exactly** by
enumerating all 2⁷ outcome paths under the 2-2-1-1-1 home split — no simulation,
no sampling error.

---

## 4. Game simulator — possession-level Monte Carlo

**File:** `app/ml/simulator.py` (and the TypeScript port in
`frontend/src/lib/engine.ts`).

Rather than sampling a final score, it plays the game: alternating possessions,
a shooter drawn from live usage weights, the shot resolved against the defence's
efficiency profile, offensive rebounds keeping the possession alive
(second-chance points are ~12% of NBA scoring — leaving them out is why naive
simulators come in 8-10 points light), fatigue accumulating with minutes.

That buys three things a score sampler cannot: a live box score that adds up to
the final score by construction, play-by-play text with real actors, and
clock-accurate events — which is what makes the 1-second-per-game-minute replay
possible.

### Calibration

A simulator nobody calibrated is a random number generator with extra steps.

```bash
python -m app.ml.simulator --calibrate --runs 40
# {"avgTotal": 226.5, "avgPPP": 1.14, "targetTotal": 226.0, "targetPPP": 1.13}
```

`TS_TO_EFG` is the single constant tuned to hit those targets. Re-run it after
any change to the possession logic.

**Known limitation:** because possessions are resolved independently, simulated
margins disperse a little wider (σ≈15-17) than real NBA margins (σ≈11.8). The
served team forecast therefore uses the analytical model for probabilities; the
simulator's Monte Carlo sweep is reported alongside the replay it actually
produced, so the two are internally consistent rather than silently mixed.

---

## Season-level models

`frontend/src/lib/season.ts` carries the models that operate above a single game.

**Award races.** MVP / DPOY / ROY / MIP / 6MOY are each scored from four
components — production, efficiency, impact and team success, weighted per award
— and vote share is a softmax over the totals, so a dominant season reads as a
landslide rather than a narrow edge. Every component is rendered next to the
name; the point is that the ranking should be arguable, not authoritative.

**Similar players.** Weighted Euclidean nearest neighbours over a twelve-axis
percentile vector (points, rebounds, assists, steals, blocks, turnovers, threes,
true shooting, usage, minutes, PER, BPM). Percentiles are already on a shared
0-100 scale, which is exactly what a distance metric needs — comparing raw
points to raw true-shooting would let one axis dominate the whole metric.

**Archetype and scouting report.** Rule-based, from the same percentile vector.
A k-means label of "cluster 4" explains nothing; a threshold that fires
"Rim protector — anchors the paint on both glass and shot-blocking" explains
itself. Every sentence of the report is triggered by a percentile threshold, so
nothing in it is invented prose.

**Full-season simulation.** The possession engine is the wrong granularity for
1,230 games. Here each result is the ratings model's expected margin plus a
seeded normal draw (sigma 11.8 on margin, 13.5 on total), which resolves a whole
season in milliseconds and still reproduces the right league-wide totals — the
simulated average total lands within a point of the real 226. The schedule is a
double round-robin extended by shuffled passes until every team has 82 games,
then the bracket runs best-of-seven through the same model with 2-2-1-1-1 home
court. A custom team built from any players takes the place of one real
franchise, so the league stays at 30.

## Market value

**File:** `app/services/market_value.py`.

Cap hit is what a player *is paid*; market value is what he is *worth*. They
diverge constantly — rookie-scale stars are the largest surplus in the sport —
and a fantasy budget priced off cap hit alone would sell a 22-year-old
franchise centre for pocket change.

```
raw    = 0.85·PTS + 0.55·REB + 1.10·AST + 2.4·STL + 2.0·BLK + 0.22·MIN
         + 40·(TS% − .500) + 4.2·VORP
share  = 0.35 · (raw / 62)^1.9 · age_curve(age) · availability
value  = share · salary_cap
price  = 0.45 · cap_hit + 0.55 · value
```

True shooting enters as a bonus *relative to league average*, because every
rotation player shoots near .560 and the raw level just adds a constant to
everyone. The 1.9 exponent reflects that superstar pay rises much faster than
superstar production. The age curve peaks at 26-28 and declines gently after —
production is already falling, so double-counting age is how curves end up
valuing a 34-year-old All-NBA wing at the minimum.

For the builder, prices are rescaled so the most expensive player always costs
about **38% of whatever budget you pick** — a $10M team and a $50M team then
face the same shape of decision.

---

## Training and promotion

```bash
python -m app.ml.train --what all --season-type both --from 2015
curl -XPOST localhost:8000/api/admin/reload-models
```

Artefacts land in `NBA_MODEL_DIR`; a row is written to `model_version` with the
metrics, the feature list and `is_active = false`. Promotion is deliberate and
gated on beating the incumbent. A partial unique index enforces at most one
active model per `(name, season_type)`.

Every served prediction is written to `prediction_log` with its inputs and
outputs so it can be scored against reality once the game is played. Without
that table you have no idea whether the model works.
