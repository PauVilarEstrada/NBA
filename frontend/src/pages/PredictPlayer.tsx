import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { EmptyState, SectionTitle, Segmented, Slider, SourceBadge, Toggle } from '@/components/ui/Bits'
import { PlayerPicker, TeamPicker } from '@/components/ui/Pickers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { DriverBars, ProjectionStrip } from '@/components/charts/Projection'
import { TrendLine } from '@/components/charts/TrendLine'
import { useChartTokens } from '@/lib/palette'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { useI18n } from '@/i18n'
import type { Driver, Player, PlayerPrediction, Team } from '@/types'

export default function PredictPlayer() {
  const { t, f } = useI18n()
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [player, setPlayer] = useState<Player | null>(
    () => engine.getPlayer(Number(params.get('player'))) ?? engine.PLAYERS[0] ?? null)
  const [opponent, setOpponent] = useState<Team | null>(
    () => engine.getTeam(params.get('opponent') ?? 'BOS') ?? null)
  const [isHome, setIsHome] = useState(true)
  const [restDays, setRestDays] = useState(2)
  const [isPlayoffs, setIsPlayoffs] = useState(false)
  const [result, setResult] = useState<PlayerPrediction | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const next = new URLSearchParams()
    if (player) next.set('player', String(player.playerId))
    if (opponent) next.set('opponent', opponent.abbr)
    setParams(next, { replace: true })
  }, [player, opponent, setParams])

  useEffect(() => {
    if (!player || !opponent) { setResult(null); return }
    let cancelled = false
    setLoading(true)
    api.predictPlayer({
      playerId: player.playerId, opponent: opponent.abbr, isHome, restDays, isPlayoffs,
    }).then((r) => { if (!cancelled) { setResult(r); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [player, opponent, isHome, restDays, isPlayoffs])

  const history = useMemo(() => {
    if (!player || !opponent) return []
    return engine.headToHead(player, opponent.abbr, 4)
  }, [player, opponent])

  // The engine labels its drivers in English. Rather than translating inside the
  // model, the label is matched here and the detail rebuilt from the same inputs;
  // anything the dictionary does not know falls through unchanged.
  const drivers: Driver[] = useMemo(() => {
    if (!result) return []
    const d = t.predictPlayer.drivers
    const rest = result.context.restDays
    const translated: Record<string, { label: string; detail: string }> = {
      'Venue': {
        label: d.venue,
        detail: result.context.venue === 'home' ? d.homeCourt : d.onTheRoad,
      },
      'Opponent defence': {
        label: d.oppDefence,
        detail: d.oppDefenceDetail(result.opponent.abbr, f.dec(result.opponent.defRating)),
      },
      'Pace': {
        label: d.pace,
        detail: d.paceDetail(result.opponent.abbr, f.dec(result.opponent.pace)),
      },
      'Rest': {
        label: d.rest,
        detail: rest <= 1 ? d.restB2B : d.restDays(rest),
      },
      'Matchup': {
        label: d.matchup,
        detail: d.matchupDetail(result.player.position),
      },
      'Recent form': { label: d.form, detail: d.formDetail },
      'Playoff intensity': { label: d.playoffs, detail: d.playoffsDetail },
    }
    return result.drivers.map((dr) => {
      const copy = translated[dr.label]
      return copy ? { ...dr, label: copy.label, detail: copy.detail } : dr
    })
  }, [result, t, f])

  const sameTeam = player && opponent && player.teamId === opponent.teamId

  const projectionLabels = {
    pts: t.predictPlayer.points,
    reb: t.predictPlayer.rebounds,
    ast: t.predictPlayer.assists,
    fg3m: t.predictPlayer.threes,
  } as const
  const tileLabels = {
    min: t.predictPlayer.minutes,
    stl: t.predictPlayer.steals,
    blk: t.predictPlayer.blocks,
    tov: t.predictPlayer.turnovers,
  } as const

  return (
    <PageTransition>
      <SectionTitle title={t.predictPlayer.title}
        sub={t.predictPlayer.sub}
        right={result ? <SourceBadge source={result.source} /> : undefined} />

      {/* ------------------------------------------------------------ inputs */}
      <GlassCard className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <PlayerPicker value={player} onChange={setPlayer} />
          <TeamPicker value={opponent} onChange={setOpponent} label={t.h2h.opponent} />
          <div className="flex flex-col justify-between gap-3">
            <Segmented value={isHome ? 'home' : 'away'} onChange={(v) => setIsHome(v === 'home')}
              options={[{ value: 'home', label: t.common.home }, { value: 'away', label: t.common.away }]} />
            <Toggle checked={isPlayoffs} onChange={setIsPlayoffs} label={t.common.playoffs} />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <Slider label={t.predictPlayer.restDays} value={restDays} min={0} max={5} onChange={setRestDays}
            format={(v) => (v === 0 ? t.predictPlayer.backToBack
              : v === 1 ? t.predictPlayer.oneDay : t.predictPlayer.nDays(v))} />
        </div>
      </GlassCard>

      {sameTeam ? (
        <EmptyState title={t.predictPlayer.samePlaysFor(player!.name, opponent!.abbr)}
          hint={t.predictPlayer.sameHint} />
      ) : !result ? (
        <EmptyState title={t.predictPlayer.emptyTitle} />
      ) : (
        <motion.div animate={{ opacity: loading ? 0.55 : 1 }} transition={{ duration: 0.2 }}>
          {/* --------------------------------------------------- matchup bar */}
          <GlassCard className="mb-4" accent={result.opponent.primaryColor}>
            <div className="flex flex-wrap items-center gap-4">
              <PlayerAvatar playerId={result.player.playerId} name={result.player.name}
                color={engine.getTeam(result.player.teamId)?.primaryColor} size={84} />
              <div className="min-w-0">
                <p className="headline text-2xl leading-none">{result.player.name}</p>
                <p className="mt-1 text-xs" style={{ color: 'var(--text-2)' }}>
                  {t.predictPlayer.contextLine(
                    result.context.venue === 'home' ? t.predictPlayer.atHome : t.predictPlayer.onRoad,
                    result.opponent.fullName,
                    t.predictPlayer.restLabel(result.context.restDays),
                    result.context.seasonType === 'playoffs',
                  )}
                </p>
              </div>
              <span className="headline px-2 text-3xl" style={{ color: 'var(--text-muted)' }}>
                {result.context.venue === 'home' ? t.common.vs : t.common.at}
              </span>
              <TeamLogo teamId={result.opponent.teamId} abbr={result.opponent.abbr} size={72} />
              <dl className="ml-auto grid grid-cols-3 gap-3 text-center text-xs">
                <div><dt style={{ color: 'var(--text-muted)' }}>{t.predictPlayer.oppDrtg}</dt>
                  <dd className="num text-lg font-bold">{f.dec(result.opponent.defRating)}</dd></div>
                <div><dt style={{ color: 'var(--text-muted)' }}>{t.predictPlayer.oppPace}</dt>
                  <dd className="num text-lg font-bold">{f.dec(result.opponent.pace)}</dd></div>
                <div><dt style={{ color: 'var(--text-muted)' }}>{t.predictPlayer.formIndex}</dt>
                  <dd className="num text-lg font-bold"
                    style={{ color: result.context.formIndex >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                    {f.signed(result.context.formIndex, 2)}
                  </dd></div>
              </dl>
            </div>
          </GlassCard>

          {/* ------------------------------------------------- projections */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {(['pts', 'reb', 'ast', 'fg3m'] as const).map((k, i) => (
                <ProjectionStrip key={k}
                  label={projectionLabels[k]}
                  dist={result.projections[k]}
                  color={tokens.series[i]} />
              ))}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['min', 'stl', 'blk', 'tov'] as const).map((k) => (
                  <div key={k} className="glass rounded-xl px-3 py-2.5">
                    <p className="eyebrow">{tileLabels[k]}</p>
                    <p className="num mt-0.5 text-xl font-bold">{f.dec(result.projections[k].median)}</p>
                    <p className="num text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {f.dec(result.projections[k].low)}–{f.dec(result.projections[k].high)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <GlassCard>
              <SectionTitle title={t.predictPlayer.whatMovedIt} sub={t.predictPlayer.whatMovedItSub} />
              <DriverBars drivers={drivers} />
              <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                {t.predictPlayer.driversNote}
              </p>
            </GlassCard>
          </div>

          {history.length > 0 && (
            <div className="mt-4">
              <TrendLine
                title={t.predictPlayer.historyTitle(result.opponent.abbr)}
                sub={t.predictPlayer.historySub}
                height={240}
                xKey="label"
                data={history.map((g) => ({
                  label: `${g.season.slice(2)} ${f.shortDate(g.date)}`
                    + ` (${g.isHome ? t.abbr.homeShort : t.abbr.awayShort})`,
                  Points: g.pts,
                }))}
                series={[{ key: 'Points', label: t.stat.pts, color: tokens.series[0] }]}
                referenceY={result.projections.pts.median}
                referenceLabel={t.predictPlayer.projected(f.dec(result.projections.pts.median))}
                table={{
                  columns: [t.abbr.game, t.abbr.pts, t.abbr.reb, t.abbr.ast],
                  rows: history.map((g) => [
                    `${g.season} ${g.isHome ? t.abbr.homeShort : t.abbr.awayShort}`,
                    g.pts, g.reb, g.ast,
                  ]),
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </PageTransition>
  )
}
