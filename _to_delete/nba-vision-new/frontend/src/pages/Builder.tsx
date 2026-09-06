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
import { atLeast, dec, money } from '@/lib/format'
import type { PricedPlayer, SimResult, Team } from '@/types'

const PRESETS = [10_000_000, 20_000_000, 50_000_000, 100_000_000]
const SORTS = [
  { value: 'cost', label: 'Priciest' },
  { value: 'efficiency', label: 'Best value' },
  { value: 'pts', label: 'Points' },
] as const

type Phase = 'build' | 'loading' | 'watch'

export default function Builder() {
  const b = useBuilder()
  const [pool, setPool] = useState<PricedPlayer[]>([])
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('efficiency')
  const [phase, setPhase] = useState<Phase>('build')
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<SimProgress>({ stage: 'Starting', pct: 0 })

  useEffect(() => { api.fantasyPool(b.budget).then(setPool) }, [b.budget])

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
      setError(e instanceof Error ? e.message : 'Simulation failed')
      setPhase('build')
    }
  }

  return (
    <PageTransition>
      <SectionTitle title="Build your team"
        sub="Pick a budget, sign a roster, and play it against a real NBA team. Anyone you sign leaves their real roster for the duration of the game."
        right={phase !== 'build' ? (
          <button onClick={() => { setPhase('build'); setResult(null) }}
            className="glass glass-hover rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest">
            Back to the roster
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
              stage={progress.stage} pct={progress.pct} isPlayoffs={b.isPlayoffs} />
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
                  <p className="eyebrow mb-2">Budget</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((p) => (
                      <button key={p} onClick={() => b.setBudget(p)}
                        className={clsx('rounded-xl px-3.5 py-2 text-sm font-bold transition-all',
                          b.budget === p
                            ? 'bg-gradient-to-br from-[#3B82F6] to-[#1D428A] text-white shadow-glow'
                            : 'glass hover-layer-2')}>
                        {money(p)}
                      </button>
                    ))}
                    <label className="glass flex items-center gap-1.5 rounded-xl px-3 py-2">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Custom $</span>
                      <input
                        type="number" min={5} max={500} step={5}
                        value={Math.round(b.budget / 1_000_000)}
                        onChange={(e) => b.setBudget(Math.max(5, Number(e.target.value)) * 1_000_000)}
                        className="num w-16 bg-transparent text-sm font-bold outline-none" />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>M</span>
                    </label>
                  </div>
                </div>
                <div className="min-w-[220px] flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between text-xs">
                    <span style={{ color: 'var(--text-2)' }}>
                      {b.roster.length}/{ROSTER_MAX} signed
                    </span>
                    <span className="num font-bold"
                      style={{ color: remaining < 0 ? 'var(--bad)' : 'var(--text)' }}>
                      {money(remaining)} left
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
                    Clear
                  </button>
                )}
              </div>
              <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Prices are the league's real market values, rescaled so the most expensive player
                always costs about 38% of whatever budget you choose. Changing the budget resets
                the roster, because everyone is re-priced.
              </p>
            </GlassCard>

            <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
              {/* ------------------------------------------------------ pool */}
              <div>
                <div className="mb-3 flex flex-wrap gap-3">
                  <input value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter by name, team or position…"
                    className="glass min-w-[200px] flex-1 rounded-xl px-4 py-2.5 text-sm outline-none
                               placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[#3B82F6]/50" />
                  <Segmented value={sort} onChange={setSort} options={SORTS.map((s) => ({ ...s }))} />
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
                              {team.abbr} · {p.position} · {dec(p.pts)} PPG
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="num text-sm font-bold" style={{ color: owned ? '#3B82F6' : undefined }}>
                              {money(p.cost)}
                            </p>
                            <p className="num text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {p.costPct}% of cap
                            </p>
                          </div>
                        </div>
                        {owned && (
                          <span className="absolute right-2 top-2 rounded-full bg-[#3B82F6] px-1.5 py-0.5
                                           text-[9px] font-bold uppercase tracking-wider text-white">
                            Signed
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
                  <SectionTitle title="Your lineup"
                    sub={`${ROSTER_MIN}-${ROSTER_MAX} players`} />
                  {b.roster.length === 0 ? (
                    <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                      Click players on the left to sign them.
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
                              <span className="num text-xs font-bold">{money(p.cost)}</span>
                              <button onClick={() => b.remove(p.playerId)} aria-label={`Release ${p.name}`}
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
                    <TeamPicker value={opponent} onChange={(t) => b.setOpponent(t.abbr)} label="Opponent" />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <Toggle checked={b.isPlayoffs} onChange={b.setPlayoffs} label="Playoff game" />
                      <Toggle checked={b.userIsHome} onChange={b.setUserIsHome} label="You host" />
                    </div>

                    {poachedFromOpponent.length > 0 && (
                      <div className="rounded-xl bg-[#C8102E]/12 px-3 py-2.5 ring-1 ring-[#C8102E]/30">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-[#FF9AA6]">
                          Signed away from {opponent.abbr}
                        </p>
                        <p className="mt-1 text-xs" style={{ color: 'var(--text-2)' }}>
                          {poachedFromOpponent.map((p) => p.name).join(', ')} will not play for them.
                          Their ratings drop accordingly.
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
                        ? `Sign ${ROSTER_MIN - b.roster.length} more`
                        : remaining < 0 ? 'Over budget'
                        : `Play ${opponent?.abbr ?? ''}`}
                    </button>
                  </div>
                </GlassCard>

                {opponent && (
                  <GlassCard className="mt-3">
                    <p className="eyebrow mb-2">Who you are facing</p>
                    <div className="flex items-center gap-2.5">
                      <TeamLogo teamId={opponent.teamId} abbr={opponent.abbr} size={40} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-lg font-bold leading-tight">{opponent.fullName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {opponent.wins}-{opponent.losses} · OFF {dec(opponent.offRating)} · DEF {dec(opponent.defRating)}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2.5 space-y-1 text-xs">
                      {engine.roster(opponent.teamId).map((p) => (
                        <li key={p.playerId} className={clsx('flex justify-between gap-2',
                          signedIds.has(p.playerId) && 'line-through opacity-45')}>
                          <span className="truncate">{p.name}</span>
                          <span className="num">{dec(p.pts)}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      The rest of their rotation is filled with replacement-level players — the demo
                      dataset carries the top of each roster, not all 15 contracts.
                    </p>
                  </GlassCard>
                )}
              </div>
            </div>

            {pool.length === 0 && <EmptyState title="Loading the player pool…" />}
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}
