import type { Distribution } from '@/types'

/** Quantile levels the whole app speaks in. Mirrors `ml/distributions.py`. */
export const QUANTILES = [0.05, 0.15, 0.25, 0.5, 0.75, 0.85, 0.95] as const
const Z: Record<number, number> = {
  0.05: -1.645, 0.15: -1.036, 0.25: -0.674, 0.5: 0,
  0.75: 0.674, 0.85: 1.036, 0.95: 1.645,
}

/** Build a full predictive distribution from a mean, a spread and a skew.
 *  Scoring distributions have a fatter upper tail (a 45-point night is more
 *  likely than a -45-point one is possible), so the upper quantiles stretch. */
export function distribution(mean: number, sigma: number, skew = 0.1, floor = 0): Distribution {
  const q: Record<string, number> = {}
  for (const lvl of QUANTILES) {
    const z = Z[lvl]
    const stretch = 1 + skew * Math.max(z, 0) / 1.645
    q[String(lvl)] = Math.max(floor, mean + z * sigma * stretch)
  }
  const values = QUANTILES.map((l) => q[String(l)])
  return {
    mean: round(mean), median: round(q['0.5']),
    low: round(values[1]), high: round(values[5]),
    p10: round(interpQ(0.1, values)), p90: round(interpQ(0.9, values)),
    quantiles: Object.fromEntries(Object.entries(q).map(([k, v]) => [k, round(v)])),
  }
}

function round(v: number) { return Math.round(v * 100) / 100 }

function interpQ(p: number, values: number[]): number {
  const levels = QUANTILES as readonly number[]
  const mono = values.map((v, i) => (i === 0 ? v : Math.max(v, values[i - 1])))
  if (p <= levels[0]) return mono[0]
  if (p >= levels[levels.length - 1]) return mono[mono.length - 1]
  for (let i = 1; i < levels.length; i++) {
    if (p <= levels[i]) {
      const t = (p - levels[i - 1]) / (levels[i] - levels[i - 1])
      return mono[i - 1] + t * (mono[i] - mono[i - 1])
    }
  }
  return mono[mono.length - 1]
}

/** P(X > line) by inverting the quantile function. */
export function probOver(dist: Distribution, line: number): number {
  const levels = QUANTILES as readonly number[]
  const values = levels.map((l) => dist.quantiles[String(l)])
  const mono = values.map((v, i) => (i === 0 ? v : Math.max(v, values[i - 1])))
  if (line <= mono[0]) return 0.97
  if (line >= mono[mono.length - 1]) return 0.03
  for (let i = 1; i < mono.length; i++) {
    if (line <= mono[i]) {
      const t = (line - mono[i - 1]) / Math.max(mono[i] - mono[i - 1], 1e-6)
      return clamp(1 - (levels[i - 1] + t * (levels[i] - levels[i - 1])), 0.01, 0.99)
    }
  }
  return 0.03
}

export function withLine(dist: Distribution, line: number): Distribution {
  const p = probOver(dist, line)
  return { ...dist, line, probOver: p, probUnder: 1 - p }
}

/** Sportsbook-style half-point line centred on the median. */
export function halfPointLine(dist: Distribution): number {
  return Math.floor(dist.median) + 0.5
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Abramowitz & Stegun 7.1.26 — max error 1.5e-7, plenty for a win probability. */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const poly =
    t * 0.254829592 +
    t ** 2 * -0.284496736 +
    t ** 3 * 1.421413741 +
    t ** 4 * -1.453152027 +
    t ** 5 * 1.061405429
  return sign * (1 - poly * Math.exp(-ax * ax))
}

export const normalCdf = (x: number, mu = 0, sigma = 1) =>
  0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)))

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
export const std = (xs: number[]) => {
  if (xs.length < 2) return 0
  const m = mean(xs)
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1))
}
