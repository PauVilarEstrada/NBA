import { Component, type ErrorInfo, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useI18n } from '@/i18n'

/** Shimmer block. Every async surface renders one of these at the size of the
 *  thing that is coming, so the layout does not jump when data lands. */
export function Skeleton({ className, rounded = 'rounded-lg' }: { className?: string; rounded?: string }) {
  return <div className={clsx('skeleton', rounded, className)} aria-hidden />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={clsx('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-3" rounded="rounded"
          {...{ style: { width: `${100 - i * 12}%` } }} />
      ))}
    </div>
  )
}

/** The page-level loading state. It names what is loading rather than showing a
 *  bare spinner — "Loading Nikola Jokić" tells the user the click registered. */
export function PageLoader({ label, sub }: { label?: string; sub?: string }) {
  const { t } = useI18n()
  return (
    <div className="flex flex-col items-center justify-center py-28 text-center" role="status" aria-live="polite">
      <BallSpinner />
      <p className="headline mt-6 text-2xl">{label ?? t.common.loading}</p>
      {sub && <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{sub}</p>}
    </div>
  )
}

export function BallSpinner({ size = 56 }: { size?: number }) {
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <motion.span className="absolute inset-0 rounded-full border-2 border-[var(--brand-lit)]/50"
        animate={{ rotate: 360 }} transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }} />
      <motion.span className="absolute inset-[6px] rounded-full border-2 border-[var(--accent-lit)]/60"
        animate={{ rotate: -360 }} transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }} />
      <motion.span
        className="block rounded-full bg-gradient-to-br from-[#E5484D] to-[#8A2418]
                   shadow-[0_0_18px_4px_rgba(229,72,77,.35)]"
        style={{ width: size * 0.3, height: size * 0.3 }}
        animate={{ y: [0, -size * 0.16, 0], scaleY: [1, 0.92, 1] }}
        transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
      />
    </span>
  )
}

/** Inline loading bar for a panel that is refreshing but already has content —
 *  the content stays readable and dims slightly instead of being replaced. */
export function RefreshBar({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden rounded-t-2xl">
      <motion.div className="h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[var(--brand-lit)] to-transparent"
        animate={{ x: ['-100%', '400%'] }}
        transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }} />
    </div>
  )
}

// --------------------------------------------------------- error boundary
interface BoundaryState { error: Error | null }

/**
 * Catches a render error anywhere below it and shows a readable panel instead
 * of a blank white page. Without this, one bad field in one component takes the
 * whole site down and the user just sees nothing — which is exactly the
 * "it doesn't load" failure mode.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallbackLabel?: string }, BoundaryState
> {
  state: BoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[NBA Vision] render error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <ErrorPanel
        message={this.state.error.message}
        fallbackLabel={this.props.fallbackLabel}
        onRetry={() => this.setState({ error: null })}
      />
    )
  }
}

/** The boundary's fallback UI. Split out of the class so it can read the active
 *  dictionary through the hook — a class component cannot. */
function ErrorPanel({ message, fallbackLabel, onRetry }: {
  message: string; fallbackLabel?: string; onRetry: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="glass mx-auto my-16 max-w-xl rounded-2xl p-8 text-center">
      <p className="headline text-3xl">{t.loading.turnover}</p>
      <p className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
        {fallbackLabel ?? t.loading.renderFailed}
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg px-3 py-2 text-left text-[11px]"
        style={{ background: 'var(--layer-1)', color: 'var(--text-muted)' }}>
        {message}
      </pre>
      <div className="mt-5 flex justify-center gap-2">
        <button onClick={onRetry}
          className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A] px-4 py-2
                     text-xs font-bold uppercase tracking-widest text-white">
          {t.common.tryAgain}
        </button>
        <button onClick={() => { window.location.href = '/' }}
          className="glass rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest">
          {t.common.backHome}
        </button>
      </div>
    </div>
  )
}

/** Card-shaped placeholder grid, used by the index pages. */
export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-14 w-[72px]" rounded="rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-20" rounded="rounded" />
              <Skeleton className="h-5 w-full" rounded="rounded" />
              <Skeleton className="h-3 w-24" rounded="rounded" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((__, j) => <Skeleton key={j} className="h-10" />)}
          </div>
        </div>
      ))}
    </div>
  )
}
