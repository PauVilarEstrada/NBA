import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { EmptyState, SectionTitle, Segmented, StatTile } from '@/components/ui/Bits'
import { PlayerPicker, TeamPicker } from '@/components/ui/Pickers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { TrendLine } from '@/components/charts/TrendLine'
import { CompareBars } from '@/components/charts/CompareBars'
import { useChartTokens } from '@/lib/palette'
import * as engine from '@/lib/engine'
import { mean } from '@/lib/stats'
import { useI18n } from '@/i18n'
import type { Player, Team } from '@/types'

const STAT_KEYS = ['pts', 'reb', 'ast', 'min'] as const
type StatKey = (typeof STAT_KEYS)[number]

export default function HeadToHead() {
  const tokens = useChartTokens()
  const { t, f } = useI18n()
  const [params, setParams] = useSearchParams()
  const [player, setPlayer] = useState<Player | null>(
    () => engine.getPlayer(Number(params.get('player'))) ?? engine.PLAYERS[0] ?? null)
  const [team, setTeam] = useState<Team | null>(
    () => engine.getTeam(params.get('team') ?? 'BOS') ?? null)
  const [stat, setStat] = useState<StatKey>('pts')

  const stats = useMemo(
    () => STAT_KEYS.map((value) => ({ value, label: t.stat[value] })), [t])

  useEffect(() => {
    const next = new URLSearchParams()
    if (player) next.set('player', String(player.playerId))
    if (team) next.set('team', team.abbr)
    setParams(next, { replace: true })
  }, [player, team, setParams])

  const games = useMemo(
    () => (player && team ? engine.headToHead(player, team.abbr) : []),
    [player, team])

  const home = games.filter((g) => g.isHome)
  const away = games.filter((g) => !g.isHome)
  const avg = (rows: typeof games, k: StatKey) => mean(rows.map((r) => r[k]))

  const sameTeam = player && team && player.teamId === team.teamId

  return (
    <PageTransition>
      <SectionTitle title={t.h2h.title} sub={t.h2h.sub} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <PlayerPicker value={player} onChange={setPlayer} />
        <TeamPicker value={team} onChange={setTeam} />
      </div>

      {!player || !team ? (
        <EmptyState title={t.h2h.emptyTitle} />
      ) : sameTeam ? (
        <EmptyState title={t.h2h.samePlaysFor(player.name, team.abbr)}
          hint={t.h2h.sameHint} />
      ) : (
        <>
          <GlassCard className="mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <PlayerAvatar playerId={player.playerId} name={player.name}
                color={engine.getTeam(player.teamId)?.primaryColor} size={80} />
              <div>
                <p className="headline text-2xl">{player.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  {t.h2h.careerMeetings(games.length, team.name)}
                </p>
              </div>
              <span className="headline text-3xl px-2" style={{ color: 'var(--text-muted)' }}>
                {t.common.vs}
              </span>
              <TeamLogo teamId={team.teamId} abbr={team.abbr} size={72} />
              <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label={t.h2h.careerVs} value={f.dec(avg(games, 'pts'))} unit={t.abbr.ppg} tone="brand" />
                <StatTile label={t.h2h.atHome} value={f.dec(avg(home, 'pts'))} unit={t.abbr.ppg} />
                <StatTile label={t.h2h.onRoad} value={f.dec(avg(away, 'pts'))} unit={t.abbr.ppg} />
                <StatTile label={t.h2h.homeEdge}
                  value={f.dec(avg(home, 'pts') - avg(away, 'pts'))}
                  unit={t.abbr.ppg}
                  tone={avg(home, 'pts') >= avg(away, 'pts') ? 'brand' : 'accent'} />
              </div>
            </div>
          </GlassCard>

          <div className="mb-3">
            <Segmented value={stat} onChange={setStat} options={stats.map((s) => ({ ...s }))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TrendLine
                title={t.h2h.chartTitle(t.stat[stat], team.abbr)}
                sub={t.h2h.chartSub}
                height={320}
                xKey="label"
                data={games.map((g) => ({
                  label: `${g.season.slice(2)} ${f.shortDate(g.date)}`,
                  Home: g.isHome ? g[stat] : (null as unknown as number),
                  Away: g.isHome ? (null as unknown as number) : g[stat],
                }))}
                series={[
                  { key: 'Home', label: t.h2h.homeSeries(home.length), color: tokens.series[0] },
                  { key: 'Away', label: t.h2h.awaySeries(away.length), color: tokens.series[1] },
                ]}
                referenceY={player[stat] as number}
                referenceLabel={t.player.seasonAvg(f.dec(player[stat] as number))}
                table={{
                  columns: [t.abbr.season, t.abbr.date, t.h2h.venue, t.abbr.min, t.abbr.pts,
                    t.abbr.reb, t.abbr.ast],
                  rows: games.map((g) => [g.season, f.shortDate(g.date),
                    g.isHome ? t.common.home : t.common.away,
                    f.dec(g.min), g.pts, g.reb, g.ast]),
                }}
              />
            </div>

            <CompareBars
              title={t.h2h.splitTitle}
              sub={t.h2h.splitSub}
              height={320}
              data={stats.map((s) => ({
                label: s.label,
                Home: Number(avg(home, s.value).toFixed(1)),
                Away: Number(avg(away, s.value).toFixed(1)),
              }))}
              series={[
                { key: 'Home', label: t.common.home, color: tokens.series[0] },
                { key: 'Away', label: t.common.away, color: tokens.series[1] },
              ]}
              table={{
                columns: [t.abbr.stat, t.common.home, t.common.away, t.h2h.delta],
                rows: stats.map((s) => [s.label, f.dec(avg(home, s.value)), f.dec(avg(away, s.value)),
                  f.dec(avg(home, s.value) - avg(away, s.value))]),
              }}
            />
          </div>

          <GlassCard className="mt-4">
            <SectionTitle title={t.h2h.everyMeeting} sub={t.h2h.everyMeetingSub} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                    {[t.abbr.season, t.abbr.date, t.h2h.venue, t.abbr.min, t.abbr.pts, t.abbr.reb,
                      t.abbr.ast].map((h) => (
                      <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...games].reverse().map((g, i) => (
                    <tr key={i} className="border-b last:border-0 transition-colors hover-layer-1"
                      style={{ borderColor: 'var(--border)' }}>
                      <td className="px-2 py-2" style={{ color: 'var(--text-2)' }}>{g.season}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{f.shortDate(g.date)}</td>
                      <td className="px-2 py-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: g.isHome ? `${tokens.series[0]}22` : `${tokens.series[1]}22`,
                            color: g.isHome ? tokens.series[0] : tokens.series[1],
                          }}>
                          {g.isHome ? t.common.home : t.common.away}
                        </span>
                      </td>
                      <td className="num px-2 py-2">{f.dec(g.min)}</td>
                      <td className="num px-2 py-2 font-bold">{g.pts}</td>
                      <td className="num px-2 py-2">{g.reb}</td>
                      <td className="num px-2 py-2">{g.ast}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </PageTransition>
  )
}
