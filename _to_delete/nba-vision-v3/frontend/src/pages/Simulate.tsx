import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, Segmented, Toggle } from '@/components/ui/Bits'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { TeamPicker } from '@/components/ui/Pickers'
import { GameLoader } from '@/components/sim/GameLoader'
import { GameBroadcast } from '@/components/sim/GameBroadcast'
import { WinProbBar } from '@/components/charts/Projection'
import { useChartTokens } from '@/lib/palette'
import { api, type SimProgress } from '@/lib/api'
import * as engine from '@/lib/engine'
import { atLeast, dec, signed } from '@/lib/format'
import type { Player, SimResult, Team } from '@/types'

type Phase = 'setup' | 'loading' | 'watch'

/**
 * Simulate a real matchup.
 *
 * The point of the injury toggles is that sitting a player is not cosmetic: his
 * minutes redistribute to the players behind him, the team's offensive and
 * defensive ratings move by what he actually contributes, and the possession
 * engine plays the game with the roster that is left. Rule out a star and you
 * can watch the difference, not just read a smaller number.
 */
export default function Simulate() {
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [home, setHome] = useState<Team | null>(
    () => engine.getTeam(params.get('home') ?? 'BOS') ?? null)
  const [away, setAway] = useState<Team | null>(
    () => engine.getTeam(params.get('away') ?? 'LAL') ?? null)
  const [out, setOut] = useState<Set<number>>(new Set())
  const [isPlayoffs, setIsPlayoffs] = useState(false)
  const [seed, setSeed] = useState(11)
  const [runs, setRuns] = useState(200)
  const [phase, setPhase] = useState<Phase>('setup')
  const [progress, setProgress] = useState<SimProgress>({ stage: 'Starting', pct: 0 })
  const [result, setResult] = useState<SimResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const next = new URLSearchParams()
    if (home) next.set('home', home.abbr)
    if (away) next.set('away', away.abbr)
    setParams(next, { replace: true })
  }, [home, away, setParams])

  // Ruling a player out only makes sense for the two teams on the floor.
  useEffect(() => {
    if (!home || !away) return
    setOut((prev) => {
      const valid = new Set([...engine.roster(home.abbr), ...engine.roster(away.abbr)]
        .map((p) => p.playerId))
      return new Set([...prev].filter((id) => valid.has(id)))
    })
  }, [home, away])

  const sameTeam = home && away && home.abbr === away.abbr
  const canRun = Boolean(home && away && !sameTeam)

  const preview = useMemo(() => {
    if (!home || !away || sameTeam) return null
    return engine.predictTeam(home.abbr, away.abbr, { isPlayoffs, series: isPlayoffs })
  }, [home, away, isPlayoffs, sameTeam])

  const toggleOut = (id: number) =>
    setOut((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const run = async (nextSeed = seed) => {
    if (!canRun) return
    setError(null)
    setProgress({ stage: 'Checking the injury report', pct: 4 })
    setPhase('loading')
    try {
      const r = await atLeast(api.simulateReal({
        home: home!.abbr, away: away!.abbr,
        excluded: [...out], seed: nextSeed, isPlayoffs, monteCarloRuns: runs,
      }, setProgress), 1800)
      setResult(r)
      setPhase('watch')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed')
      setPhase('setup')
    }
  }

  return (
    <PageTransition>
      <SectionTitle
        title="Simulate a game"
        sub="Two real teams, a possession-level engine, and a replay you can watch. Rule players out, switch to playoff rules, swap home court — everything moves the result."
        right={phase !== 'setup' ? (
          <button onClick={() => { setPhase('setup'); setResult(null) }}
            className="glass glass-hover rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest">
            Change the setup
          </button>
        ) : undefined} />

      <AnimatePresence mode="wait">
        {phase === 'loading' && home && away && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GameLoader
              homeAbbr={home.abbr} homeId={home.teamId}
              awayAbbr={away.abbr} awayId={away.teamId}
              stage={progress.stage} pct={progress.pct} isPlayoffs={isPlayoffs} />
          </motion.div>
        )}

        {phase === 'watch' && result && (
          <motion.div key="watch" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}>
            {out.size > 0 && (
              <GlassCard className="mb-4" accent={tokens.series[1]}>
                <p className="eyebrow mb-2">Ruled out for this game</p>
                <div className="flex flex-wrap gap-2">
                  {[...out].map((id) => {
                    const p = engine.getPlayer(id)
                    if (!p) return null
                    return (
                      <span key={id} className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs
                                                 font-semibold line-through"
                        style={{ background: 'var(--layer-2)', color: 'var(--text-muted)' }}>
                        <PlayerAvatar playerId={p.playerId} name={p.name} size={20} ring={false} />
                        {p.name} ({p.team})
                      </span>
                    )
                  })}
                </div>
              </GlassCard>
            )}
            <GameBroadcast result={result} onReplay={() => { const s = seed + 1; setSeed(s); run(s) }} />
          </motion.div>
        )}

        {phase === 'setup' && (
          <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-4">
            {/* ------------------------------------------------ matchup */}
            <GlassCard>
              <div className="grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
                <TeamSlot team={away} onChange={setAway} label="Away team" side="away" />
                <div className="flex flex-col items-center justify-center gap-3">
                  <span className="headline text-4xl" style={{ color: 'var(--text-muted)' }}>@</span>
                  <button
                    onClick={() => { const h = home; setHome(away); setAway(h) }}
                    className="glass glass-hover rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
                    Swap home court
                  </button>
                  <Toggle checked={isPlayoffs} onChange={setIsPlayoffs} label="Playoffs" />
                </div>
                <TeamSlot team={home} onChange={setHome} label="Home team" side="home" />
              </div>

              {sameTeam && (
                <p className="mt-4 text-center text-sm" style={{ color: 'var(--bad)' }}>
                  Pick two different teams.
                </p>
              )}

              {preview && (
                <div className="mt-6 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
                  <p className="eyebrow mb-2">Analytical forecast, before the simulation runs</p>
                  <WinProbBar homeAbbr={home!.abbr} awayAbbr={away!.abbr}
                    homeProb={preview.projection.homeWinProb}
                    homeColor={tokens.series[0]} awayColor={tokens.series[1]} />
                  <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {([
                      ['Projected score', `${dec(preview.projection.homePts.mean)} – ${dec(preview.projection.awayPts.mean)}`],
                      ['Spread', signed(preview.projection.spread)],
                      ['Total', dec(preview.projection.total.mean)],
                      ['Possessions', dec(preview.projection.possessions)],
                    ] as const).map(([k, v]) => (
                      <div key={k} className="rounded-lg px-2.5 py-2" style={{ background: 'var(--layer-1)' }}>
                        <p className="eyebrow">{k}</p>
                        <p className="num text-base font-bold">{v}</p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    This is the ratings model. The simulation below plays the game possession by
                    possession and will not always agree — that gap is the point.
                  </p>
                </div>
              )}
            </GlassCard>

            {/* --------------------------------------------- injury report */}
            {home && away && !sameTeam && (
              <div className="grid gap-4 lg:grid-cols-2">
                {[away, home].map((t) => (
                  <GlassCard key={t.abbr} accent={t.primaryColor}>
                    <SectionTitle
                      title={`${t.abbr} availability`}
                      sub="Click a player to rule him out"
                      right={<TeamLogo teamId={t.teamId} abbr={t.abbr} size={28} />} />
                    <ul className="space-y-1.5">
                      {engine.roster(t.abbr).map((p) => (
                        <AvailabilityRow key={p.playerId} player={p} team={t}
                          isOut={out.has(p.playerId)} onToggle={() => toggleOut(p.playerId)} />
                      ))}
                    </ul>
                    <RosterImpact team={t} out={out} />
                  </GlassCard>
                ))}
              </div>
            )}

            {/* ------------------------------------------------- controls */}
            <GlassCard>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="eyebrow mb-1.5">Confidence sweep</p>
                    <Segmented value={runs} onChange={setRuns} options={[
                      { value: 0, label: 'Off' }, { value: 100, label: '100 runs' },
                      { value: 200, label: '200 runs' }, { value: 500, label: '500 runs' },
                    ]} />
                  </div>
                  <div>
                    <p className="eyebrow mb-1.5">Seed</p>
                    <input type="number" value={seed} min={1} max={9999}
                      onChange={(e) => setSeed(Number(e.target.value) || 1)}
                      className="glass num w-24 rounded-lg px-3 py-1.5 text-sm font-bold outline-none" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {error && <span className="text-xs" style={{ color: 'var(--bad)' }}>{error}</span>}
                  <button onClick={() => run()} disabled={!canRun}
                    className={clsx('rounded-xl px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-all',
                      canRun
                        ? 'animate-pulseGlow bg-gradient-to-br from-[#C8102E] to-[#7A0A1C] text-white shadow-glow-red hover:-translate-y-0.5'
                        : 'cursor-not-allowed ring-1 ring-[var(--border)] text-[var(--text-muted)] layer-1')}>
                    {isPlayoffs ? 'Play the playoff game' : 'Play the game'}
                  </button>
                </div>
              </div>
              <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                The same seed always replays the same game, so a result is shareable. The confidence
                sweep re-runs the identical engine {runs || 0} more times to produce the win
                probability shown after the final buzzer — it runs on a background thread, so the
                page stays responsive.
              </p>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  )
}

function TeamSlot({ team, onChange, label, side }: {
  team: Team | null; onChange: (t: Team) => void; label: string; side: 'home' | 'away'
}) {
  return (
    <div>
      <TeamPicker value={team} onChange={onChange} label={label} />
      {team && (
        <motion.div key={team.abbr}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 flex items-center gap-3 rounded-xl p-3"
          style={{ background: `linear-gradient(120deg, ${team.primaryColor}2E, transparent 70%)` }}>
          <TeamLogo teamId={team.teamId} abbr={team.abbr} size={54} />
          <div className="min-w-0">
            <p className="truncate font-display text-xl font-bold leading-tight">{team.fullName}</p>
            <p className="num text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {team.wins}-{team.losses} · OFF {dec(team.offRating)} · DEF {dec(team.defRating)} ·
              {' '}PACE {dec(team.pace)}
            </p>
          </div>
          <Badge className="ml-auto" tone={side === 'home' ? 'brand' : 'neutral'}>
            {side === 'home' ? 'Home' : 'Away'}
          </Badge>
        </motion.div>
      )}
    </div>
  )
}

function AvailabilityRow({ player, team, isOut, onToggle }: {
  player: Player; team: Team; isOut: boolean; onToggle: () => void
}) {
  return (
    <li>
      <button onClick={onToggle}
        aria-pressed={isOut}
        className={clsx('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-all',
          isOut ? 'opacity-45' : 'hover-layer-1')}>
        <PlayerAvatar playerId={player.playerId} name={player.name}
          color={team.primaryColor} size={32} ring={false} />
        <span className="min-w-0 flex-1">
          <span className={clsx('block truncate text-sm font-semibold', isOut && 'line-through')}>
            {player.name}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
            {player.position} · {dec(player.min)} min
          </span>
        </span>
        <span className="num text-xs" style={{ color: 'var(--text-2)' }}>
          {dec(player.pts)} / {dec(player.reb)} / {dec(player.ast)}
        </span>
        <span className={clsx('shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider')}
          style={{
            background: isOut ? 'color-mix(in srgb, var(--bad) 18%, transparent)' : 'var(--layer-2)',
            color: isOut ? 'var(--bad)' : 'var(--text-muted)',
          }}>
          {isOut ? 'Out' : 'Active'}
        </span>
      </button>
    </li>
  )
}

/** What sitting these players actually costs the team, in the same units the
 *  simulator uses. Without this the toggles feel like they do nothing. */
function RosterImpact({ team, out }: { team: Team; out: Set<number> }) {
  const missing = engine.roster(team.abbr).filter((p) => out.has(p.playerId))
  if (!missing.length) {
    return (
      <p className="mt-3 border-t pt-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
        Full strength. Toggling anyone off redistributes his minutes and moves the team ratings.
      </p>
    )
  }
  const offPenalty = missing.reduce((s, p) => s + p.pts * 0.33 + p.ast * 0.28, 0)
  const defPenalty = missing.reduce((s, p) => s + p.stl * 1.4 + p.blk * 1.6, 0)
  return (
    <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
      <p className="eyebrow mb-2">Effect on {team.abbr}</p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--layer-1)' }}>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Offence</p>
          <p className="num text-sm font-bold" style={{ color: 'var(--bad)' }}>
            {dec(team.offRating)} → {dec(team.offRating - offPenalty)}
          </p>
        </div>
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--layer-1)' }}>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Defence</p>
          <p className="num text-sm font-bold" style={{ color: 'var(--bad)' }}>
            {dec(team.defRating)} → {dec(team.defRating + defPenalty)}
          </p>
        </div>
        <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--layer-1)' }}>
          <p className="text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Out</p>
          <p className="num text-sm font-bold">{missing.length}</p>
        </div>
      </div>
    </div>
  )
}
