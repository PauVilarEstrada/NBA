/** Deterministic RNG. Same inputs, same league, same projection — every time.
 *  A projection page that changes on refresh is a projection nobody trusts. */

export function hashSeed(...parts: (string | number | boolean)[]): number {
  const str = parts.join('|')
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export interface Rng {
  next(): number
  normal(mu?: number, sigma?: number): number
  int(min: number, max: number): number
  pick<T>(items: T[]): T
  weighted<T>(items: T[], weights: number[]): T
}

/** mulberry32 — small, fast, and good enough for simulation work. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  let spare: number | null = null
  const normal = (mu = 0, sigma = 1) => {
    if (spare !== null) { const v = spare; spare = null; return mu + sigma * v }
    // Box-Muller
    let u = 0, v = 0
    while (u === 0) u = next()
    while (v === 0) v = next()
    const r = Math.sqrt(-2 * Math.log(u))
    spare = r * Math.sin(2 * Math.PI * v)
    return mu + sigma * r * Math.cos(2 * Math.PI * v)
  }
  return {
    next,
    normal,
    int: (min, max) => Math.floor(next() * (max - min)) + min,
    pick: <T,>(items: T[]) => items[Math.floor(next() * items.length)],
    weighted: <T,>(items: T[], weights: number[]) => {
      const total = weights.reduce((s, w) => s + Math.max(w, 1e-6), 0)
      let r = next() * total
      for (let i = 0; i < items.length; i++) {
        r -= Math.max(weights[i], 1e-6)
        if (r <= 0) return items[i]
      }
      return items[items.length - 1]
    },
  }
}
