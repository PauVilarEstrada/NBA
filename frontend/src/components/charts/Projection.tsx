import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useI18n } from '@/i18n'
import type { Distribution, Driver } from '@/types'

/**
 * The projection strip: the number, the 80% interval, and the over/under.
 *
 * A single number pretending to be a forecast is the most common lie in sports
 * analytics. This component refuses to render a mean without its spread — the
 * band *is* the primary mark, and the median is a tick on top of it.
 */
export function ProjectionStrip({
  label, dist, unit, color = '#3B82F6', domain,
}: {
  label: string
  dist: Distribution
  unit?: string
  color?: string
  domain?: [number, number]
}) {
  const { t, f } = useI18n()
  const q = dist.quantiles
  const lo = domain?.[0] ?? Math.max(0, Number(q['0.05']) - 2)
  const hi = domain?.[1] ?? Number(q['0.95']) + 2
  const span = Math.max(hi - lo, 1e-6)
  const x = (v: number) => ((v - lo) / span) * 100

  const p05 = Number(q['0.05']), p25 = Number(q['0.25'])
  const p75 = Number(q['0.75']), p95 = Number(q['0.95'])

  return (
    <div className="rounded-xl layer-1 p-3.5 ring-1 ring-[var(--border)]">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="eyebrow">{label}</span>
        <span className="flex items-baseline gap-1">
          <span className="num text-3xl font-bold leading-none" style={{ color }}>
            {f.dec(dist.median)}
          </span>
          {unit && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
        </span>
      </div>

      <div className="relative h-7">
        {/* 90% range — the faint outer whisker */}
        <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full"
          style={{ left: `${x(p05)}%`, width: `${x(p95) - x(p05)}%`, background: `${color}28` }} />
        {/* 50% range — the solid inner box */}
        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ left: `${x(p25)}%`, width: `${x(p75) - x(p25)}%`, background: color,
                   transformOrigin: 'left' }}
          className="absolute top-1/2 h-2.5 -translate-y-1/2 rounded-full"
        />
        {/* median tick, with a 2px surface ring so it reads on top of the fill */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ left: `${x(dist.median)}%`, boxShadow: '0 0 0 2px var(--surface)' }}
          className="absolute top-1/2 h-5 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
        />
        {dist.line !== undefined && (
          <div className="absolute top-0 h-full border-l border-dashed border-[var(--text-muted)]"
            style={{ left: `${x(dist.line)}%` }}
            title={t.projection.lineTitle(dist.line)} />
        )}
      </div>

      <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--text-muted)' }}>
        <span className="num">{f.dec(p05)}</span>
        <span>{t.projection.outcomesBetween(f.dec(dist.low), f.dec(dist.high))}</span>
        <span className="num">{f.dec(p95)}</span>
      </div>

      {dist.line !== undefined && dist.probOver !== undefined && (
        <OverUnder line={dist.line} probOver={dist.probOver} color={color} />
      )}
    </div>
  )
}

function OverUnder({ line, probOver, color }: { line: number; probOver: number; color: string }) {
  const { t, f } = useI18n()
  const over = Math.round(probOver * 1000) / 10
  return (
    <div className="mt-3 flex items-center gap-2">
      <span className="num rounded-md layer-1 px-1.5 py-0.5 text-[11px] font-bold">
        {t.projection.lineLabel(line)}
      </span>
      <div className="flex h-5 flex-1 overflow-hidden rounded-md" role="img"
        aria-label={t.projection.overUnderAria(f.dec(over), f.dec(100 - over))}>
        <motion.div
          initial={{ width: 0 }} animate={{ width: `${over}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center justify-start pl-1.5 text-[10px] font-bold text-white"
          style={{ background: color }}
        >
          {over >= 22 && t.projection.over(f.dec(over, 0))}
        </motion.div>
        <div className="flex flex-1 items-center justify-end pr-1.5 text-[10px] font-bold"
          style={{ background: 'rgba(255,255,255,.10)', color: 'var(--text-2)' }}>
          {100 - over >= 22 && t.projection.under(f.dec(100 - over, 0))}
        </div>
      </div>
    </div>
  )
}

/** Win probability as one two-sided bar. Two teams, one 100% — a pie would
 *  need a legend to say the same thing in more space. */
export function WinProbBar({
  homeAbbr, awayAbbr, homeProb, homeColor = '#3B82F6', awayColor = '#E5484D',
}: {
  homeAbbr: string; awayAbbr: string; homeProb: number
  homeColor?: string; awayColor?: string
}) {
  const { f } = useI18n()
  const h = Math.round(homeProb * 1000) / 10
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-xs font-bold uppercase tracking-wider">
        <span style={{ color: homeColor }}>{homeAbbr} <span className="num">{f.dec(h)}%</span></span>
        <span style={{ color: awayColor }}><span className="num">{f.dec(100 - h)}%</span> {awayAbbr}</span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-[var(--border)]">
        <motion.div initial={{ width: 0 }} animate={{ width: `${h}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: homeColor }} />
        <div className="flex-1" style={{ background: awayColor }} />
      </div>
    </div>
  )
}

/** Why the projection moved. A diverging bar around zero: left is a drag on
 *  the number, right is a boost, and the neutral centre reads as "no effect". */
export function DriverBars({ drivers, unit = 'pts' }: { drivers: Driver[]; unit?: string }) {
  const { f } = useI18n()
  const max = Math.max(...drivers.map((d) => Math.abs(d.impact)), 0.5)
  return (
    <ul className="space-y-2.5">
      {drivers.map((d, i) => {
        const pctWidth = (Math.abs(d.impact) / max) * 48
        const positive = d.impact >= 0
        return (
          <li key={d.label}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="font-semibold">{d.label}</span>
              <span className="num font-bold"
                style={{ color: positive ? 'var(--good)' : 'var(--bad)' }}>
                {positive ? '+' : ''}{f.dec(d.impact, 2)} {unit}
              </span>
            </div>
            <div className="relative mt-1 h-2">
              <div className="absolute inset-y-0 left-1/2 w-px bg-[var(--border-strong)]" />
              <motion.div
                initial={{ width: 0 }} animate={{ width: `${pctWidth}%` }}
                transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                className={clsx('absolute top-0 h-2', positive ? 'rounded-r-md' : 'rounded-l-md')}
                style={{
                  left: positive ? '50%' : undefined,
                  right: positive ? undefined : '50%',
                  background: positive ? 'var(--good)' : 'var(--bad)',
                  opacity: 0.85,
                }}
              />
            </div>
            <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{d.detail}</p>
          </li>
        )
      })}
    </ul>
  )
}
