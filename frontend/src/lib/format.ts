export const money = (v: number, compact = true) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 0,
  }).format(v)

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`
export const signed = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`
export const dec = (v: number, digits = 1) => v.toFixed(digits)

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

export const seasonLabel = (start: number) => `${start}-${String(start + 1).slice(2)}`

/** Fallback avatar when the official CDN has no headshot for an id.
 *  Initials on the team colour beats a broken-image icon. */
export function initialsDataUrl(name: string, color = '#1D428A'): string {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 104 76">
    <rect width="104" height="76" fill="${color}"/>
    <text x="52" y="50" font-family="Barlow Condensed,system-ui,sans-serif" font-size="34"
      font-weight="700" fill="rgba(255,255,255,.85)" text-anchor="middle">${initials}</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/** Series colours — validated for CVD separation against the dark surface.
 *  See docs/design.md; do not add a 7th by picking a nice-looking hue. */
export const SERIES = ['#3B82F6', '#E5484D', '#12A594', '#BC8000', '#8B7BE8', '#E255A1']

/** Hold a transition open for a minimum time.
 *  The simulation often finishes in a few hundred milliseconds now that it runs
 *  off-thread; without a floor the pre-game screen would flash and vanish,
 *  which reads as a glitch rather than as a countdown. */
export const atLeast = <T,>(work: Promise<T>, ms: number): Promise<T> =>
  Promise.all([work, new Promise((r) => setTimeout(r, ms))]).then(([value]) => value as T)
