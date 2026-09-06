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
import { useI18n, type Dict } from '@/i18n'

type Tab = 'standings' | 'leaders' | 'awards' | 'league'

/**
 * `lib/season.ts` ships its award components with English labels. The copy
 * belongs to the dictionary, so the label is mapped here at render time and
 * falls back to whatever the model shipped when there is no key for it.
 */
function partLabel(t: Dict, label: string): string {
  const map: Record<string, string> = {
    'Production': t.season.parts.production,
    'Efficiency': t.season.parts.efficiency,
    'Role': t.season.parts.role,
    'Team success': t.season.parts.teamSuccess,
    'Impact': t.season.parts.impact,
    'Stocks': t.season.parts.stocks,
    'Defensive rebounding': t.season.parts.defensiveRebounding,
    'Team defence': t.season.parts.teamDefence,
    'Minutes': t.season.parts.minutes,
    'Above expectation': t.season.parts.aboveExpectation,
    'Role growth': t.season.parts.roleGrowth,
    'Bench scoring': t.season.parts.benchScoring,
    'Playmaking': t.season.parts.playmaking,
  }
  return map[label] ?? label
}

export default function Season() {
  const { t } = useI18n()
  const tokens = useChartTokens()
  const TABS: Array<{ value: Tab; label: string }> = [
    { value: 'standings', label: t.season.tabs.standings },
    { value: 'leaders', label: t.season.tabs.leaders },
    { value: 'awards', label: t.season.tabs.awards },
    { value: 'league', label: t.season.tabs.trends },
  ]
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
          <Badge tone="brand">{t.season.badge(SEASON_LABEL)}</Badge>
          <h1 className="headline mt-3 text-[clamp(2.25rem,7vw,5.5rem)]">{t.season.title}</h1>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-2)' }}>
            {t.season.lede(SEASON_LABEL)}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <HeroTile label={t.season.leaguePpg} value={leagueTotals.ppg} />
            <HeroTile label={t.stat.pace} value={leagueTotals.pace} />
            <HeroTile label={t.season.offRating} value={leagueTotals.ortg} />
            <HeroTile label={t.season.threeShare} value={leagueTotals.threeRate * 100} suffix="%" />
            <HeroTile label={t.season.avgAttendance} value={leagueTotals.attendance} decimals={0} />
            <HeroTile label={t.season.avgTicket} value={leagueTotals.ticket} decimals={0} prefix="$" />
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
  const { t, f } = useI18n()
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {(['East', 'West'] as const).map((conf, ci) => {
        const picture = playoffPicture(standings[conf])
        return (
          <GlassCard key={conf} accent={colors[ci]}>
            <SectionTitle
              title={t.season.conferenceTitle(conf === 'East' ? t.common.eastern : t.common.western)}
              sub={t.season.standingsSub} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                    {['#', t.abbr.team, t.abbr.w, t.abbr.l, t.abbr.pct, t.abbr.gb,
                      t.abbr.pf, t.abbr.pa, t.abbr.diff].map((h) => (
                      <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {picture.map(({ team, seed, status, gamesBack }) => (
                    <tr key={team.abbr} className={clsx('border-b last:border-0 hover-layer-1',
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
                        <Link to={`/teams/${team.abbr}`}
                          className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                          <TeamLogo teamId={team.teamId} abbr={team.abbr} size={18} />
                          <span className="hidden sm:inline">{team.fullName}</span>
                          <span className="sm:hidden">{team.abbr}</span>
                        </Link>
                      </td>
                      <td className="num px-2 py-2 font-bold">{team.wins}</td>
                      <td className="num px-2 py-2">{team.losses}</td>
                      <td className="num px-2 py-2">{f.dec(team.winPct, 3).slice(1)}</td>
                      <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                        {gamesBack === 0 ? '—' : f.dec(gamesBack)}
                      </td>
                      <td className="num px-2 py-2">{f.dec(team.pointsPerGame)}</td>
                      <td className="num px-2 py-2">{f.dec(team.pointsAllowed)}</td>
                      <td className="num px-2 py-2 font-semibold"
                        style={{ color: team.pointDiff >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                        {f.signed(team.pointDiff)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-1 rounded" style={{ background: colors[ci] }} />
                {t.season.playoffBerth}
              </span>
              <span className="flex items-center gap-1.5">
                <span aria-hidden className="h-3 w-1 rounded" style={{ background: 'var(--text-muted)' }} />
                {t.season.playIn}
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
  const { t, f } = useI18n()
  const [key, setKey] = useState<LeaderKey>('pts')
  const rows = useMemo(() => leaders(key, 10), [key])
  const cat = LEADER_CATEGORIES.find((c) => c.key === key)!
  const fmt = (v: number) => (key === 'ts' ? f.pct(v, 1) : f.dec(v))
  // `lib/season.ts` ships English labels and units with each category; the
  // dictionary owns that copy, so both are looked up by category key here.
  const label = (k: LeaderKey) => t.stat[k]
  const UNITS: Record<LeaderKey, string> = {
    pts: t.abbr.ppg, reb: t.abbr.rpg, ast: t.abbr.apg, stl: t.abbr.spg,
    blk: t.abbr.bpg, fg3m: t.abbr.fg3m, tov: t.abbr.tov, min: t.abbr.mpg,
    ts: t.abbr.ts, per: t.abbr.per, vorp: t.abbr.vorp, ws: t.abbr.ws,
    bpm: t.abbr.bpm, gameScore: t.abbr.gmsc,
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {LEADER_CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => setKey(c.key)}
            className={clsx('rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
              key === c.key
                ? 'bg-gradient-to-br from-[#3B82F6] to-[#1D428A] text-white'
                : 'layer-1 text-[var(--text-2)] hover-layer-2')}>
            {label(c.key)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.season.leadersTitle(label(cat.key))}
            sub={t.season.leadersSub(UNITS[cat.key])} />
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
          title={t.season.leadersChart(label(cat.key))}
          sub={t.season.leadersChartSub}
          height={420}
          table={{
            columns: [t.abbr.rank, t.abbr.player, t.abbr.team, UNITS[cat.key]],
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
                content={({ active, payload, label: name }) => active && payload?.length ? (
                  <TooltipBox title={String(name)}
                    rows={[{ label: UNITS[cat.key], value: fmt(Number(payload[0].value)) }]} />
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
        <SectionTitle title={t.season.everyCategory}
          sub={t.season.everyCategorySub} />
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
                    style={{ color: 'var(--text-muted)' }}>{label(c.key)}</span>
                  <span className="block truncate text-sm font-semibold leading-tight">
                    {top.player.name}
                  </span>
                </span>
                <span className="num text-base font-bold" style={{ color: team.primaryColor }}>
                  {c.key === 'ts' ? f.dec(top.value * 100, 1) : f.dec(top.value)}
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
type AwardKey = 'mvp' | 'dpoy' | 'roy' | 'mip' | 'sixth'

function Awards({ colors, mvp }: { colors: string[]; mvp: ReturnType<typeof awardRace> }) {
  const { t, f } = useI18n()
  const [award, setAward] = useState<AwardKey>('mvp')
  const race = useMemo(() => (award === 'mvp' ? mvp : awardRace(award, 6)), [award, mvp])
  const AWARDS: Array<{ value: AwardKey; label: string; title: string }> = [
    { value: 'mvp', label: t.season.awards.mvp, title: t.season.awards.mvpFull },
    { value: 'dpoy', label: t.season.awards.dpoy, title: t.season.awards.dpoyFull },
    { value: 'roy', label: t.season.awards.roy, title: t.season.awards.royFull },
    { value: 'mip', label: t.season.awards.mip, title: t.season.awards.mipFull },
    { value: 'sixth', label: t.season.awards.sixth, title: t.season.awards.sixthFull },
  ]
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
            <p className="eyebrow">{t.season.frontRunner(meta.title)}</p>
            <div className="mt-3 flex flex-wrap items-center gap-5">
              <PlayerAvatar playerId={leader.player.playerId} name={leader.player.name}
                color={engine.getTeam(leader.player.teamId)?.primaryColor} size={120} />
              <div className="min-w-0">
                <Link to={`/players/${leader.player.playerId}`}
                  className="headline text-[clamp(1.75rem,4vw,3rem)] hover:text-[var(--brand-lit)]">
                  {leader.player.name}
                </Link>
                <p className="num mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                  {leader.player.team} · {f.dec(leader.player.pts)} {t.abbr.pts} ·{' '}
                  {f.dec(leader.player.reb)} {t.abbr.reb} ·
                  {' '}{f.dec(leader.player.ast)} {t.abbr.ast} ·{' '}
                  {f.pct(leader.player.ts, 1)} {t.abbr.tsShort}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p className="eyebrow">{t.season.voteShare}</p>
                <p className="headline text-5xl" style={{ color: colors[0] }}>
                  {f.pct(leader.share, 1)}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.season.ballot} sub={t.season.ballotSub} />
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
                    <span className="num w-14 text-right text-sm font-bold">{f.pct(c.share, 1)}</span>
                  </div>
                  <div className="mt-1.5 flex h-2 overflow-hidden rounded-full">
                    {c.parts.map((part, j) => (
                      <span key={part.label}
                        title={`${partLabel(t, part.label)}: ${f.dec(part.value)}`}
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
                  {partLabel(t, part.label)}
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.season.scoreBuilt}
            sub={t.season.scoreBuiltSub} />
          <div className="space-y-3">
            {race.slice(0, 4).map((c) => (
              <div key={c.player.playerId}>
                <p className="mb-1 flex items-baseline justify-between text-xs">
                  <span className="font-semibold">{c.player.name}</span>
                  <span className="num font-bold">{f.dec(c.score)}</span>
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {c.parts.map((part, j) => (
                    <div key={part.label} className="rounded-lg px-2 py-1.5 text-center"
                      style={{ background: `color-mix(in srgb, ${colors[j]} 14%, transparent)` }}>
                      <p className="truncate text-[9px] uppercase tracking-wider"
                        style={{ color: 'var(--text-muted)' }}>{partLabel(t, part.label)}</p>
                      <p className="num text-sm font-bold" style={{ color: colors[j] }}>{f.dec(part.value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 border-t pt-3 text-[11px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            {t.season.awardsNote}
          </p>
        </GlassCard>
      </div>
    </div>
  )
}

// ---------------------------------------------------------- league trends
function LeagueTrends({ best }: { best: ReturnType<typeof engine.getTeam>; colors: string[] }) {
  const { t, f } = useI18n()
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
          title={t.season.offVsDef}
          sub={t.season.offVsDefSub}
          height={420}
          right={<Badge tone="brand">{t.season.teamsCount(teams.length)}</Badge>}
          table={{
            columns: [t.abbr.team, t.abbr.off, t.abbr.def, t.abbr.net, t.abbr.winPct],
            rows: [...teams].sort((a, b) => b.netRating - a.netRating)
              .map((team) => [team.fullName, f.dec(team.offRating), f.dec(team.defRating),
                f.signed(team.netRating), f.pct(team.winPct, 1)]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 12, right: 18, bottom: 18, left: -8 }}>
              <CartesianGrid stroke="var(--grid)" />
              <XAxis type="number" dataKey="x" name={t.predictTeam.offence}
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false}
                label={{ value: t.stat.offRating, position: 'insideBottom', offset: -8,
                  fill: 'var(--text-muted)', fontSize: 11 }} />
              <YAxis type="number" dataKey="y" name={t.predictTeam.defence} reversed
                domain={['dataMin - 2', 'dataMax + 2']}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false}
                width={46}
                label={{ value: t.stat.defRating, angle: -90, position: 'insideLeft',
                  fill: 'var(--text-muted)', fontSize: 11 }} />
              <ZAxis type="number" dataKey="z" range={[60, 400]} />
              <ReferenceLine x={avgOff} stroke="var(--border-strong)" strokeDasharray="4 4" />
              <ReferenceLine y={avgDef} stroke="var(--border-strong)" strokeDasharray="4 4" />
              <Tooltip cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  const d = payload?.[0]?.payload as typeof scatter[number] | undefined
                  return active && d ? (
                    <TooltipBox title={d.name} rows={[
                      { label: t.predictTeam.offence, value: f.dec(d.x) },
                      { label: t.predictTeam.defence, value: f.dec(d.y) },
                      { label: t.stat.winPct, value: f.pct(d.z / 100, 1) },
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
              <SectionTitle title={t.season.bestTeam} />
              <Link to={`/teams/${best.abbr}`} className="flex items-center gap-3">
                <TeamLogo teamId={best.teamId} abbr={best.abbr} size={64} />
                <div>
                  <p className="headline text-2xl leading-none">{best.fullName}</p>
                  <p className="num text-xs" style={{ color: 'var(--text-muted)' }}>
                    {best.wins}-{best.losses} · {t.abbr.net} {f.signed(best.netRating)}
                  </p>
                </div>
              </Link>
            </GlassCard>
          )}

          <GlassCard>
            <SectionTitle title={t.season.attendanceLeaders} sub={t.season.attendanceLeadersSub} />
            <ul className="space-y-1.5">
              {[...teams].sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
                .slice(0, 6).map((team, i) => (
                  <li key={team.abbr}>
                    <Link to={`/teams/${team.abbr}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                      <span className="num w-4 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <TeamLogo teamId={team.teamId} abbr={team.abbr} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.venue.arena}</span>
                      <span className="num text-sm font-bold">
                        {f.int(team.venue.averageAttendance)}
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </GlassCard>

          <GlassCard>
            <SectionTitle title={t.season.priciestTickets} sub={t.season.priciestTicketsSub} />
            <ul className="space-y-1.5">
              {[...teams].sort((a, b) => b.tickets.averagePrice - a.tickets.averagePrice)
                .slice(0, 6).map((team, i) => (
                  <li key={team.abbr}>
                    <Link to={`/teams/${team.abbr}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
                      <span className="num w-4 text-xs" style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                      <TeamLogo teamId={team.teamId} abbr={team.abbr} size={20} />
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.fullName}</span>
                      <span className="num text-sm font-bold">{f.money(team.tickets.averagePrice, false)}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </GlassCard>
        </div>
      </div>

      <GlassCard>
        <SectionTitle title={t.season.payrollVsWins}
          sub={t.season.payrollVsWinsSub} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {[t.abbr.team, `${t.abbr.w}-${t.abbr.l}`, t.stat.payroll, t.season.costPerWin,
                  t.season.avgAge, t.abbr.ts, t.season.threePaShare, t.arena.attendance]
                  .map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {[...teams].sort((a, b) => b.payroll - a.payroll).map((team) => (
                <tr key={team.abbr} className="border-b last:border-0 hover-layer-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="whitespace-nowrap px-2 py-2">
                    <Link to={`/teams/${team.abbr}`}
                      className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                      <TeamLogo teamId={team.teamId} abbr={team.abbr} size={16} />{team.abbr}
                    </Link>
                  </td>
                  <td className="num px-2 py-2">{team.wins}-{team.losses}</td>
                  <td className="num px-2 py-2">{f.money(team.payroll)}</td>
                  <td className="num px-2 py-2">{f.money(team.payroll / Math.max(team.wins, 1))}</td>
                  <td className="num px-2 py-2">{f.dec(team.avgAge)}</td>
                  <td className="num px-2 py-2">{f.dec(team.tsPct * 100, 1)}</td>
                  <td className="num px-2 py-2">{f.dec(team.threeRate * 100, 1)}</td>
                  <td className="num px-2 py-2">{f.int(team.venue.averageAttendance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {t.season.payrollNote}
        </p>
      </GlassCard>
    </div>
  )
}
