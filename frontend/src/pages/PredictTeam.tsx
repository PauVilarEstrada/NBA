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
import { useI18n } from '@/i18n'
import type { Team, TeamPrediction } from '@/types'

export default function PredictTeam() {
  const { t, f } = useI18n()
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [home, setHome] = useState<Team | null>(() => engine.getTeam(params.get('home') ?? 'BOS') ?? null)
  const [away, setAway] = useState<Team | null>(() => engine.getTeam(params.get('away') ?? 'LAL') ?? null)
  const [isPlayoffs, setIsPlayoffs] = useState(false)
  const [homeRest, setHomeRest] = useState(2)
  const [awayRest, setAwayRest] = useState(2)
  const [result, setResult] = useState<TeamPrediction | null>(null)

  // Rest is worded the same way on both sliders and on the player projection.
  const restLabel = (v: number) => (v === 0 ? t.predictPlayer.backToBack
    : v === 1 ? t.predictPlayer.oneDay : t.predictPlayer.nDays(v))

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
      <SectionTitle title={t.predictTeam.title}
        sub={t.predictTeam.sub}
        right={result ? <SourceBadge source={result.source} /> : undefined} />

      <GlassCard className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr]">
          <div>
            <TeamPicker value={home} onChange={setHome} label={t.predictTeam.homeTeam} />
            <div className="mt-3">
              <Slider label={t.predictTeam.homeRest} value={homeRest} min={0} max={5} onChange={setHomeRest}
                format={restLabel} />
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            <span className="headline text-3xl" style={{ color: 'var(--text-muted)' }}>{t.common.vs}</span>
            <button
              onClick={() => { const h = home; setHome(away); setAway(h) }}
              className="glass glass-hover rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
              {t.predictTeam.swap}
            </button>
            <Toggle checked={isPlayoffs} onChange={setIsPlayoffs} label={t.common.playoffs} />
          </div>
          <div>
            <TeamPicker value={away} onChange={setAway} label={t.predictTeam.awayTeam} />
            <div className="mt-3">
              <Slider label={t.predictTeam.awayRest} value={awayRest} min={0} max={5} onChange={setAwayRest}
                format={restLabel} />
            </div>
          </div>
        </div>
      </GlassCard>

      {!result ? (
        <EmptyState title={t.predictTeam.emptyTitle} />
      ) : (
        <>
          {/* ------------------------------------------------- scoreboard */}
          <GlassCard className="mb-4 overflow-hidden" padded={false}>
            <div className="relative p-6"
              style={{ background: `linear-gradient(100deg, ${result.home.primaryColor}33, transparent 45%, ${result.away.primaryColor}33)` }}>
              <div className="flex items-center justify-between gap-4">
                <TeamScore team={result.home} pts={result.projection.homePts.mean} label={t.common.home} />
                <div className="text-center">
                  <p className="eyebrow">{t.predictTeam.projected}</p>
                  <p className="headline text-2xl">{t.predictTeam.final}</p>
                  {result.projection.total && (
                    <p className="num mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {t.predictTeam.totalShort(f.dec(result.projection.total.mean))}
                    </p>
                  )}
                </div>
                <TeamScore team={result.away} pts={result.projection.awayPts.mean} label={t.common.away} align="right" />
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
            <StatTile label={t.predictTeam.spread} value={f.signed(result.projection.spread)} tone="brand"
              hint={t.predictTeam.spreadHint(result.home.abbr)} />
            <StatTile label={t.predictTeam.total} value={f.dec(result.projection.total.mean)}
              hint={`${f.dec(result.projection.total.low)}–${f.dec(result.projection.total.high)}`} />
            <StatTile label={t.predictTeam.possessions} value={f.dec(result.projection.possessions)}
              hint={isPlayoffs ? t.predictTeam.possessionsHintPlayoffs : t.predictTeam.possessionsHint} />
            <StatTile label={t.predictTeam.margin80}
              value={`${f.dec(result.projection.margin.low)} ${t.common.to} ${f.dec(result.projection.margin.high)}`}
              tone="accent" />
          </div>

          {isPlayoffs && result.series && (
            <GlassCard className="mb-4" accent={tokens.series[1]}>
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="eyebrow">{t.predictTeam.bestOfSeven(result.series.format)}</p>
                  <p className="headline mt-1 text-4xl">
                    {f.pct(result.series.homeWinsSeries, 1)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                    {t.predictTeam.winSeries(result.home.abbr)}
                  </p>
                </div>
                <div className="flex-1 min-w-[220px]">
                  <WinProbBar homeAbbr={result.home.abbr} awayAbbr={result.away.abbr}
                    homeProb={result.series.homeWinsSeries}
                    homeColor={tokens.series[0]} awayColor={tokens.series[1]} />
                  <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {t.predictTeam.perGame(
                      f.pct(result.series.gameHomeProb, 1),
                      f.pct(result.series.gameAwayProb, 1),
                    )}
                  </p>
                </div>
                <Badge tone="accent">{t.predictTeam.playoffModel}</Badge>
              </div>
            </GlassCard>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-3 lg:col-span-2">
              <ProjectionStrip label={t.predictTeam.homePoints(result.home.abbr)} dist={result.projection.homePts}
                color={tokens.series[0]} />
              <ProjectionStrip label={t.predictTeam.homePoints(result.away.abbr)} dist={result.projection.awayPts}
                color={tokens.series[1]} />
              <ProjectionStrip label={t.predictTeam.marginLabel} dist={result.projection.margin}
                color={tokens.series[4]} />
            </div>

            <CompareBars
              title={t.predictTeam.teamProfile}
              sub={t.predictTeam.lowerDefBetter}
              height={300}
              data={[
                { label: t.predictTeam.offence, [result.home.abbr]: result.home.offRating, [result.away.abbr]: result.away.offRating },
                { label: t.predictTeam.defence, [result.home.abbr]: result.home.defRating, [result.away.abbr]: result.away.defRating },
                { label: t.predictTeam.pace, [result.home.abbr]: result.home.pace, [result.away.abbr]: result.away.pace },
              ]}
              series={[
                { key: result.home.abbr, label: result.home.fullName, color: tokens.series[0] },
                { key: result.away.abbr, label: result.away.fullName, color: tokens.series[1] },
              ]}
              table={{
                columns: [t.abbr.metric, result.home.abbr, result.away.abbr],
                rows: [
                  [t.predictTeam.offence, f.dec(result.home.offRating), f.dec(result.away.offRating)],
                  [t.predictTeam.defence, f.dec(result.home.defRating), f.dec(result.away.defRating)],
                  [t.predictTeam.pace, f.dec(result.home.pace), f.dec(result.away.pace)],
                ],
              }}
            />
          </div>

          {/* -------------------------------------------- player breakdown */}
          <GlassCard className="mt-4">
            <SectionTitle title={t.predictTeam.weightedByPlayer}
              sub={t.predictTeam.weightedByPlayerSub} />
            <div className="grid gap-4 sm:grid-cols-2">
              {[result.home, result.away].map((team, ti) => (
                <div key={team.abbr}>
                  <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold">
                    <span aria-hidden className="h-4 w-1 rounded" style={{ background: tokens.series[ti] }} />
                    <TeamLogo teamId={team.teamId} abbr={team.abbr} size={20} /> {team.abbr}
                  </p>
                  <ul className="space-y-1.5">
                    {result.contributions.filter((c) => c.team === team.abbr).map((c) => (
                      <motion.li key={c.playerId} layout
                        className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                        <PlayerAvatar playerId={c.playerId} name={c.name}
                          color={team.primaryColor} size={34} ring={false} />
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
  const { f } = useI18n()
  return (
    <div className={`flex flex-1 flex-col ${align === 'right' ? 'items-end text-right' : 'items-start'}`}>
      <p className="eyebrow">{label}</p>
      <div className={`flex items-center gap-3 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={56} />
        <div className={align === 'right' ? 'text-right' : ''}>
          <p className="headline text-xl leading-none">{team.abbr}</p>
          <p className="num text-[clamp(2.5rem,7vw,4.5rem)] font-bold leading-none">{f.dec(pts, 0)}</p>
        </div>
      </div>
      <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{team.fullName}</p>
    </div>
  )
}
