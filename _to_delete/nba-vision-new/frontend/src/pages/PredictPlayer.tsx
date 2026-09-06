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
import { dec, shortDate } from '@/lib/format'
import type { Player, PlayerPrediction, Team } from '@/types'

export default function PredictPlayer() {
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

  const sameTeam = player && opponent && player.teamId === opponent.teamId

  return (
    <PageTransition>
      <SectionTitle title="Player projection"
        sub="Pick a player and an opponent. Every input below moves the forecast."
        right={result ? <SourceBadge source={result.source} /> : undefined} />

      {/* ------------------------------------------------------------ inputs */}
      <GlassCard className="mb-5">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
          <PlayerPicker value={player} onChange={setPlayer} />
          <TeamPicker value={opponent} onChange={setOpponent} label="Opponent" />
          <div className="flex flex-col justify-between gap-3">
            <Segmented value={isHome ? 'home' : 'away'} onChange={(v) => setIsHome(v === 'home')}
              options={[{ value: 'home', label: 'Home' }, { value: 'away', label: 'Away' }]} />
            <Toggle checked={isPlayoffs} onChange={setIsPlayoffs} label="Playoffs" />
          </div>
        </div>
        <div className="mt-4 max-w-xs">
          <Slider label="Days of rest" value={restDays} min={0} max={5} onChange={setRestDays}
            format={(v) => (v === 0 ? 'Back-to-back' : v === 1 ? '1 day' : `${v} days`)} />
        </div>
      </GlassCard>

      {sameTeam ? (
        <EmptyState title={`${player!.name} plays for ${opponent!.abbr}`}
          hint="Pick an opposing team to project a matchup." />
      ) : !result ? (
        <EmptyState title="Pick a player and an opponent" />
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
                  {result.context.venue === 'home' ? 'at home' : 'on the road'} vs {result.opponent.fullName}
                  {' · '}{result.context.restDays === 0 ? 'back-to-back' : `${result.context.restDays} days rest`}
                  {result.context.seasonType === 'playoffs' && ' · playoffs'}
                </p>
              </div>
              <span className="headline px-2 text-3xl" style={{ color: 'var(--text-muted)' }}>
                {result.context.venue === 'home' ? 'vs' : '@'}
              </span>
              <TeamLogo teamId={result.opponent.teamId} abbr={result.opponent.abbr} size={72} />
              <dl className="ml-auto grid grid-cols-3 gap-3 text-center text-xs">
                <div><dt style={{ color: 'var(--text-muted)' }}>Opp DRtg</dt>
                  <dd className="num text-lg font-bold">{dec(result.opponent.defRating)}</dd></div>
                <div><dt style={{ color: 'var(--text-muted)' }}>Opp pace</dt>
                  <dd className="num text-lg font-bold">{dec(result.opponent.pace)}</dd></div>
                <div><dt style={{ color: 'var(--text-muted)' }}>Form index</dt>
                  <dd className="num text-lg font-bold"
                    style={{ color: result.context.formIndex >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                    {result.context.formIndex > 0 ? '+' : ''}{result.context.formIndex.toFixed(2)}
                  </dd></div>
              </dl>
            </div>
          </GlassCard>

          {/* ------------------------------------------------- projections */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {(['pts', 'reb', 'ast', 'fg3m'] as const).map((k, i) => (
                <ProjectionStrip key={k}
                  label={{ pts: 'Points', reb: 'Rebounds', ast: 'Assists', fg3m: 'Three-pointers made' }[k]}
                  dist={result.projections[k]}
                  color={tokens.series[i]} />
              ))}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(['min', 'stl', 'blk', 'tov'] as const).map((k) => (
                  <div key={k} className="glass rounded-xl px-3 py-2.5">
                    <p className="eyebrow">{{ min: 'Minutes', stl: 'Steals', blk: 'Blocks', tov: 'Turnovers' }[k]}</p>
                    <p className="num mt-0.5 text-xl font-bold">{result.projections[k].median.toFixed(1)}</p>
                    <p className="num text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {result.projections[k].low.toFixed(1)}–{result.projections[k].high.toFixed(1)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <GlassCard>
              <SectionTitle title="What moved it" sub="Effect on the points projection" />
              <DriverBars drivers={result.drivers} />
              <p className="mt-4 border-t pt-3 text-[11px] leading-relaxed"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Each bar is one factor's isolated contribution. They compose multiplicatively in the
                model, so the bars will not sum exactly to the difference from his season average.
              </p>
            </GlassCard>
          </div>

          {history.length > 0 && (
            <div className="mt-4">
              <TrendLine
                title={`Recent history against ${result.opponent.abbr}`}
                sub="What he has actually done in this matchup"
                height={240}
                xKey="label"
                data={history.map((g) => ({
                  label: `${g.season.slice(2)} ${shortDate(g.date)}${g.isHome ? ' (H)' : ' (A)'}`,
                  Points: g.pts,
                }))}
                series={[{ key: 'Points', label: 'Points', color: tokens.series[0] }]}
                referenceY={result.projections.pts.median}
                referenceLabel={`Projected ${result.projections.pts.median.toFixed(1)}`}
                table={{
                  columns: ['Game', 'PTS', 'REB', 'AST'],
                  rows: history.map((g) => [`${g.season} ${g.isHome ? 'H' : 'A'}`, g.pts, g.reb, g.ast]),
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </PageTransition>
  )
}
