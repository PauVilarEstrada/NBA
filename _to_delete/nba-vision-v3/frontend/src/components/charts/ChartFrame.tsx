import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { useChartTokens } from '@/lib/palette'

export interface SeriesDef { key: string; label: string; color: string }

/**
 * Every chart in the app is wrapped in this.
 *
 * It guarantees three things the design rules require and that are easy to
 * forget per-chart: a legend whenever there is more than one series, a table
 * view so identity is never carried by colour alone, and a horizontal scroll
 * container so a wide chart never makes the page scroll sideways.
 */
export function ChartFrame({
  title, sub, series, children, table, height = 260, right,
}: {
  title: string
  sub?: string
  series?: SeriesDef[]
  children: ReactNode
  table?: { columns: string[]; rows: Array<Array<string | number>> }
  height?: number
  right?: ReactNode
}) {
  const [showTable, setShowTable] = useState(false)
  return (
    <figure className="glass rounded-2xl p-4 sm:p-5">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold uppercase tracking-wide">{title}</h3>
          {sub && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className="flex items-center gap-3">
          {right}
          {table && (
            <button
              onClick={() => setShowTable((v) => !v)}
              className="rounded-lg px-2 py-1 text-[11px] font-semibold uppercase tracking-wider
                         ring-1 ring-[var(--border)] transition-colors hover-layer-1"
              style={{ color: 'var(--text-2)' }}
            >
              {showTable ? 'Chart' : 'Table'}
            </button>
          )}
        </div>
      </figcaption>

      {series && series.length > 1 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {series.map((s) => (
            <li key={s.key} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-2)' }}>
              <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </li>
          ))}
        </ul>
      )}

      {showTable && table ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {table.columns.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-b last:border-0" style={{ borderColor: 'var(--border)' }}>
                  {r.map((cell, j) => (
                    <td key={j} className={clsx('px-2 py-1.5', j > 0 && 'num')}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto" style={{ height }}>{children}</div>
      )}
    </figure>
  )
}

/** Shared tooltip shell — one look for every chart type. */
export function TooltipBox({ title, rows }: {
  title: string; rows: Array<{ label: string; value: string; color?: string }>
}) {
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center gap-2">
          {r.color && <span aria-hidden className="h-2 w-2 rounded-sm" style={{ background: r.color }} />}
          <span style={{ color: 'var(--text-2)' }}>{r.label}</span>
          <span className="num ml-auto font-bold">{r.value}</span>
        </p>
      ))}
    </div>
  )
}

/** Axis styling follows the active theme, so a light-mode chart is stepped
 *  for a white surface rather than being a washed-out dark chart. */
export function useAxis() {
  const t = useChartTokens()
  return { stroke: t.axis, tick: { fill: t.tick, fontSize: 11 }, grid: t.grid, surface: t.surface }
}
