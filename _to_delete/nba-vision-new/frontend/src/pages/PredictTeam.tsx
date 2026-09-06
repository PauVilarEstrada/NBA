import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, EmptyState, SectionTitle, Slider, SourceBadge, StatTile, Toggle } from '@/components/ui/Bits'
import { TeamPicker } from '@/components/ui/Pickers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { ProjectionStrip, WinProbBar } from '@/components/charts/Projection'
import { CompareBars } from '@/components/charts/CompareBars'
import { useChartTokens } from '@/lib/palette'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { dec, signed } from '@/lib/format'
import type { Team, TeamPrediction } from '@/types'

export default function PredictTeam() {
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [home, setHome] = useState<Team | null>(() => engine.getTeam(params.get('home') ?? 'BOS') ?? null)
  const [away, setAway] = useState<Team | null>(() => engine.getTeam(params.get('away') ?? 'LAL') ?? null)
  const [isPlayoffs, setIsPlayoffs] = useState(false)
  const [homeRest, setHomeRest] = useState(2)
  const [awayRest, setAwayRest] = useState(2)
  const [result, setResult] = useState<TeamPrediction | null>(null)

  useEffect(() => {
    const next = new URLSearchParams()
    if (home) next.set('home', home.abbr)
    if (away) next.set('away', away.abbr)
    setParams(next, { replace: true })
  }, [home, away, setParams])

  useEffect(() => {
    if (!home || !away || home.abbr === away.abbr) { setResult(null); return }
    let cancelled = false
    api.predictTeam({
      home: home.abbr, away: away.abbr, isPlayoffs, homeRest, awayRest, series: isPlayoffs,
    }).then((r) => { if (!cancelled) setResult(r) })
    return () => { cancelled = true }
  }, [home, away, isPlayoffs, homeRest, awayRest])

  return (
    <PageTransition>
      <SectionTitle title="Game forecast"
        sub="Score, spread and win probability. Playoffs run on their own model, not a flag on the regular-season one."
        right={result ? <SourceBadge source={result.source} /> : undefined} />

      <GlassCard className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <TeamPicker value={home} onChange={setHome} label="Home team" />
            <div className="mt-3">
              <Slider label="Home rest" value={homeRest} min={0} max={5} onChange={setHomeRest}
                format={(v) => (v === 0 ? 'Back-to-back' : `${v} day${v === 1 ? '' : 's'}`)} />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            <span className="headline text-3xl" style={{ color: 'var(--text-muted)' }}>VS</span>
            <button
              onClick={() => { const h = home; setHome(away); setAway(h) }}
              className="glass glass-hover rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
              Swap
            </button>
            <Toggle checked={isPlayoffs} onChange={setIsPlayoffs} label="Playoffs" />
          </div>
          <div>
            <TeamPicker value={away} onChange={setAway} label="Away team" />
            <div className="mt-3">
              <Slider label="Away rest" value={awayRest} min={0} max={5} onChange={setAwayRest}
                format={(v) => (v === 0 ? 'Back-to-back' : `${v} day${v === 1 ? '' : 's'}`)} />
            </div>
          </div>
        </div>
      </GlassCard>

      {!result ? (
        <EmptyState title="Pick two different teams" />
      ) : (
        <>
          {/* ------------------------------------------------- scoreboard */}
          <GlassCard className="mb-4 overflow-hidden" padded={false}>
            <div className="relative p-6"
              style={{ background: `linear-gradient(100deg, ${result.home.primaryColor}33, transparent 45%, ${result.away.primaryColor}33)` }}>
              <div className="flex items-center justify-between gap-4">
                <TeamScore team={result.home} pts={result.projection.homePts.mean} label="Home" />
                <div className="text-center">
                  <p className="eyebrow">Projected</p>
                  <p className="headline text-2xl">Final</p>
                  {result.projection.total && (
                    <p className="num mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Total {dec(result.projection.total.mean)}
                    </p>
                  )}
                </div>
                <TeamScore team={result.away} pts={result.projection.awayPts.mean} label="Away" align="right" />
              </div>
              <div className="mt-6">
                <WinProbBar
                  homeAbbr={result.home.abbr} awayAbbr={result.away.abbr}
                  homeProb={result.projection.homeWinProb}
                  homeColor={tokens.series[0]} awayColor={tokens.series[1]} />
              </div>
            </div>
          </GlassCard>

          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Spread" value={signed(result.projection.spread)} tone="brand"
              hint={`${result.home.abbr} line`} />
            <StatTile label="Total" value={dec(result.projection.total.mean)}
              hint={`${dec(result.projection.total.low)}–${dec(result.projection.total.high)}`} />
            <StatTile label="Possessions" value={dec(result.projection.possessions)}
              hint={isPlayoffs ? 'playoff pace applied' : 'pace of both teams'} />
            <StatTile label="Margin (80%)"
              value={`${dec(result.projection.margin.low)} to ${dec(result.projection.margin.high)}`}
              tone="accent" />
          </div>

          {isPlayoffs && result.series && (
            <GlassCard className="mb-4" accent={tokens.series[1]}>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="eyebrow">Best-of-seven · {result.series.format}</p>
                  <p className="headline mt-1 text-4xl">
                    {(result.series.homeWinsSeries * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                    {result.home.abbr} win the series
                  </p>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <WinProbBar homeAbbr={result.home.abbr} awayAbbr={result.away.abbr}
                    homeProb={result.series.homeWinsSeries}
                    homeColor={tokens.series[0]} awayColor={tokens.series[1]} />
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Per-game: {(result.series.gameHomeProb * 100).toFixed(1)}% at home,
                    {' '}{(result.series.gameAwayProb * 100).toFixed(1)}% on the road.
                    Enumerated exactly over all 2⁷ outcome paths, not simulated.
                  </p>
                </div>
                <Badge tone="accent">Playoff model</Badge>
              </div>
            </GlassCard>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <ProjectionStrip label={`${result.home.abbr} points`} dist={result.projection.homePts}
                color={tokens.series[0]} />
              <ProjectionStrip label={`${result.away.abbr} points`} dist={result.projection.awayPts}
                color={tokens.series[1]} />
              <ProjectionStrip label="Margin (home minus away)" dist={result.projection.margin}
                color={tokens.series[4]} />
            </div>

            <CompareBars
              title="Team profile"
              sub="Lower defensive rating is better"
              height={300}
              data={[
                { label: 'Offence', [result.home.abbr]: result.home.offRating, [result.away.abbr]: result.away.offRating },
                { label: 'Defence', [result.home.abbr]: result.home.defRating, [result.away.abbr]: result.away.defRating },
                { label: 'Pace', [result.home.abbr]: result.home.pace, [result.away.abbr]: result.away.pace },
              ]}
              series={[
                { key: result.home.abbr, label: result.home.fullName, color: tokens.series[0] },
                { key: result.away.abbr, label: result.away.fullName, color: tokens.series[1] },
              ]}
              table={{
                columns: ['Metric', result.home.abbr, result.away.abbr],
                rows: [
                  ['Offence', dec(result.home.offRating), dec(result.away.offRating)],
                  ['Defence', dec(result.home.defRating), dec(result.away.defRating)],
                  ['Pace', dec(result.home.pace), dec(result.away.pace)],
                ],
              }}
            />
          </div>

          {/* -------------------------------------------- player breakdown */}
          <GlassCard className="mt-4">
            <SectionTitle title="Weighted by player"
              sub="The team number decomposed — every projected minute belongs to somebody" />
            <div className="grid gap-4 sm:grid-cols-2">
              {[result.home, result.away].map((t, ti) => (
                <div key={t.abbr}>
                  <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
                    <span aria-hidden className="h-4 w-1 rounded" style={{ background: tokens.series[ti] }} />
                    <TeamLogo teamId={t.teamId} abbr={t.abbr} size={20} /> {t.abbr}
                  </p>
                  <ul className="space-y-1.5">
                    {result.contributions.filter((c) => c.team === t.abbr).map((c) => (
                      <motion.li key={c.playerId} layout
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                        <PlayerAvatar playerId={c.playerId} name={c.name}
                          color={t.primaryColor} size={34} ring={false} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                        <span className="num flex gap-3 text-xs" style={{ color: 'var(--text-2)' }}>
                          <span><b className="text-[var(--text)]">{c.pts}</b> pts</span>
                          <span>{c.reb} reb</span>
                          <span>{c.ast} ast</span>
                        </span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </GlassCard>
        </>
      )}
    </PageTransition>
  )
}

function TeamScore({ team, pts, label, align = 'left' }: {
  team: Team; pts: number; label: string; align?: 'left' | 'right'
}) {
  return (
    <div className={`flex flex-1 flex-col ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
      <p className="eyebrow">{label}</p>
      <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={56} />
        <div className={align === 'right' ? 'text-right' : ''}>
          <p className="headline text-xl leading-none">{team.abbr}</p>
          <p className="num text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-none">{pts.toFixed(0)}</p>
        </div>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{team.fullName}</p>
    </div>
  )
}
