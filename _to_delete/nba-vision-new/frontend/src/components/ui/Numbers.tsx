import { useEffect, useRef, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import clsx from 'clsx'

/**
 * A number that counts up when it scrolls into view.
 *
 * Used sparingly — on hero figures and stat tiles, never inside a table, where
 * animated digits make a column impossible to read. It respects
 * `prefers-reduced-motion` by rendering the final value immediately.
 */
export function CountUp({
  value, decimals = 1, duration = 900, prefix = '', suffix = '', className,
}: {
  value: number; decimals?: number; duration?: number
  prefix?: string; suffix?: string; className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (!inView) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) { setShown(value); return }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      // ease-out-cubic: fast at first, settles on the number
      setShown(value * (1 - (1 - t) ** 3))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, value, duration])

  return (
    <span ref={ref} className={clsx('num', className)}>
      {prefix}{shown.toFixed(decimals)}{suffix}
    </span>
  )
}

/**
 * A percentile bar: where this player sits in the league on one stat.
 *
 * A raw number ("7.4 rebounds") means nothing without a reference. The bar is
 * the reference — and it always carries the percentile as text next to it, so
 * the meaning never rests on bar length or colour alone.
 */
export function PercentileBar({
  label, value, percentile, format = (v: number) => v.toFixed(1), color, hint,
}: {
  label: string
  value: number
  percentile: number
  format?: (v: number) => string
  color?: string
  hint?: string
}) {
  const tone = color
    ?? (percentile >= 85 ? 'var(--good)'
      : percentile >= 60 ? 'var(--brand-lit)'
      : percentile >= 35 ? 'var(--text-muted)'
      : 'var(--bad)')
  const band = percentile >= 90 ? 'Elite'
    : percentile >= 75 ? 'Very good'
    : percentile >= 55 ? 'Above average'
    : percentile >= 40 ? 'Average'
    : percentile >= 20 ? 'Below average' : 'Poor'

  return (
    <div className="group">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>{label}</span>
        <span className="flex items-baseline gap-2">
          <span className="num text-sm font-bold">{format(value)}</span>
          <span className="num w-10 text-right text-[11px] font-bold" style={{ color: tone }}>
            {percentile}
            <span className="text-[8px] align-super">
              {percentile % 10 === 1 && percentile !== 11 ? 'st'
                : percentile % 10 === 2 && percentile !== 12 ? 'nd'
                : percentile % 10 === 3 && percentile !== 13 ? 'rd' : 'th'}
            </span>
          </span>
        </span>
      </div>
      <div className="relative mt-1 h-2 overflow-hidden rounded-full" style={{ background: 'var(--layer-2)' }}>
        {/* quartile ticks give the bar a scale without adding an axis */}
        {[25, 50, 75].map((q) => (
          <span key={q} aria-hidden className="absolute top-0 h-full w-px"
            style={{ left: `${q}%`, background: 'var(--bg)', opacity: 0.55 }} />
        ))}
        <motion.span
          initial={{ width: 0 }}
          whileInView={{ width: `${Math.max(2, percentile)}%` }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: tone }}
        />
      </div>
      <p className="mt-0.5 text-[10px] opacity-0 transition-opacity group-hover:opacity-100"
        style={{ color: 'var(--text-muted)' }}>
        {band}{hint ? ` · ${hint}` : ''}
      </p>
    </div>
  )
}

/** A rank chip — "3rd in the league". Ranks are ordinal, so they get an ordinal
 *  suffix and a colour band rather than a bar. */
export function RankChip({ rank, of = 30, label }: { rank: number; of?: number; label?: string }) {
  const tone = rank <= 5 ? 'var(--good)' : rank <= 15 ? 'var(--brand-lit)' : 'var(--bad)'
  const suffix = rank % 10 === 1 && rank !== 11 ? 'st'
    : rank % 10 === 2 && rank !== 12 ? 'nd'
    : rank % 10 === 3 && rank !== 13 ? 'rd' : 'th'
  return (
    <span className="inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ background: `color-mix(in srgb, ${tone} 15%, transparent)`, color: tone }}>
      <span className="num">{rank}{suffix}</span>
      <span style={{ opacity: 0.75 }}>of {of}{label ? ` · ${label}` : ''}</span>
    </span>
  )
}
