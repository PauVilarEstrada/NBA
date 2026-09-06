import clsx from 'clsx'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useI18n } from '@/i18n'

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('eyebrow', className)}>{children}</p>
}

export function SectionTitle({
  title, sub, right,
}: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="headline text-2xl sm:text-3xl">{title}</h2>
        {sub && <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Badge({
  children, tone = 'neutral', className, title,
}: {
  children: ReactNode
  tone?: 'neutral' | 'brand' | 'accent' | 'good' | 'bad'
  className?: string
  title?: string
}) {
  // Text colour is a mix against the page ground rather than a fixed tint, so
  // each badge keeps its contrast in both themes from one declaration.
  const tones: Record<string, string> = {
    neutral: 'layer-1 text-[var(--text-2)] ring-[var(--border)]',
    brand: 'bg-[color-mix(in_srgb,#3B82F6_14%,transparent)] text-[color-mix(in_srgb,#3B82F6_78%,var(--text))] ring-[color-mix(in_srgb,#3B82F6_38%,transparent)]',
    accent: 'bg-[color-mix(in_srgb,#C8102E_14%,transparent)] text-[color-mix(in_srgb,#E5484D_72%,var(--text))] ring-[color-mix(in_srgb,#C8102E_40%,transparent)]',
    good: 'bg-[color-mix(in_srgb,#0CA30C_14%,transparent)] text-[color-mix(in_srgb,#0CA30C_72%,var(--text))] ring-[color-mix(in_srgb,#0CA30C_34%,transparent)]',
    bad: 'bg-[color-mix(in_srgb,#D03B3B_14%,transparent)] text-[color-mix(in_srgb,#D03B3B_72%,var(--text))] ring-[color-mix(in_srgb,#D03B3B_34%,transparent)]',
  }
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]',
      'font-semibold uppercase tracking-wider ring-1', tones[tone], className)} title={title}>
      {children}
    </span>
  )
}

/** The honesty badge. Every projection screen shows where its number came
 *  from — a mocked number that is not labelled as mocked is a lie. */
export function SourceBadge({ source }: { source: 'model' | 'mock' }) {
  const { t } = useI18n()
  return source === 'model'
    ? <Badge tone="good">{t.source.trained}</Badge>
    : <Badge tone="brand" className="cursor-help" title={t.source.baselineTooltip}>
        {t.source.baseline}
      </Badge>
}

export function StatTile({
  label, value, unit, delta, tone = 'neutral', hint,
}: {
  label: string; value: ReactNode; unit?: string; delta?: number
  tone?: 'neutral' | 'brand' | 'accent'; hint?: string
}) {
  const { f } = useI18n()
  const ring = tone === 'brand' ? 'ring-[#3B82F6]/25'
    : tone === 'accent' ? 'ring-[#C8102E]/30' : 'ring-[var(--border)]'
  return (
    <div className={clsx('glass rounded-xl px-4 py-3 ring-1', ring)}>
      <p className="eyebrow">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="num text-2xl font-bold tracking-tight">{value}</span>
        {unit && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unit}</span>}
        {delta !== undefined && (
          <span className="num text-xs font-semibold"
            style={{ color: delta >= 0 ? 'var(--good)' : 'var(--bad)' }}>
            {f.signed(delta)}
          </span>
        )}
      </p>
      {hint && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options, value, onChange, size = 'md',
}: {
  options: Array<{ value: T; label: ReactNode }>
  value: T
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="tablist" className="inline-flex rounded-xl layer-1 p-1 ring-1 ring-[var(--border)]">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={clsx('relative rounded-lg font-semibold transition-colors',
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3.5 py-1.5 text-xs',
              active ? 'text-white' : 'text-[var(--text-2)] hover:text-white')}
          >
            {active && (
              <motion.span
                layoutId={`seg-${options.map((x) => x.value).join('')}`}
                className="absolute inset-0 rounded-lg bg-gradient-to-b from-[#3B82F6] to-[#1D428A]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10 whitespace-nowrap uppercase tracking-wide">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2.5 text-xs font-semibold uppercase tracking-wide"
      style={{ color: checked ? 'var(--text)' : 'var(--text-2)' }}
    >
      <span className={clsx('relative h-5 w-9 rounded-full transition-colors',
        checked ? 'bg-[#3B82F6]' : 'layer-3')}>
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
          className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow"
          style={{ left: checked ? 18 : 2 }}
        />
      </span>
      {label}
    </button>
  )
}

export function Slider({
  value, min, max, step = 1, onChange, label, format,
}: {
  value: number; min: number; max: number; step?: number
  onChange: (v: number) => void; label: string; format?: (v: number) => string
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between">
        <span className="eyebrow">{label}</span>
        <span className="num text-sm font-bold">{format ? format(value) : value}</span>
      </span>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-1.5 w-full cursor-pointer appearance-none rounded-full layer-3
                   accent-[#3B82F6] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                   [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                   [&::-webkit-slider-thumb]:bg-[#3B82F6]
                   [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(59,130,246,.2)]"
      />
    </label>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton rounded-lg', className)} />
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="glass flex flex-col items-center justify-center rounded-2xl px-6 py-16 text-center">
      <svg viewBox="0 0 24 24" className="mb-3 h-10 w-10 opacity-30" fill="none"
        stroke="currentColor" strokeWidth="1.4">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3C9 6.5 9 17.5 12 21" />
      </svg>
      <p className="headline text-xl">{title}</p>
      {hint && <p className="mt-1.5 max-w-sm text-sm" style={{ color: 'var(--text-2)' }}>{hint}</p>}
    </div>
  )
}
