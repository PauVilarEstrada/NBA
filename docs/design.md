# Design system

Dark by default, NBA navy and red, condensed display type, glass surfaces,
motion that reads as momentum rather than decoration. A full light theme ships
alongside it — the toggle is in the header and the choice persists.

## Colour

### Brand

| Role | Value | Used for |
|---|---|---|
| Navy | `#1D428A` | Primary gradients, glows, page ground |
| Red | `#C8102E` | Calls to action, accents, the simulate button |
| White | `#FFFFFF` | Type on saturated fills |

### Surfaces

| Token | Dark | Light |
|---|---|---|
| `--bg` | `#05070F` | `#F4F6FB` |
| `--surface` | `#101A33` | `#FFFFFF` |
| `--surface-glass` | `rgba(22,35,63,.55)` | `rgba(255,255,255,.72)` |
| `--text` | `#F2F5FA` | `#0A1428` |
| `--text-2` | `#9FB0CC` | `#44567A` |
| `--border` | `rgba(255,255,255,.09)` | `rgba(9,20,44,.12)` |

Neutral overlays go through `--layer-1/2/3` rather than hardcoded
`bg-white/x`, which is what lets the light theme be a token swap instead of a
per-component rewrite.

### Chart series — validated, not chosen by eye

| Slot | Dark (`#101A33`) | Light (`#FFFFFF`) |
|---|---|---|
| 1 | `#3B82F6` | `#2A78D6` |
| 2 | `#E5484D` | `#C8102E` |
| 3 | `#12A594` | `#1BAF7A` |
| 4 | `#BC8000` | `#8A6100` |
| 5 | `#8B7BE8` | `#4A3AA7` |
| 6 | `#E255A1` | `#D55181` |

Both columns were run through a categorical-palette validator against the
surface they actually render on, checking: lightness band, chroma floor,
colour-vision-deficiency separation on adjacent pairs (ΔE ≥ 8, OKLab ×100),
normal-vision separation (ΔE ≥ 15) and contrast.

Dark passes every gate (worst adjacent CVD ΔE 10.3, worst normal-vision ΔE
18.3). Light passes with one contrast warning on the teal slot, which is
relieved by the direct labels and table view that `ChartFrame` always ships.

**Adding a seventh slot means re-running the validator, not picking a nice hue.**
Series 1 and 2 are the chart-safe siblings of NBA navy and NBA red — the brand
colours themselves are for chrome, not for data.

## Type

- **Display:** Barlow Condensed 700/800, uppercase, tight tracking — headlines,
  player names, scores.
- **Body:** Inter.
- **Numbers:** JetBrains Mono with `tabular-nums` wherever figures must align in
  a column.

## Motion

| Element | Treatment |
|---|---|
| Route change | Slide + fade + blur, 280ms, `cubic-bezier(.22,1,.36,1)` |
| Card entrance | Staggered rise, 45ms apart |
| Card hover | 3px lift, border brightens, a light sweep crosses the surface |
| Active nav pill / segmented control | Framer `layoutId`, spring 400/34 |
| Bars and intervals | Grow from their baseline, 550-700ms |
| Score changes | Scale pop on the new value |

`prefers-reduced-motion` collapses every animation and transition globally.

## Chart rules

1. **Never a dual axis.** Two measures of different scale get two charts.
2. **A legend whenever there are ≥2 series**, plus direct labels at ≤4 series —
   identity never rests on colour alone.
3. **A table view on every chart** (`ChartFrame` provides the toggle).
4. Recessive grid and axes; thin marks; rounded data ends.
5. Wide content scrolls inside its own container — the page body never scrolls
   sideways.
6. **No projection without its interval.** `ProjectionStrip` refuses to render a
   mean on its own: the 90% whisker and the 50% box are the primary marks and
   the median is a tick on top of them.

## Reference patterns

Two components carry most of the "is this number good?" work, and every page
reuses them rather than inventing a variant:

- **`PercentileBar`** — a stat, its league percentile as a number *and* a bar,
  quartile ticks for scale, and a colour band. A raw number without a reference
  is not information; the percentile is always printed, so the meaning never
  rests on bar length or colour.
- **`RankChip`** — ordinal league rank ("3rd of 30"), for team metrics where the
  population is 30 and a percentile would be false precision.

Trophies are objects, not table rows: `TrophyCase` renders honours as rings,
trophies and shields, and `BannerRafters` hangs championship banners in the
team's colours. That is how the sport displays them, and a list reading
"NBA Champion: 4" throws away the thing people actually care about.

`CountUp` animates hero figures into place on scroll, and never inside a table —
animated digits make a column impossible to read. It short-circuits under
`prefers-reduced-motion`.

## Loading and failure

- Every async surface renders a skeleton at the size of the content that is
  coming, so nothing jumps when data lands (`CardGridSkeleton`, `PageLoader`).
- `PageLoader` names what is loading ("Pulling the profile"), which tells the
  user the click registered.
- A global `ErrorBoundary`, keyed on the route, catches a render error and shows
  a readable panel with the message and a retry — instead of a blank page.
- The pre-game loader reports the worker's real progress and holds for a minimum
  of 1.8s so the tip-off animation always plays.

## Accessibility

- Focus rings are restyled, never removed.
- The type-ahead pickers are fully keyboard-driven (arrows, Enter, Escape).
- Toggles and switches carry `role="switch"` / `aria-checked`; segmented
  controls carry `role="tab"` / `aria-selected`.
- Two-sided probability bars carry an `aria-label` stating both percentages.
- Headshots that fail to load fall back to an initials tile on the team colour,
  so a card never shows a broken-image glyph.
