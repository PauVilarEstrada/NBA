import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { EmptyState, SectionTitle, Segmented, Toggle } from '@/components/ui/Bits'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { TeamPicker } from '@/components/ui/Pickers'
import { GameLoader } from '@/components/sim/GameLoader'
import { GameBroadcast } from '@/components/sim/GameBroadcast'
import { ROSTER_MAX, ROSTER_MIN, useBuilder } from '@/store/builder'
import { api, type SimProgress } from '@/lib/api'
import * as engine from '@/lib/engine'
import { atLeast } from '@/lib/format'
import { CAP } from '@/lib/cap'
import { useI18n } from '@/i18n'
import type { PricedPlayer, SimResult, Team } from '@/types'

const PRESETS = [80_000_000, 120_000_000, 180_000_000, 250_000_000]
const SORTS = ['cost', 'efficiency', 'pts'] as const
type Sort = (typeof SORTS)[number]

type Phase = 'build' | 'loading' | 'watch'

export default function Builder() {
  const { t, f } = useI18n()
  const b = useBuilder()
  const [pool, setPool] = useState<PricedPlayer[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<Sort>('efficiency')
  const [phase, setPhase] = useState<Phase>('build')
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SimProgress>({ stage: 'Starting', pct: 0 })

  useEffect(() => { api.fantasyPool(b.budget).then(setPool) }, [b.budget])

  // Built here rather than at module scope so the labels can read the dictionary.
  const sortOptions: Array<{ value: Sort; label: string }> = [
    { value: 'cost', label: t.builder.sortPriciest },
    { value: 'efficiency', label: t.builder.sortBestValue },
    { value: 'pts', label: t.stat.pts },
  ]

  /** The worker reports its stage in English; map it onto the dictionary. */
  const stageLabel = (stage: string): string => {
    const replay = /^Replaying the game (\d+) times$/.exec(stage)
    if (replay) return t.sim.stageReplay(Number(replay[1]))
    switch (stage) {
      case 'Locking rosters': return t.sim.stageRosters
      case 'Checking the injury report': return t.sim.stageInjury
      case 'Allocating minutes by usage': return t.sim.stageMinutes
      case 'Running the possession model': return t.sim.stagePossession
      case 'Warming up': return t.sim.stageWarmUp
      case 'Starting': return t.sim.stageStarting
      default: return stage
    }
  }

  const opponent = engine.getTeam(b.opponent) as Team
  const signedIds = useMemo(() => new Set(b.roster.map((p) => p.playerId)), [b.roster])

  /** Players the user has taken *from the opponent* — the rule that makes the
   *  mode interesting: signing them weakens the team you are about to face. */
  const poachedFromOpponent = b.roster.filter((p) => p.teamId === opponent?.teamId)

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return pool
      .filter((p) => !term || p.name.toLowerCase().includes(term) || p.team.toLowerCase() === term
        || p.position.toLowerCase() === term)
      .sort((a, b2) => (b2[sort] as number) - (a[sort] as number))
      .slice(0, 48)
  }, [pool, query, sort])

  const spent = b.spent()
  const remaining = b.remaining()
  const canSim = b.roster.length >= ROSTER_MIN && remaining >= 0 && !!opponent

  /** The simulation runs in a Web Worker. That is what keeps this click from
   *  freezing the page: a game plus a 200-run sweep is far too much synchronous
   *  work for the main thread, and React never gets to paint the loader. */
  const run = async (nextSeed = b.seed) => {
    if (!canSim) return
    setError(null)
    setProgress({ stage: 'Locking rosters', pct: 4 })
    setPhase('loading')
    try {
      const r = await atLeast(api.simulate({
        budget: b.budget,
        roster: b.roster.map((p) => ({ playerId: p.playerId, cost: p.cost })),
        opponent: b.opponent, seed: nextSeed, isPlayoffs: b.isPlayoffs,
        userIsHome: b.userIsHome, monteCarloRuns: 200,
      }, setProgress), 1800)
      setResult(r)
      setPhase('watch')
    } catch (e) {
      setError(e instanceof Error ? e.message : t.builder.simFailed)
      setPhase('build')
    }
  }

  return (
    <PageTransition>
      <SectionTitle title={t.builder.title} sub={t.builder.sub}
        right={phase !== 'build' ? (
          <button onClick={() => { setPhase('build'); setResult(null) }}
            className="glass glass-hover rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest">
            {t.builder.backToRoster}
          </button>
        ) : undefined} />

      <AnimatePresence mode="wait">
        {phase === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameLoader
              homeAbbr={b.userIsHome ? 'YOU' : opponent?.abbr ?? ''}
              homeId={b.userIsHome ? undefined : opponent?.teamId}
              awayAbbr={b.userIsHome ? opponent?.abbr ?? '' : 'YOU'}
              awayId={b.userIsHome ? opponent?.teamId : undefined}
              stage={stageLabel(progress.stage)} pct={progress.pct} isPlayoffs={b.isPlayoffs} />
          </motion.div>
        )}

        {phase === 'watch' && result && (
          <motion.div key="watch" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}>
            <GameBroadcast result={result}
              onReplay={() => { const s = b.seed + 1; b.setSeed(s); run(s) }} />
          </motion.div>
        )}

        {phase === 'build' && (
          <motion.div key="build" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* ------------------------------------------------------ budget */}
            <GlassCard className="mb-5">
              <div className="flex flex-wrap items-end gap-5">
                <div>
                  <p className="eyebrow mb-2">{t.builder.budget}</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => b.setBudget(p)}
                        className={clsx('rounded-xl px-3.5 py-2 text-sm font-bold transition-all',
                          b.budget === p
                            ? 'bg-gradient-to-br from-[#3B82F6] to-[#1D428A] text-white shadow-glow'
                            : 'glass hover-layer-2')}>
                        {f.money(p)}
                      </button>
                    ))}
                    <label className="glass flex items-center gap-1.5 rounded-xl px-3 py-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {t.builder.custom} $
                      </span>
                      <input
                        type="number" min={20} max={600} step={5}
                        value={Math.round(b.budget / 1_000_000)}
                        onChange={(e) => b.setBudget(Math.max(20, Number(e.target.value)) * 1_000_000)}
                        className="num w-16 bg-transparent text-sm font-bold outline-none" />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>M</span>
                    </label>
                  </div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span style={{ color: 'var(--text-2)' }}>
                      {t.builder.signedCount(b.roster.length, ROSTER_MAX)}
                    </span>
                    <span className="num font-bold"
                      style={{ color: remaining < 0 ? 'var(--bad)' : 'var(--text)' }}>
                      {t.builder.left(f.money(remaining))}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full layer-2">
                    <motion.div
                      animate={{ width: `${Math.min(100, (spent / b.budget) * 100)}%` }}
                      transition={{ type: 'spring', stiffness: 200, damping: 28 }}
                      className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#C8102E]" />
                  </div>
                </div>
                {b.roster.length > 0 && (
                  <button onClick={b.clear}
                    className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-widest
                               ring-1 ring-[var(--border)] transition-colors hover-layer-2"
                    style={{ color: 'var(--text-2)' }}>
                    {t.common.clear}
                  </button>
                )}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {t.builder.priceNote(f.money(CAP, false))}
              </p>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              {/* ------------------------------------------------------ pool */}
              <div>
                <div className="mb-3 flex flex-wrap gap-3">
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.builder.filterPlaceholder}
                    className="glass min-w-[200px] flex-1 rounded-xl px-4 py-2.5 text-sm outline-none
                               placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[#3B82F6]/50" />
                  <Segmented value={sort} onChange={setSort} options={sortOptions} />
                </div>

                <motion.div variants={stagger} initial="hidden" animate="show"
                  className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((p) => {
                    const team = engine.getTeam(p.teamId)!
                    const owned = signedIds.has(p.playerId)
                    const tooDear = !owned && p.cost > remaining
                    const full = !owned && b.roster.length >= ROSTER_MAX
                    return (
                      <motion.button key={p.playerId} variants={riseItem} layout
                        onClick={() => (owned ? b.remove(p.playerId) : b.add(p))}
                        disabled={tooDear || full}
                        className={clsx('glass sheen relative overflow-hidden rounded-xl p-3 text-left transition-all',
                          owned && 'ring-2 ring-[#3B82F6]',
                          (tooDear || full) && 'cursor-not-allowed opacity-40',
                          !owned && !tooDear && !full && 'glass-hover')}
                        style={{ background: `linear-gradient(150deg, ${team.primaryColor}22, var(--surface-glass) 60%)` }}>
                        <div className="flex items-center gap-2.5">
                          <PlayerAvatar playerId={p.playerId} name={p.name}
                            color={team.primaryColor} size={48} ring={false} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-base font-bold leading-tight">{p.name}</p>
                            <p className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              <TeamLogo teamId={team.teamId} abbr={team.abbr} size={12} />
                              {team.abbr} · {p.position} · {f.dec(p.pts)} {t.abbr.ppg}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="num text-sm font-bold" style={{ color: owned ? '#3B82F6' : undefined }}>
                              {f.money(p.cost)}
                            </p>
                            <p className="num text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {t.builder.ofBudget(f.dec(p.costPct, Number.isInteger(p.costPct) ? 0 : 1))}
                            </p>
                          </div>
                        </div>
                        {owned && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#3B82F6] px-1.5 py-0.5
                                           text-[9px] font-bold uppercase tracking-wider text-white">
                            {t.common.signed}
                          </span>
                        )}
                      </motion.button>
                    )
                  })}
                </motion.div>
              </div>

              {/* --------------------------------------------------- roster */}
              <div className="lg:sticky lg:top-20 lg:self-start">
                <GlassCard accent="#C8102E">
                  <SectionTitle title={t.builder.yourLineup}
                    sub={t.builder.rosterRange(ROSTER_MIN, ROSTER_MAX)} />
                  {b.roster.length === 0 ? (
                    <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      {t.builder.clickToSign}
                    </p>
                  ) : (
                    <ul className="space-y-1.5">
                      <AnimatePresence initial={false}>
                        {b.roster.map((p) => {
                          const team = engine.getTeam(p.teamId)!
                          return (
                            <motion.li key={p.playerId} layout
                              initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -12 }}
                              className="flex items-center gap-2 rounded-lg layer-1 px-2 py-1.5">
                              <PlayerAvatar playerId={p.playerId} name={p.name}
                                color={team.primaryColor} size={30} ring={false} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-semibold">{p.name}</span>
                                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                  {p.position} · {team.abbr}
                                </span>
                              </span>
                              <span className="num text-xs font-bold">{f.money(p.cost)}</span>
                              <button onClick={() => b.remove(p.playerId)}
                                aria-label={t.builder.release(p.name)}
                                className="grid h-6 w-6 shrink-0 place-items-center rounded-md
                                           transition-colors hover:bg-[var(--bad)]/25">
                                ×
                              </button>
                            </motion.li>
                          )
                        })}
                      </AnimatePresence>
                    </ul>
                  )}

                  <div className="mt-4 space-y-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                    <TeamPicker value={opponent} onChange={(team) => b.setOpponent(team.abbr)}
                      label={t.builder.opponent} />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Toggle checked={b.isPlayoffs} onChange={b.setPlayoffs}
                        label={t.common.playoffGame} />
                      <Toggle checked={b.userIsHome} onChange={b.setUserIsHome}
                        label={t.builder.youHost} />
                    </div>

                    {poachedFromOpponent.length > 0 && (
                      <div className="rounded-xl bg-[#C8102E]/12 px-3 py-2.5 ring-1 ring-[#C8102E]/30">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF9AA6]">
                          {t.builder.signedAwayFrom(opponent.abbr)}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-2)' }}>
                          {t.builder.signedAwayNote(
                            poachedFromOpponent.map((p) => p.name).join(', '), opponent.abbr)}
                        </p>
                      </div>
                    )}

                    {error && <p className="text-xs" style={{ color: 'var(--bad)' }}>{error}</p>}

                    <button onClick={() => run()} disabled={!canSim}
                      className={clsx('w-full rounded-xl py-3.5 text-sm font-bold uppercase tracking-widest transition-all',
                        canSim
                          ? 'bg-gradient-to-br from-[#C8102E] to-[#7A0A1C] text-white shadow-glow-red hover:-translate-y-0.5 animate-pulseGlow'
                          : 'cursor-not-allowed layer-2 text-[var(--text-muted)] ring-1 ring-[var(--border)]')}>
                      {b.roster.length < ROSTER_MIN
                        ? t.builder.signMore(ROSTER_MIN - b.roster.length)
                        : remaining < 0 ? t.builder.overBudget
                        : t.builder.play(opponent?.abbr ?? '')}
                    </button>
                  </div>
                </GlassCard>

                {opponent && (
                  <GlassCard className="mt-3">
                    <p className="eyebrow mb-2">{t.builder.facingTitle}</p>
                    <div className="flex items-center gap-2.5">
                      <TeamLogo teamId={opponent.teamId} abbr={opponent.abbr} size={40} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-bold leading-tight">{opponent.fullName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {opponent.wins}-{opponent.losses} · {t.abbr.off} {f.dec(opponent.offRating)}
                          {' · '}{t.abbr.def} {f.dec(opponent.defRating)}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1 text-xs">
                      {engine.roster(opponent.teamId).map((p) => (
                        <li key={p.playerId} className={clsx('flex justify-between gap-2',
                          signedIds.has(p.playerId) && 'line-through opacity-45')}>
                          <span className="truncate">{p.name}</span>
                          <span className="num">{f.dec(p.pts)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {t.builder.fillerNote}
                    </p>
                  </GlassCard>
                )}
              </div>
            </div>

            {pool.length === 0 && <EmptyState title={t.builder.loadingPool} />}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
