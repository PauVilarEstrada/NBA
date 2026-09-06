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
import { dec, shortDate } from '@/lib/format'
import { mean } from '@/lib/stats'
import type { Player, Team } from '@/types'

const STATS = [
  { value: 'pts', label: 'Points' },
  { value: 'reb', label: 'Rebounds' },
  { value: 'ast', label: 'Assists' },
  { value: 'min', label: 'Minutes' },
] as const

export default function HeadToHead() {
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [player, setPlayer] = useState<Player | null>(
    () => engine.getPlayer(Number(params.get('player'))) ?? engine.PLAYERS[0] ?? null)
  const [team, setTeam] = useState<Team | null>(
    () => engine.getTeam(params.get('team') ?? 'BOS') ?? null)
  const [stat, setStat] = useState<(typeof STATS)[number]['value']>('pts')

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
  const avg = (rows: typeof games, k: (typeof STATS)[number]['value']) =>
    mean(rows.map((r) => r[k]))

  const sameTeam = player && team && player.teamId === team.teamId

  return (
    <PageTransition>
      <SectionTitle title="Head-to-head"
        sub="Every meeting with one opponent, split by venue — the split the projection model leans on" />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <PlayerPicker value={player} onChange={setPlayer} />
        <TeamPicker value={team} onChange={setTeam} />
      </div>

      {!player || !team ? (
        <EmptyState title="Pick a player and an opponent" />
      ) : sameTeam ? (
        <EmptyState title={`${player.name} plays for ${team.abbr}`}
          hint="Pick a different opponent — a player has no head-to-head record against his own team." />
      ) : (
        <>
          <GlassCard className="mb-4">
            <div className="flex flex-wrap items-center gap-4">
              <PlayerAvatar playerId={player.playerId} name={player.name}
                color={engine.getTeam(player.teamId)?.primaryColor} size={80} />
              <div>
                <p className="headline text-2xl">{player.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-2)' }}>
                  {games.length} career meetings with the {team.name}
                </p>
              </div>
              <span className="headline text-3xl px-2" style={{ color: 'var(--text-muted)' }}>vs</span>
              <TeamLogo teamId={team.teamId} abbr={team.abbr} size={72} />
              <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
                <StatTile label="Career vs" value={dec(avg(games, 'pts'))} unit="PPG" tone="brand" />
                <StatTile label="At home" value={dec(avg(home, 'pts'))} unit="PPG" />
                <StatTile label="On the road" value={dec(avg(away, 'pts'))} unit="PPG" />
                <StatTile label="Home edge"
                  value={dec(avg(home, 'pts') - avg(away, 'pts'))}
                  unit="PPG"
                  tone={avg(home, 'pts') >= avg(away, 'pts') ? 'brand' : 'accent'} />
              </div>
            </div>
          </GlassCard>

          <div className="mb-3">
            <Segmented value={stat} onChange={setStat} options={STATS.map((s) => ({ ...s }))} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <TrendLine
                title={`${STATS.find((s) => s.value === stat)!.label} against ${team.abbr}, game by game`}
                sub="Home games and road games plotted as separate series"
                height={320}
                xKey="label"
                data={games.map((g) => ({
                  label: `${g.season.slice(2)} ${shortDate(g.date)}`,
                  Home: g.isHome ? g[stat] : (null as unknown as number),
                  Away: g.isHome ? (null as unknown as number) : g[stat],
                }))}
                series={[
                  { key: 'Home', label: `Home (${home.length} games)`, color: tokens.series[0] },
                  { key: 'Away', label: `Away (${away.length} games)`, color: tokens.series[1] },
                ]}
                referenceY={player[stat] as number}
                referenceLabel={`Season avg ${dec(player[stat] as number)}`}
                table={{
                  columns: ['Season', 'Date', 'Venue', 'MIN', 'PTS', 'REB', 'AST'],
                  rows: games.map((g) => [g.season, shortDate(g.date), g.isHome ? 'Home' : 'Away',
                    dec(g.min), g.pts, g.reb, g.ast]),
                }}
              />
            </div>

            <CompareBars
              title="Home vs away"
              sub="Averages in this matchup only"
              height={320}
              data={STATS.map((s) => ({
                label: s.label,
                Home: Number(avg(home, s.value).toFixed(1)),
                Away: Number(avg(away, s.value).toFixed(1)),
              }))}
              series={[
                { key: 'Home', label: 'Home', color: tokens.series[0] },
                { key: 'Away', label: 'Away', color: tokens.series[1] },
              ]}
              table={{
                columns: ['Stat', 'Home', 'Away', 'Delta'],
                rows: STATS.map((s) => [s.label, dec(avg(home, s.value)), dec(avg(away, s.value)),
                  dec(avg(home, s.value) - avg(away, s.value))]),
              }}
            />
          </div>

          <GlassCard className="mt-4">
            <SectionTitle title="Every meeting" sub="Most recent first" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                    {['Season', 'Date', 'Venue', 'MIN', 'PTS', 'REB', 'AST'].map((h) => (
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
                      <td className="px-2 py-2 whitespace-nowrap">{shortDate(g.date)}</td>
                      <td className="px-2 py-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                          style={{
                            background: g.isHome ? `${tokens.series[0]}22` : `${tokens.series[1]}22`,
                            color: g.isHome ? tokens.series[0] : tokens.series[1],
                          }}>
                          {g.isHome ? 'Home' : 'Away'}
                        </span>
                      </td>
                      <td className="num px-2 py-2">{dec(g.min)}</td>
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
