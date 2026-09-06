import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Scatter, ScatterChart,
  Tooltip, XAxis, YAxis, ZAxis, ReferenceLine,
} from 'recharts'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CountUp } from '@/components/ui/Numbers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { ChartFrame, TooltipBox } from '@/components/charts/ChartFrame'
import { useChartTokens } from '@/lib/palette'
import * as engine from '@/lib/engine'
import {
  LEADER_CATEGORIES, awardRace, leaders, playoffPicture, realStandings,
  type LeaderKey,
} from '@/lib/season'
import { SEASON_LABEL } from '@/lib/api'
import { dec, money, pct, signed } from '@/lib/format'

type Tab = 'standings' | 'leaders' | 'awards' | 'league'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'standings', label: 'Standings' },
  { value: 'leaders', label: 'League leaders' },
  { value: 'awards', label: 'Award races' },
  { value: 'league', label: 'League trends' },
]

export default function Season() {
  const tokens = useChartTokens()
  const [tab, setTab] = useState<Tab>('standings')
  const standings = useMemo(() => realStandings(), [])
  const teams = engine.TEAMS

  const leagueTotals = useMemo(() => {
    const players = engine.PLAYERS
    return {
      ppg: teams.reduce((s, t) => s + t.pointsPerGame, 0) / teams.length,
      pace: teams.reduce((s, t) => s + t.pace, 0) / teams.length,
      ortg: teams.reduce((s, t) => s + t.offRating, 0) / teams.length,
      threeRate: teams.reduce((s, t) => s + t.threeRate, 0) / teams.length,
      attendance: teams.reduce((s, t) => s + t.venue.averageAttendance, 0) / teams.length,
      ticket: teams.reduce((s, t) => s + t.tickets.averagePrice, 0) / teams.length,
      payroll: teams.reduce((s, t) => s + t.payroll, 0),
      players: players.length,
    }
  }, [teams])

  const best = [...teams].sort((a, b) => b.netRating - a.netRating)[0]
  const mvpRace = useMemo(() => awardRace('mvp', 6), [])

  return (
    <PageTransition>
      {/* --------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(125deg, rgba(29,66,138,.34), rgba(200,16,46,.22) 55%, transparent)' }}>
        <span aria-hidden className="absolute -left-20 -top-24 h-72 w-72 rounded-full opacity-35 blur-[100px]"
          style={{ background: '#1D428A' }} />
        <span aria-hidden className="absolute -right-16 top-10 h-64 w-64 rounded-full opacity-25 blur-[100px]"
          style={{ background: '#C8102E' }} />
        <div className="relative">
          <Badge tone="brand">{SEASON_LABEL} regular season</Badge>
          <h1 className="headline mt-3 text-[clamp(2.25rem,7vw,5.5rem)]">The season so far</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-2)' }}>
            Both conference tables, the play-in picture, every statistical leaderboard, and a scored
            model of each award race — all from the same {SEASON_LABEL} dataset the rest of the site runs on.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <HeroTile label="League PPG" value={leagueTotals.ppg} />
            <HeroTile label="Pace" value={leagueTotals.pace} />
            <HeroTile label="Off rating" value={leagueTotals.ortg} />
            <HeroTile label="Shots from three" value={leagueTotals.threeRate * 100} suffix="%" />
            <HeroTile label="Avg attendance" value={leagueTotals.attendance} decimals={0} />
            <HeroTile label="Avg ticket" value={leagueTotals.ticket} decimals={0} prefix="$" />
          </div>
        </div>
      </section>

      <div className="sticky top-[92px] z-20 -mx-4 mb-4 mt-5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--bg) 92%, transparent)', backdropFilter: 'blur(12px)' }}>
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'standings' && <Standings standings={standings} colors={tokens.series} />}
          {tab === 'leaders' && <Leaders colors={tokens.series} />}
          {tab === 'awards' && <Awards colors={tokens.series} mvp={mvpRace} />}
          {tab === 'league' && <LeagueTrends best={best} colors={tokens.series} />}
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  )
}

function HeroTile({ label, value, decimals = 1, prefix = '', suffix = '' }: {
  label: string; value: number; decimals?: number; prefix?: string; suffix?: string
}) {
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="text-xl font-bold leading-none sm:text-2xl">
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
    </div>
  )
}

// ------------------------------------------------------------- standings
function Standings({ standings, colors }: {
  standings: ReturnType<typeof realStandings>; colors: string[]
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['East', 'West'] as const).map((conf, ci) => {
        const picture = playoffPicture(standings[conf])
        return (
          <GlassCard key={conf} accent={colors[ci]}>
            <SectionTitle title={`${conf}ern Conference`}
              sub="Seeds 1-6 are through · 7-10 play the play-in" />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                    {['#', 'Team', 'W', 'L', 'PCT', 'GB', 'PF', 'PA', 'DIFF'].map((h) => (
                      <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picture.map(({ team: t, seed, status, gamesBack }) => (
                    <tr key={t.abbr} className={clsx('border-b last:border-0 hover-layer-1',
                      status === 'playin' && 'opacity-95')}
                      style={{
                        borderColor: 'var(--border)',
                        boxShadow: status === 'clinched'
                          ? `inset 3px 0 0 0 ${colors[ci]}`
                          : status === 'playin' ? 'inset 3px 0 0 0 var(--text-muted)' : undefined,
                      }}>
                      <td className="num px-2 py-2 font-bold"
                        style={{ color: status === 'out' ? 'var(--text-muted)' : undefined }}>{seed}</td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <Link to={`/teams/${t.abbr}`}
                          className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                          <TeamLogo teamId={t.teamId} abbr={t.abbr} size={18} />
                          <span className="hidden sm:inline">{t.fullName}</span>
                          <span className="sm:hidden">{t.abbr}</span>
                        </Link>
                      </td>
                      <td className="num px-2 py-2 font-bold">{t.wins}</td>
                      <td className="num px-2 py-2">{t.losses}</td>
                      <td className="num px-2 py-2">{t.winPct.toFixed(3).slice(1)}</td>
                      <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                        {gamesBack === 0 ? '—' : dec(gamesBack)}
                      </td>
                      <td className="num px-2 py-2">{dec(t.pointsPerGame)}</td>
                      <td className="num px-2 py-2">{dec(t.pointsAllowed)}</td>
                      <td className="num px-2 py-2 font-semibold"
                        style={{ color: t.pointDiff >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                        {signed(t.pointDiff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-1 rounded" style={{ background: colors[ci] }} />
                Playoff berth
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-1 rounded" style={{ background: 'var(--text-muted)' }} />
                Play-in
              </span>
            </div>
          </GlassCard>
        )
      })}
    </div>
  )
}

// --------------------------------------------------------------- leaders
function Leaders({ colors }: { colors: string[] }) {
  const [key, setKey] = useState<LeaderKey>('pts')
  const rows = useMemo(() => leaders(key, 10), [key])
  const cat = LEADER_CATEGORIES.find((c) => c.key === key)!
  const fmt = (v: number) => (key === 'ts' ? `${(v * 100).toFixed(1)}%` : dec(v))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {LEADER_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setKey(c.key)}
            className={clsx('rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
              key === c.key
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#1D428A] text-white'
                : 'layer-1 text-[var(--text-2)] hover-layer-2')}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={`${cat.label} leaders`} sub={`Top 10 · ${cat.unit}`} />
          <ol className="space-y-1.5">
            {rows.map(({ player: p, value, rank }) => {
              const team = engine.getTeam(p.teamId)!
              return (
                <li key={p.playerId}>
                  <Link to={`/players/${p.playerId}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover-layer-1">
                    <span className="num w-6 text-center text-sm font-bold"
                      style={{ color: rank <= 3 ? colors[0] : 'var(--text-muted)' }}>{rank}</span>
                    <PlayerAvatar playerId={p.playerId} name={p.name}
                      color={team.primaryColor} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-bold leading-tight">
                        {p.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={12} />
                        {team.abbr} · {p.position}
                      </span>
                    </span>
                    <span className="num text-lg font-bold">{fmt(value)}</span>
                  </Link>
                </li>
              )
            })}
          </ol>
        </GlassCard>

        <ChartFrame
          title={`${cat.label} — top 10`}
          sub="Bars are team-coloured; the name beside each carries the same identity"
          height={420}
          table={{
            columns: ['Rank', 'Player', 'Team', cat.unit],
            rows: rows.map((r) => [r.rank, r.player.name, r.player.team, fmt(r.value)]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows.map((r) => ({ name: r.player.lastName, value: r.value }))}
              layout="vertical" margin={{ top: 4, right: 40, bottom: 4, left: 10 }}>
              <CartesianGrid stroke="var(--grid)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={104}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--layer-1)' }}
                content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipBox title={String(label)}
                    rows={[{ label: cat.unit, value: fmt(Number(payload[0].value)) }]} />
                ) : null} />
              <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                {rows.map((r, i) => (
                  <Cell key={i} fill={engine.getTeam(r.player.teamId)?.primaryColor ?? colors[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>

      <GlassCard>
        <SectionTitle title="Every category at a glance"
          sub="The leader in each of the fourteen tracked statistics" />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {LEADER_CATEGORIES.map((c) => {
            const top = leaders(c.key, 1)[0]
            if (!top) return null
            const team = engine.getTeam(top.player.teamId)!
            return (
              <Link key={c.key} to={`/players/${top.player.playerId}`}
                className="glass glass-hover flex items-center gap-2.5 rounded-xl p-2.5">
                <PlayerAvatar playerId={top.player.playerId} name={top.player.name}
                  color={team.primaryColor} size={38} ring={false} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                  <span className="block truncate text-sm font-semibold leading-tight">
                    {top.player.name}
                  </span>
                </span>
                <span className="num text-base font-bold" style={{ color: team.primaryColor }}>
                  {c.key === 'ts' ? `${(top.value * 100).toFixed(1)}` : dec(top.value)}
                </span>
              </Link>
            )
          })}
        </div>
      </GlassCard>
    </div>
  )
}

// ---------------------------------------------------------------- awards
const AWARDS = [
  { value: 'mvp', label: 'MVP', title: 'Most Valuable Player' },
  { value: 'dpoy', label: 'DPOY', title: 'Defensive Player of the Year' },
  { value: 'roy', label: 'ROY', title: 'Rookie of the Year' },
  { value: 'mip', label: 'MIP', title: 'Most Improved Player' },
  { value: 'sixth', label: '6MOY', title: 'Sixth Man of the Year' },
] as const

function Awards({ colors, mvp }: { colors: string[]; mvp: ReturnType<typeof awardRace> }) {
  const [award, setAward] = useState<(typeof AWARDS)[number]['value']>('mvp')
  const race = useMemo(() => (award === 'mvp' ? mvp : awardRace(award, 6)), [award, mvp])
  const meta = AWARDS.find((a) => a.value === award)!
  const leader = race[0]

  return (
    <div className="space-y-4">
      <Segmented value={award} onChange={setAward} options={AWARDS.map((a) => ({ ...a }))} />

      {leader && (
        <GlassCard className="overflow-hidden" padded={false}>
          <div className="relative p-6"
            style={{
              background: `linear-gradient(120deg, ${engine.getTeam(leader.player.teamId)?.primaryColor}33, transparent 65%)`,
            }}>
            <p className="eyebrow">{meta.title} · front-runner</p>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <PlayerAvatar playerId={leader.player.playerId} name={leader.player.name}
                color={engine.getTeam(leader.player.teamId)?.primaryColor} size={120} />
              <div className="min-w-0">
                <Link to={`/players/${leader.player.playerId}`}
                  className="headline text-[clamp(1.75rem,4vw,3rem)] hover:text-[var(--brand-lit)]">
                  {leader.player.name}
                </Link>
                <p className="num mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                  {leader.player.team} · {dec(leader.player.pts)} PTS · {dec(leader.player.reb)} REB ·
                  {' '}{dec(leader.player.ast)} AST · {(leader.player.ts * 100).toFixed(1)}% TS
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="eyebrow">Modelled vote share</p>
                <p className="headline text-5xl" style={{ color: colors[0] }}>
                  {pct(leader.share, 1)}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="The ballot" sub="Modelled vote share, top six" />
          <ol className="space-y-2.5">
            {race.map((c, i) => {
              const team = engine.getTeam(c.player.teamId)!
              return (
                <li key={c.player.playerId} className="rounded-xl p-2.5" style={{ background: 'var(--layer-1)' }}>
                  <div className="flex items-center gap-2.5">
                    <span className="num w-5 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                      {i + 1}
                    </span>
                    <PlayerAvatar playerId={c.player.playerId} name={c.player.name}
                      color={team.primaryColor} size={32} ring={false} />
                    <Link to={`/players/${c.player.playerId}`}
                      className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-[var(--brand-lit)]">
                      {c.player.name}
                    </Link>
                    <span className="num text-xs" style={{ color: 'var(--text-muted)' }}>{team.abbr}</span>
                    <span className="num w-14 text-right text-sm font-bold">{pct(c.share, 1)}</span>
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
                    {c.parts.map((part, j) => (
                      <span key={part.label} title={`${part.label}: ${part.value}`}
                        style={{
                          width: `${Math.max(0, (part.value / Math.max(c.score, 1)) * 100)}%`,
                          background: colors[j], marginRight: j < c.parts.length - 1 ? 2 : 0,
                        }} />
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>
          {leader && (
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {leader.parts.map((part, j) => (
                <li key={part.label} className="flex items-center gap-1.5 text-[11px]"
                  style={{ color: 'var(--text-2)' }}>
                  <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: colors[j] }} />
                  {part.label}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <SectionTitle title="How the score is built"
            sub="Every component is shown, so the ranking is arguable rather than magic" />
          <div className="space-y-3">
            {race.slice(0, 4).map((c) => (
              <div key={c.player.playerId}>
                <p className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold">{c.player.name}</span>
                  <span className="num font-bold">{c.score}</span>
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {c.parts.map((part, j) => (
                    <div key={part.label} className="rounded-lg px-2 py-1.5 text-center"
                      style={{ background: `color-mix(in srgb, ${colors[j]} 14%, transparent)` }}>
                      <p className="truncate text-[9px] uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{part.label}</p>
                      <p className="num text-sm font-bold" style={{ color: colors[j] }}>{part.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 text-[11px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            These are models, not ballots. Vote share is a softmax over the total score, which is
            why a dominant season shows up as a landslide rather than a narrow edge.
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

// ---------------------------------------------------------- league trends
function LeagueTrends({ best }: { best: ReturnType<typeof engine.getTeam>; colors: string[] }) {
  const teams = engine.TEAMS
  const scatter = teams.map((t) => ({
    x: t.offRating, y: t.defRating, z: t.winPct * 100,
    abbr: t.abbr, name: t.fullName, color: t.primaryColor,
  }))
  const avgOff = teams.reduce((s, t) => s + t.offRating, 0) / teams.length
  const avgDef = teams.reduce((s, t) => s + t.defRating, 0) / teams.length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartFrame
          title="Offence against defence"
          sub="Top-right of the plot is a good offence; lower is a good defence, so the title contenders sit bottom-right"
          height={420}
          right={<Badge tone="brand">{teams.length} teams</Badge>}
          table={{
            columns: ['Team', 'OFF', 'DEF', 'NET', 'Win%'],
            rows: [...teams].sort((a, b) => b.netRating - a.netRating)
              .map((t) => [t.fullName, dec(t.offRating), dec(t.defRating), signed(t.netRating),
                `${(t.winPct * 100).toFixed(1)}%`]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: -8 }}>
              <CartesianGrid stroke="var(--grid)" />
              <XAxis type="number" dataKey="x" name="Offence" domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false}
                label={{ value: 'Offensive rating', position: 'insideBottom', offset: -8,
                  fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name="Defence" reversed
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                width={46}
                label={{ value: 'Defensive rating', angle: -90, position: 'insideLeft',
                  fill: 'var(--text-muted)', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <ReferenceLine x={avgOff} stroke="var(--border-strong)" strokeDasharray="4 4" />
              <ReferenceLine y={avgDef} stroke="var(--border-strong)" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  const d = payload?.[0]?.payload as typeof scatter[number] | undefined
                  return active && d ? (
                    <TooltipBox title={d.name} rows={[
                      { label: 'Offence', value: dec(d.x) },
                      { label: 'Defence', value: dec(d.y) },
                      { label: 'Win %', value: `${d.z.toFixed(1)}%` },
                    ]} />
                  ) : null
                }} />
              <Scatter data={scatter}>
                {scatter.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </ChartFrame>

        <div className="space-y-4">
          {best && (
            <GlassCard accent={best.primaryColor}>
              <SectionTitle title="Best team in the league" />
              <Link to={`/teams/${best.abbr}`} className="flex items-center gap-3">
                <TeamLogo teamId={best.teamId} abbr={best.abbr} size={64} />
                <div>
                  <p className="headline text-2xl leading-none">{best.fullName}</p>
                  <p className="num text-xs" style={{ color: 'var(--text-muted)' }}>
                    {best.wins}-{best.losses} · net {signed(best.netRating)}
                  </p>
                </div>
              </Link>
            </GlassCard>
          )}

          <GlassCard>
            <SectionTitle title="Attendance leaders" sub="Average crowd per home game" />
            <ul className="space-y-1.5">
              {[...teams].sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
                .slice(0, 6).map((t, i) => (
                  <li key={t.abbr}>
                    <Link to={`/teams/${t.abbr}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                      <span className="num w-4 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <TeamLogo teamId={t.teamId} abbr={t.abbr} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.venue.arena}</span>
                      <span className="num text-sm font-bold">
                        {t.venue.averageAttendance.toLocaleString()}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <SectionTitle title="Priciest tickets" sub="Modelled average secondary-market price" />
            <ul className="space-y-1.5">
              {[...teams].sort((a, b) => b.tickets.averagePrice - a.tickets.averagePrice)
                .slice(0, 6).map((t, i) => (
                  <li key={t.abbr}>
                    <Link to={`/teams/${t.abbr}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                      <span className="num w-4 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <TeamLogo teamId={t.teamId} abbr={t.abbr} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t.fullName}</span>
                      <span className="num text-sm font-bold">${t.tickets.averagePrice}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <SectionTitle title="Payroll against wins"
          sub="Money does not buy wins in a straight line — the outliers are the interesting part" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {['Team', 'W-L', 'Payroll', 'Cost per win', 'Avg age', 'TS%', '3PA share', 'Attendance']
                  .map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {[...teams].sort((a, b) => b.payroll - a.payroll).map((t) => (
                <tr key={t.abbr} className="border-b last:border-0 hover-layer-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="whitespace-nowrap px-2 py-2">
                    <Link to={`/teams/${t.abbr}`}
                      className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                      <TeamLogo teamId={t.teamId} abbr={t.abbr} size={16} />{t.abbr}
                    </Link>
                  </td>
                  <td className="num px-2 py-2">{t.wins}-{t.losses}</td>
                  <td className="num px-2 py-2">{money(t.payroll)}</td>
                  <td className="num px-2 py-2">{money(t.payroll / Math.max(t.wins, 1))}</td>
                  <td className="num px-2 py-2">{dec(t.avgAge)}</td>
                  <td className="num px-2 py-2">{(t.tsPct * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{(t.threeRate * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{t.venue.averageAttendance.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Payroll counts only the players carried in this dataset, so it runs below a full 15-man
          cap sheet. Attendance and ticket prices are modelled — see the arena tab on any team page.
        </p>
      </GlassCard>
    </div>
  )
}
