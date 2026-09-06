import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { EmptyState, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CardGridSkeleton } from '@/components/ui/Loading'
import { PlayerCard } from '@/components/player/PlayerCard'
import { api, SEASON_LABEL } from '@/lib/api'
import * as engine from '@/lib/engine'
import { useI18n } from '@/i18n'
import type { Player } from '@/types'

/** Sort keys only — the labels are looked up from the dictionary at render. */
const SORTS = ['pts', 'reb', 'ast', 'per', 'vorp', 'marketPrice'] as const
type SortKey = (typeof SORTS)[number]

const POSITIONS = ['All', 'PG', 'SG', 'SF', 'PF', 'C'] as const

export default function Players() {
  const { t } = useI18n()
  const [all, setAll] = useState<Player[] | null>(null)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortKey>('pts')
  const [conference, setConference] = useState<'all' | 'East' | 'West'>('all')
  const [position, setPosition] = useState<(typeof POSITIONS)[number]>('All')
  const [limit, setLimit] = useState(48)

  useEffect(() => { api.searchPlayers('', 500).then(setAll) }, [])

  const results = useMemo(() => {
    if (!all) return []
    const term = query.trim().toLowerCase()
    return all
      .filter((p) => !term
        || p.name.toLowerCase().includes(term)
        || p.team.toLowerCase() === term
        || p.position.toLowerCase() === term)
      .filter((p) => conference === 'all' || engine.getTeam(p.teamId)?.conference === conference)
      .filter((p) => position === 'All' || p.position === position)
      .sort((a, b) => (b[sort] as number) - (a[sort] as number))
  }, [all, query, sort, conference, position])

  useEffect(() => { setLimit(48) }, [query, sort, conference, position])

  const sortLabels: Record<SortKey, string> = {
    pts: t.stat.pts,
    reb: t.stat.reb,
    ast: t.stat.ast,
    per: t.stat.per,
    vorp: t.stat.vorp,
    marketPrice: t.players.sortValue,
  }

  return (
    <PageTransition>
      <SectionTitle
        title={t.players.title}
        sub={all
          ? t.players.sub(results.length, all.length, SEASON_LABEL)
          : t.players.subLoading(SEASON_LABEL)}
      />

      {/* Filters live in one row above the results, never interleaved with them. */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.players.searchPlaceholder}
            className="glass w-full rounded-xl px-4 py-3 pl-10 text-sm outline-none
                       placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[#3B82F6]/50"
          />
          <svg viewBox="0 0 24 24"
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 opacity-45"
            fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
        </div>
        <Segmented value={conference} onChange={setConference}
          options={[{ value: 'all', label: t.common.league }, { value: 'East', label: t.common.east }, { value: 'West', label: t.common.west }]} />
        <Segmented size="sm" value={position} onChange={setPosition}
          options={POSITIONS.map((p) => ({ value: p, label: p === 'All' ? t.common.all : p }))} />
        <Segmented value={sort} onChange={setSort}
          options={SORTS.map((s) => ({ value: s, label: sortLabels[s] }))} />
      </div>

      {!all ? (
        <CardGridSkeleton count={12} />
      ) : results.length === 0 ? (
        <EmptyState title={t.players.emptyTitle} hint={t.players.emptyHint} />
      ) : (
        <>
          <motion.div variants={stagger} initial="hidden" animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {results.slice(0, limit).map((p) => (
              <motion.div key={p.playerId} variants={riseItem} layout>
                <PlayerCard player={p} />
              </motion.div>
            ))}
          </motion.div>

          {limit < results.length && (
            <button onClick={() => setLimit((n) => n + 48)}
              className="glass glass-hover mt-5 w-full rounded-xl py-3 text-xs font-bold uppercase tracking-widest">
              {t.common.showMore(results.length - limit)}
            </button>
          )}
        </>
      )}
    </PageTransition>
  )
}
