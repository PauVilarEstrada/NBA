import { motion } from 'framer-motion'
import clsx from 'clsx'
import type { Franchise, Honour } from '@/types'

/**
 * The trophy case.
 *
 * Honours are the part of a player's record that a stat table cannot carry, and
 * they are what people actually argue about. Rendered as objects — rings,
 * trophies, banners — because that is how the sport itself displays them, and
 * because a list of "NBA Champion: 4" reads like a spreadsheet row.
 */

const ICONS: Record<string, (c: string) => JSX.Element> = {
  ring: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <circle cx="12" cy="14.5" r="6.2" />
      <path d="M8.4 9 12 3l3.6 6" />
      <path d="m9.6 6 2.4 3 2.4-3" opacity=".6" />
    </svg>
  ),
  trophy: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5A2.5 2.5 0 0 1 17 10" />
      <path d="M12 14v4M9 21h6M10 18h4" />
    </svg>
  ),
  mvp: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <circle cx="12" cy="9" r="5.2" />
      <path d="m9 13.4-1.4 7.1L12 18l4.4 2.5L15 13.4" />
      <path d="m12 6.4.9 1.9 2 .3-1.5 1.4.4 2-1.8-1-1.8 1 .4-2L9.1 8.6l2-.3.9-1.9Z" opacity=".7" />
    </svg>
  ),
  shield: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <path d="M12 3 4.5 6v6c0 4.4 3.1 8.3 7.5 9.4 4.4-1.1 7.5-5 7.5-9.4V6L12 3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </svg>
  ),
  star: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9L12 3.5Z" />
    </svg>
  ),
  arrow: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <path d="M4 18 10 11l4 4 6-8" /><path d="M15 7h5v5" />
    </svg>
  ),
  bench: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <path d="M4 10h16M5 10v9M19 10v9M4 14h16" />
    </svg>
  ),
  clock: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.4" /><path d="M12 7v5.4l3.4 2" />
    </svg>
  ),
  ball: (c) => (
    <svg viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.4 12h17.2M12 3.4c2.8 3.4 2.8 13.8 0 17.2M12 3.4c-2.8 3.4-2.8 13.8 0 17.2" />
    </svg>
  ),
}

const TONE: Record<string, string> = {
  ring: '#D4AF37', trophy: '#D4AF37', mvp: '#E5484D', shield: '#12A594',
  star: '#3B82F6', arrow: '#8B7BE8', bench: '#BC8000', clock: '#E255A1', ball: '#BC8000',
}

export function TrophyCase({ honours, compact = false }: { honours: Honour[]; compact?: boolean }) {
  if (!honours.length) {
    return (
      <p className="rounded-xl px-4 py-6 text-center text-sm"
        style={{ background: 'var(--layer-1)', color: 'var(--text-muted)' }}>
        No major individual honours yet.
      </p>
    )
  }
  return (
    <ul className={clsx('grid gap-2.5', compact ? 'grid-cols-2' : 'sm:grid-cols-2')}>
      {honours.map((h, i) => {
        const tone = TONE[h.icon] ?? '#3B82F6'
        const icon = ICONS[h.icon] ?? ICONS.star
        return (
          <motion.li key={h.label}
            initial={{ opacity: 0, y: 12, rotateX: -20 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-xl p-3 ring-1"
            style={{
              background: `linear-gradient(140deg, color-mix(in srgb, ${tone} 18%, transparent), var(--layer-1) 65%)`,
              boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 28%, transparent)`,
            }}
          >
            <span aria-hidden className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-25 blur-xl"
              style={{ background: tone }} />
            <div className="relative flex items-center gap-2.5">
              <span className="h-8 w-8 shrink-0">{icon(tone)}</span>
              <div className="min-w-0">
                <p className="flex items-baseline gap-1.5">
                  <span className="num text-2xl font-bold leading-none" style={{ color: tone }}>
                    {h.count}×
                  </span>
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider">
                    {h.label}
                  </span>
                </p>
                <p className="num mt-0.5 truncate text-[10px]" style={{ color: 'var(--text-muted)' }}
                  title={h.years.join(', ')}>
                  {h.years.length > 6
                    ? `${h.years[0]}–${h.years.at(-1)}`
                    : h.years.join(' · ')}
                </p>
              </div>
            </div>
          </motion.li>
        )
      })}
    </ul>
  )
}

/**
 * Championship banners for a franchise. Rendered as hanging banners in the team
 * colours — the rafters, which is where a fan looks for exactly this.
 */
export function BannerRafters({
  franchise, primary, secondary, abbr,
}: { franchise: Franchise; primary: string; secondary: string; abbr: string }) {
  const titles = franchise.championships ?? []
  const aba = franchise.abaChampionships ?? []
  if (!titles.length && !aba.length) {
    return (
      <div className="rounded-xl px-4 py-8 text-center" style={{ background: 'var(--layer-1)' }}>
        <p className="headline text-2xl" style={{ color: 'var(--text-muted)' }}>Rafters empty</p>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          No NBA championship yet{franchise.founded ? ` since ${franchise.founded}` : ''}.
        </p>
      </div>
    )
  }
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {titles.map((year, i) => (
          <motion.div key={year}
            initial={{ opacity: 0, y: -22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: i * 0.035 }}
            title={franchise.notes?.[String(year)] ?? `${abbr} champions`}
            className="relative w-[62px] pb-3"
          >
            {/* the banner: a rectangle with a notched bottom edge */}
            <div className="relative flex h-[86px] flex-col items-center justify-between rounded-t-sm px-1 pt-2 pb-4 text-center"
              style={{
                background: `linear-gradient(180deg, ${primary}, color-mix(in srgb, ${primary} 70%, #000))`,
                clipPath: 'polygon(0 0, 100% 0, 100% 86%, 50% 100%, 0 86%)',
                boxShadow: `0 6px 18px -8px ${primary}`,
              }}>
              <span className="text-[8px] font-bold uppercase leading-none tracking-widest"
                style={{ color: secondary }}>
                {abbr}
              </span>
              <span className="num text-[15px] font-bold leading-none text-white">{year}</span>
              <span className="text-[7px] font-bold uppercase leading-none tracking-widest"
                style={{ color: secondary }}>
                Champs
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      {aba.length > 0 && (
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Plus {aba.length} ABA championship{aba.length > 1 ? 's' : ''} ({aba.join(', ')}).
        </p>
      )}
      {Object.keys(franchise.notes ?? {}).length > 0 && (
        <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Banners marked with an earlier city were won under a previous name — the NBA counts them
          for the franchise.
        </p>
      )}
    </div>
  )
}
