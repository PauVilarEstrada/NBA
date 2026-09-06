import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, EmptyState, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CountUp, PercentileBar } from '@/components/ui/Numbers'
import { PageLoader } from '@/components/ui/Loading'
import { TrophyCase } from '@/components/ui/Trophies'
import { ScoutingPanel } from '@/components/player/ScoutingPanel'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { SkillRadar } from '@/components/charts/SkillRadar'
import { TrendLine } from '@/components/charts/TrendLine'
import { ChartFrame, TooltipBox } from '@/components/charts/ChartFrame'
import { useChartTokens } from '@/lib/palette'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { dec, money, pct, shortDate } from '@/lib/format'
import type { GameLog, Player, SeasonRow, Team } from '@/types'

type Tab = 'overview' | 'scouting' | 'shooting' | 'advanced' | 'splits' | 'gamelog' | 'career' | 'honours'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview', label: 'Overview' },
  { value: 'scouting', label: 'Scouting AI' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'splits', label: 'Splits' },
  { value: 'gamelog', label: 'Game log' },
  { value: 'career', label: 'Career' },
  { value: 'honours', label: 'Honours' },
]

const TRENDS = [
  { value: 'pts', label: 'Points' },
  { value: 'reb', label: 'Rebounds' },
  { value: 'ast', label: 'Assists' },
  { value: 'min', label: 'Minutes' },
] as const

export default function PlayerDetail() {
  const { id } = useParams()
  const tokens = useChartTokens()
  const [tab, setTab] = useState<Tab>('overview')
  const [trend, setTrend] = useState<(typeof TRENDS)[number]['value']>('pts')
  const [data, setData] = useState<Awaited<ReturnType<typeof api.player>> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setData(null); setError(null); setTab('overview')
    if (!engine.getPlayer(Number(id))) { setError('notfound'); return }
    api.player(Number(id))
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [id])

  if (error === 'notfound') {
    return (
      <PageTransition>
        <EmptyState title="Player not found"
          hint="That id is not in the index. Head back and pick another one." />
      </PageTransition>
    )
  }
  if (!data) {
    return (
      <PageTransition>
        <PageLoader label="Pulling the profile" sub="Season line, splits, career and honours" />
      </PageTransition>
    )
  }

  const { player, team, career, gameLogs, radar, splits, monthly } = data

  return (
    <PageTransition>
      <PlayerHero player={player} team={team} />

      <div className="sticky top-[92px] z-20 -mx-4 mb-4 mt-5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
                 backdropFilter: 'blur(12px)' }}>
        <Segmented value={tab} onChange={setTab} options={TABS} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'overview' && (
            <Overview player={player} radar={radar} gameLogs={gameLogs}
              trend={trend} setTrend={setTrend} colors={tokens.series} />
          )}
          {tab === 'scouting' && <ScoutingPanel player={player} />}
          {tab === 'shooting' && <Shooting player={player} colors={tokens.series} />}
          {tab === 'advanced' && <Advanced player={player} />}
          {tab === 'splits' && <Splits splits={splits} monthly={monthly} colors={tokens.series} />}
          {tab === 'gamelog' && <GameLogTable logs={gameLogs} />}
          {tab === 'career' && <Career career={career} colors={tokens.series} />}
          {tab === 'honours' && <Honours player={player} />}
        </motion.div>
      </AnimatePresence>
    </PageTransition>
  )
}

// ------------------------------------------------------------------- hero
function PlayerHero({ player, team }: { player: Player; team: Team }) {
  const b = player.bio
  const facts = [
    { k: 'Height', v: `${b.heightLabel} · ${b.heightCm}cm` },
    { k: 'Weight', v: `${b.weightLb}lb · ${b.weightKg}kg` },
    { k: 'Age', v: String(player.age) },
    { k: 'Country', v: b.country },
    { k: 'Draft', v: b.draftLabel },
    { k: 'Experience', v: player.isRookie ? 'Rookie' : `${player.experience} seasons` },
  ]
  return (
    <motion.section variants={stagger} initial="hidden" animate="show"
      className="relative overflow-hidden rounded-3xl"
      style={{ background: `linear-gradient(135deg, ${team.primaryColor}44, ${team.secondaryColor}14 48%, transparent 78%)` }}>
      <span aria-hidden className="absolute -right-24 -top-28 h-80 w-80 rounded-full opacity-35 blur-[100px]"
        style={{ background: team.primaryColor }} />
      {/* oversized watermark logo, the way a broadcast lower-third does it */}
      <span aria-hidden className="pointer-events-none absolute -bottom-16 right-4 opacity-[.07]">
        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={280} />
      </span>

      <div className="relative p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
          <motion.div variants={riseItem} className="shrink-0">
            <PlayerAvatar playerId={player.playerId} name={player.name}
              color={team.primaryColor} size={210} className="rounded-2xl" />
          </motion.div>

          <motion.div variants={riseItem} className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={`/teams/${team.abbr}`}
                className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest
                           transition-colors hover:text-[var(--brand-lit)]"
                style={{ color: 'var(--text-2)' }}>
                <TeamLogo teamId={team.teamId} abbr={team.abbr} size={20} />
                {team.fullName}
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>·</span>
              <span className="num text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                {player.season} season
              </span>
            </div>

            <h1 className="headline mt-1 text-[clamp(2.25rem,6vw,4.75rem)]">{player.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{player.position}</Badge>
              {player.isRookie && <Badge tone="accent">Rookie</Badge>}
              {player.rings > 0 && (
                <Badge tone="good">{player.rings}× champion</Badge>
              )}
              <Badge>{money(player.salary)} cap hit</Badge>
              <Badge tone={player.surplus >= 0 ? 'good' : 'bad'}>
                {player.surplus >= 0 ? 'Surplus' : 'Overpaid'} {money(Math.abs(player.surplus))}
              </Badge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs sm:grid-cols-3 lg:max-w-2xl">
              {facts.map((f) => (
                <div key={f.k} className="flex justify-between gap-2 border-b pb-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <dt className="uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{f.k}</dt>
                  <dd className="num font-semibold">{f.v}</dd>
                </div>
              ))}
            </dl>
            {player.bio.measurementsEstimated && (
              <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Measurements are position-typical estimates — run the ingest job for the official listing.
              </p>
            )}
          </motion.div>

          <motion.div variants={riseItem}
            className="grid grid-cols-3 gap-2 lg:w-[300px] lg:grid-cols-2">
            <HeroStat label="PPG" value={player.pts} pct={player.percentiles.pts} accent={team.primaryColor} />
            <HeroStat label="RPG" value={player.reb} pct={player.percentiles.reb} accent={team.primaryColor} />
            <HeroStat label="APG" value={player.ast} pct={player.percentiles.ast} accent={team.primaryColor} />
            <HeroStat label="TS%" value={player.ts * 100} decimals={1} suffix="%"
              pct={player.percentiles.ts} accent={team.primaryColor} />
            <HeroStat label="PER" value={player.per} pct={player.percentiles.per} accent={team.primaryColor} />
            <HeroStat label="MIN" value={player.min} pct={player.percentiles.min} accent={team.primaryColor} />
          </motion.div>
        </div>

        <motion.div variants={riseItem} className="mt-6 flex flex-wrap gap-2">
          <Link to={`/predict/player?player=${player.playerId}`}
            className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A] px-4 py-2.5
                       text-xs font-bold uppercase tracking-widest text-white shadow-glow
                       transition-transform hover:-translate-y-0.5">
            Project his next game
          </Link>
          <Link to={`/head-to-head?player=${player.playerId}`}
            className="glass glass-hover rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest">
            Head-to-head history
          </Link>
          <Link to={`/compare?a=${player.playerId}`}
            className="glass glass-hover rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest">
            Compare
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

function HeroStat({ label, value, pct: percentile, decimals = 1, suffix = '', accent }: {
  label: string; value: number; pct: number; decimals?: number; suffix?: string; accent: string
}) {
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="text-2xl font-bold leading-none">
        <CountUp value={value} decimals={decimals} suffix={suffix} />
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full" style={{ background: 'var(--layer-2)' }}>
        <motion.span className="block h-full rounded-full"
          initial={{ width: 0 }} animate={{ width: `${percentile}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: accent }} />
      </div>
      <p className="num mt-0.5 text-[9px]" style={{ color: 'var(--text-muted)' }}>
        {percentile}th pctile
      </p>
    </div>
  )
}

// --------------------------------------------------------------- overview
function Overview({ player, radar, gameLogs, trend, setTrend, colors }: {
  player: Player
  radar: Array<{ axis: string; value: number; raw: number }>
  gameLogs: GameLog[]
  trend: (typeof TRENDS)[number]['value']
  setTrend: (v: (typeof TRENDS)[number]['value']) => void
  colors: string[]
}) {
  const seasonAvg = player[trend] as number
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendLine
            title={`Game log — ${TRENDS.find((t) => t.value === trend)!.label}`}
            sub={`${gameLogs.length} games this season, with the average marked`}
            data={gameLogs.map((l) => ({
              label: `${shortDate(l.date)} ${l.isHome ? 'vs' : '@'} ${l.opponent}`,
              value: l[trend] as number,
            }))}
            xKey="label"
            series={[{ key: 'value', label: TRENDS.find((t) => t.value === trend)!.label, color: colors[0] }]}
            referenceY={seasonAvg}
            referenceLabel={`Season avg ${dec(seasonAvg)}`}
            height={300}
            table={{
              columns: ['Game', TRENDS.find((t) => t.value === trend)!.label],
              rows: gameLogs.slice(-20).map((l) => [
                `${shortDate(l.date)} ${l.isHome ? 'vs' : '@'} ${l.opponent}`, dec(l[trend] as number),
              ]),
            }}
          />
          <div className="mt-3">
            <Segmented value={trend} onChange={setTrend} options={TRENDS.map((t) => ({ ...t }))} />
          </div>
        </div>

        <SkillRadar
          axes={radar.map((r) => r.axis)}
          series={[{
            name: player.name, color: colors[0],
            values: Object.fromEntries(radar.map((r) => [r.axis, r.value])),
          }]}
          height={330}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Where he ranks" sub="Percentile among the 124 players in the index" />
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              ['Points', player.pts, 'pts'], ['Rebounds', player.reb, 'reb'],
              ['Assists', player.ast, 'ast'], ['Steals', player.stl, 'stl'],
              ['Blocks', player.blk, 'blk'], ['Turnovers', player.tov, 'tov'],
              ['True shooting', player.ts * 100, 'ts'], ['Usage', player.usg * 100, 'usg'],
            ] as const).map(([label, value, key]) => (
              <PercentileBar key={key} label={label} value={value}
                percentile={player.percentiles[key]}
                format={(v) => (key === 'ts' || key === 'usg' ? `${v.toFixed(1)}%` : v.toFixed(1))} />
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Turnovers are inverted — a high percentile means he protects the ball.
          </p>
        </GlassCard>

        <ShotProfile player={player} colors={colors} />
      </div>
    </div>
  )
}

/** Where his points actually come from. A scorer averaging 28 on threes and a
 *  scorer averaging 28 at the rim are different players, and the season line
 *  alone cannot tell them apart. */
function ShotProfile({ player, colors }: { player: Player; colors: string[] }) {
  const from = player.shooting.pointsFrom
  const total = from.two + from.three + from.free || 1
  const rows = [
    { key: 'Two-pointers', value: from.two, color: colors[0] },
    { key: 'Three-pointers', value: from.three, color: colors[1] },
    { key: 'Free throws', value: from.free, color: colors[3] },
  ]
  return (
    <GlassCard>
      <SectionTitle title="Where the points come from"
        sub="Reconstructed from the per-game line and true shooting" />
      <div className="flex h-8 overflow-hidden rounded-lg" role="img"
        aria-label={rows.map((r) => `${r.key} ${(100 * r.value / total).toFixed(0)}%`).join(', ')}>
        {rows.map((r, i) => (
          <motion.div key={r.key}
            initial={{ width: 0 }} animate={{ width: `${(100 * r.value) / total}%` }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: r.color, marginRight: i < rows.length - 1 ? 2 : 0 }}>
            {(100 * r.value) / total > 12 && `${Math.round((100 * r.value) / total)}%`}
          </motion.div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
            <span style={{ color: 'var(--text-2)' }}>{r.key}</span>
            <span className="num ml-auto font-bold">{dec(r.value)}</span>
            <span className="num w-12 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
              {pct(r.value / total, 0)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        {([['FG%', player.shooting.fgPct], ['3P%', player.shooting.fg3Pct],
           ['eFG%', player.shooting.efgPct]] as const).map(([k, v]) => (
          <div key={k} className="text-center">
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-lg font-bold">{(v * 100).toFixed(1)}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  )
}

// --------------------------------------------------------------- shooting
function Shooting({ player, colors }: { player: Player; colors: string[] }) {
  const s = player.shooting
  const volume = [
    { label: 'All shots', made: s.fgm, attempted: s.fga, pct: s.fgPct },
    { label: 'Two-pointers', made: s.fg2m, attempted: s.fg2a, pct: s.fg2Pct },
    { label: 'Three-pointers', made: s.fg3m, attempted: s.fg3a, pct: s.fg3Pct },
    { label: 'Free throws', made: s.ftm, attempted: s.fta, pct: s.ftPct },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Shooting line" sub="Per game" />
          <div className="space-y-3">
            {volume.map((v, i) => (
              <div key={v.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold">{v.label}</span>
                  <span className="num">
                    <b className="text-base">{dec(v.made)}</b>
                    <span style={{ color: 'var(--text-muted)' }}> / {dec(v.attempted)}</span>
                    <b className="ml-2" style={{ color: colors[i % colors.length] }}>
                      {(v.pct * 100).toFixed(1)}%
                    </b>
                  </span>
                </div>
                <div className="relative mt-1 h-3 overflow-hidden rounded-full"
                  style={{ background: 'var(--layer-2)' }}>
                  <motion.span className="absolute inset-y-0 left-0 rounded-full"
                    initial={{ width: 0 }} animate={{ width: `${v.pct * 100}%` }}
                    transition={{ duration: 0.7, delay: i * 0.07 }}
                    style={{ background: colors[i % colors.length] }} />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Shot diet" sub="What share of his attempts each type is" />
          <div className="space-y-3">
            <PercentileBar label="Three-point rate (3PA / FGA)" value={s.threeRate * 100}
              percentile={Math.round(s.threeRate * 160)} format={(v) => `${v.toFixed(1)}%`} />
            <PercentileBar label="Free-throw rate (FTA / FGA)" value={s.ftRate * 100}
              percentile={Math.round(s.ftRate * 220)} format={(v) => `${v.toFixed(1)}%`} />
            <PercentileBar label="Effective FG%" value={s.efgPct * 100}
              percentile={player.percentiles.efgPct} format={(v) => `${v.toFixed(1)}%`} />
            <PercentileBar label="True shooting" value={s.tsPct * 100}
              percentile={player.percentiles.ts} format={(v) => `${v.toFixed(1)}%`} />
          </div>
          <p className="mt-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            eFG% credits a three as 1.5 field goals. TS% goes further and counts free throws too,
            which is why it is the number worth comparing across positions.
          </p>
        </GlassCard>
      </div>

      <ChartFrame
        title="Efficiency against volume"
        sub="Made and attempted side by side — a high percentage on two shots is not the same thing"
        height={260}
        series={[
          { key: 'made', label: 'Made', color: colors[0] },
          { key: 'attempted', label: 'Attempted', color: colors[2] },
        ]}
        table={{
          columns: ['Shot type', 'Made', 'Attempted', '%'],
          rows: volume.map((v) => [v.label, dec(v.made), dec(v.attempted), `${(v.pct * 100).toFixed(1)}%`]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={volume} layout="vertical" barGap={2}
            margin={{ top: 4, right: 30, bottom: 4, left: 8 }}>
            <CartesianGrid stroke="var(--grid)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
              tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" width={104}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'var(--layer-1)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipBox title={String(label)} rows={payload.map((p) => ({
                  label: String(p.name), value: dec(Number(p.value)), color: String(p.color),
                }))} />
              ) : null} />
            <Bar dataKey="attempted" name="Attempted" fill={colors[2]} radius={[0, 4, 4, 0]} />
            <Bar dataKey="made" name="Made" fill={colors[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}

// --------------------------------------------------------------- advanced
function Advanced({ player }: { player: Player }) {
  const a = player.advanced
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title="Advanced metrics"
            sub="One number per question: how good, how valuable, how efficient" />
          <div className="grid gap-3 sm:grid-cols-2">
            <PercentileBar label="PER — player efficiency rating" value={a.per}
              percentile={player.percentiles.per} hint="15.0 is league average" />
            <PercentileBar label="BPM — box plus/minus" value={a.bpm}
              percentile={player.percentiles.bpm} format={(v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1))}
              hint="points per 100 vs an average player" />
            <PercentileBar label="VORP — value over replacement" value={a.vorp}
              percentile={player.percentiles.vorp} hint="cumulative, so minutes matter" />
            <PercentileBar label="Win shares" value={a.ws}
              percentile={player.percentiles.ws} hint="wins credited to him" />
            <PercentileBar label="Game score" value={a.gameScore}
              percentile={player.percentiles.gameScore} hint="a typical night, on the points scale" />
            <PercentileBar label="Usage rate" value={a.usgPct}
              percentile={player.percentiles.usg} format={(v) => `${v.toFixed(1)}%`}
              hint="share of possessions he finishes" />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Two-way split" sub="Offence and defence, separated" />
          <div className="space-y-4">
            <TwoWayRow label="Offensive BPM" value={a.obpm} max={10} />
            <TwoWayRow label="Defensive BPM" value={a.dbpm} max={6} />
            <div className="grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="eyebrow">Off rating</p>
                <p className="num text-2xl font-bold">{dec(a.ortg)}</p>
              </div>
              <div>
                <p className="eyebrow">Def rating</p>
                <p className="num text-2xl font-bold">{dec(a.drtg)}</p>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Ratings are points per 100 possessions. League average this season is 113.5.
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle title="Per 36 minutes"
          sub="Role-adjusted: what he would produce with a starter's minutes" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {['Basis', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV', '3PM'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="px-2 py-2 font-semibold">Per game ({dec(player.min)} min)</td>
                {(['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m'] as const).map((k) => (
                  <td key={k} className="num px-2 py-2">{dec(player[k])}</td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-semibold">Per 36 minutes</td>
                {(['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m'] as const).map((k) => (
                  <td key={k} className="num px-2 py-2 font-bold text-[var(--brand-lit)]">
                    {dec(player.per36[k] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {player.advanced.derived && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          These advanced numbers are reconstructed from the per-game line and true shooting, not
          measured from play-by-play — they rank players sensibly but are estimates. Running the
          Basketball-Reference ingest replaces them with the published values.
        </p>
      )}
    </div>
  )
}

function TwoWayRow({ label, value, max }: { label: string; value: number; max: number }) {
  const width = Math.min(50, (Math.abs(value) / max) * 50)
  const positive = value >= 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="num font-bold" style={{ color: positive ? 'var(--good)' : 'var(--bad)' }}>
          {positive ? '+' : ''}{value.toFixed(1)}
        </span>
      </div>
      <div className="relative mt-1.5 h-2.5">
        <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: 'var(--border-strong)' }} />
        <motion.span className="absolute top-0 h-2.5 rounded"
          initial={{ width: 0 }} animate={{ width: `${width}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            left: positive ? '50%' : undefined,
            right: positive ? undefined : '50%',
            background: positive ? 'var(--good)' : 'var(--bad)',
          }} />
      </div>
    </div>
  )
}

// ----------------------------------------------------------------- splits
function Splits({ splits, monthly, colors }: {
  splits: ReturnType<typeof engine.splits>
  monthly: ReturnType<typeof engine.monthlySplits>
  colors: string[]
}) {
  const rows = [
    ['Home', splits.home], ['Away', splits.away],
    ['2+ days rest', splits.rested], ['Back-to-back', splits.backToBack],
  ] as const
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Situational splits"
            sub="The context the projection model leans on hardest" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                  {['Split', 'GP', 'MIN', 'PTS', 'REB', 'AST', '3PM'].map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, s]) => (
                  <tr key={label} className="border-b last:border-0 hover-layer-1"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="px-2 py-2 font-semibold">{label}</td>
                    <td className="num px-2 py-2">{s.gp}</td>
                    <td className="num px-2 py-2">{dec(s.min)}</td>
                    <td className="num px-2 py-2 font-bold">{dec(s.pts)}</td>
                    <td className="num px-2 py-2">{dec(s.reb)}</td>
                    <td className="num px-2 py-2">{dec(s.ast)}</td>
                    <td className="num px-2 py-2">{dec(s.fg3m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DeltaTile label="Home court worth" value={splits.home.pts - splits.away.pts} unit="pts" />
            <DeltaTile label="Back-to-back cost"
              value={(splits.backToBack.gp ? splits.backToBack.pts : splits.away.pts) - splits.rested.pts}
              unit="pts" />
          </div>
        </GlassCard>

        <ChartFrame
          title="Month by month"
          sub="A season average hides a player who has been a different animal since January"
          height={280}
          series={[
            { key: 'pts', label: 'PTS', color: colors[0] },
            { key: 'reb', label: 'REB', color: colors[2] },
            { key: 'ast', label: 'AST', color: colors[3] },
          ]}
          table={{
            columns: ['Month', 'GP', 'PTS', 'REB', 'AST', 'MIN'],
            rows: monthly.map((m) => [m.label, m.gp, m.pts, m.reb, m.ast, m.min]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipBox title={String(label)} rows={payload.map((p) => ({
                  label: String(p.name), value: dec(Number(p.value)), color: String(p.color),
                }))} />
              ) : null} />
              <Line type="monotone" dataKey="pts" name="PTS" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reb" name="REB" stroke={colors[2]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ast" name="AST" stroke={colors[3]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  )
}

function DeltaTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--layer-1)' }}>
      <p className="eyebrow">{label}</p>
      <p className="num text-xl font-bold"
        style={{ color: value >= 0 ? 'var(--good)' : 'var(--bad)' }}>
        {value > 0 ? '+' : ''}{value.toFixed(1)} <span className="text-xs font-normal">{unit}</span>
      </p>
    </div>
  )
}

// --------------------------------------------------------------- game log
function GameLogTable({ logs }: { logs: GameLog[] }) {
  const [limit, setLimit] = useState(15)
  const shown = [...logs].reverse().slice(0, limit)
  const best = Math.max(...logs.map((l) => l.pts))
  return (
    <GlassCard>
      <SectionTitle title="Game log" sub={`${logs.length} games · most recent first`}
        right={<Badge tone="accent">Season high {best} pts</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
              {['Date', 'Matchup', 'Rest', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'TOV', '3PM', 'TS%', '+/-']
                .map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.gameId} className="border-b last:border-0 transition-colors hover-layer-1"
                style={{ borderColor: 'var(--border)' }}>
                <td className="whitespace-nowrap px-2 py-2" style={{ color: 'var(--text-2)' }}>
                  {shortDate(l.date)}
                </td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">
                  <span style={{ color: l.isHome ? 'var(--brand-lit)' : 'var(--text-muted)' }}>
                    {l.isHome ? 'vs' : '@'}
                  </span> {l.opponent}
                </td>
                <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                  {l.restDays === 0 ? 'B2B' : `${l.restDays}d`}
                </td>
                <td className="num px-2 py-2">{dec(l.min)}</td>
                <td className="num px-2 py-2 font-bold"
                  style={{ color: l.pts === best ? 'var(--accent-lit)' : undefined }}>{l.pts}</td>
                <td className="num px-2 py-2">{l.reb}</td>
                <td className="num px-2 py-2">{l.ast}</td>
                <td className="num px-2 py-2">{l.stl}</td>
                <td className="num px-2 py-2">{l.blk}</td>
                <td className="num px-2 py-2">{l.tov}</td>
                <td className="num px-2 py-2">{l.fg3m}</td>
                <td className="num px-2 py-2">{(l.ts * 100).toFixed(0)}</td>
                <td className="num px-2 py-2"
                  style={{ color: l.plusMinus >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                  {l.plusMinus > 0 ? '+' : ''}{l.plusMinus}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limit < logs.length && (
        <button onClick={() => setLimit((n) => n + 25)}
          className="mt-3 w-full rounded-xl py-2.5 text-xs font-bold uppercase tracking-widest
                     transition-colors hover-layer-2"
          style={{ background: 'var(--layer-1)' }}>
          Show more ({logs.length - limit} left)
        </button>
      )}
    </GlassCard>
  )
}

// ----------------------------------------------------------------- career
function Career({ career, colors }: { career: SeasonRow[]; colors: string[] }) {
  return (
    <div className="space-y-4">
      <ChartFrame
        title="Career progression"
        sub="Season by season, along the standard aging curve"
        height={280}
        series={[
          { key: 'pts', label: 'PTS', color: colors[0] },
          { key: 'reb', label: 'REB', color: colors[2] },
          { key: 'ast', label: 'AST', color: colors[3] },
        ]}
        table={{
          columns: ['Season', 'Age', 'GP', 'PTS', 'REB', 'AST', 'PER', 'VORP'],
          rows: career.map((c) => [c.season, c.age, c.gp, c.pts, c.reb, c.ast, c.per, c.vorp]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={career} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="season" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox title={String(label)} rows={payload.map((p) => ({
                label: String(p.name), value: dec(Number(p.value)), color: String(p.color),
              }))} />
            ) : null} />
            <Line type="monotone" dataKey="pts" name="PTS" stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="reb" name="REB" stroke={colors[2]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="ast" name="AST" stroke={colors[3]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <GlassCard>
        <SectionTitle title="Season by season" sub="Per game, with the advanced family alongside" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {['Season', 'Age', 'Team', 'GP', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK',
                  '3PM', 'TS%', 'PER', 'WS', 'BPM', 'VORP'].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {career.map((c) => (
                <tr key={c.season} className="border-b last:border-0 hover-layer-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="num whitespace-nowrap px-2 py-2 font-semibold">{c.season}</td>
                  <td className="num px-2 py-2">{c.age}</td>
                  <td className="px-2 py-2 font-semibold">{c.team}</td>
                  <td className="num px-2 py-2">{c.gp}</td>
                  <td className="num px-2 py-2">{dec(c.min)}</td>
                  <td className="num px-2 py-2 font-bold">{dec(c.pts)}</td>
                  <td className="num px-2 py-2">{dec(c.reb)}</td>
                  <td className="num px-2 py-2">{dec(c.ast)}</td>
                  <td className="num px-2 py-2">{dec(c.stl)}</td>
                  <td className="num px-2 py-2">{dec(c.blk)}</td>
                  <td className="num px-2 py-2">{dec(c.fg3m)}</td>
                  <td className="num px-2 py-2">{(c.ts * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{dec(c.per)}</td>
                  <td className="num px-2 py-2">{dec(c.ws)}</td>
                  <td className="num px-2 py-2">{dec(c.bpm)}</td>
                  <td className="num px-2 py-2">{dec(c.vorp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}

// ---------------------------------------------------------------- honours
function Honours({ player }: { player: Player }) {
  const stints = player.stints
  const first = Math.min(...stints.map((s) => s.from))
  const last = 2026
  const span = Math.max(last - first, 1)
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <SectionTitle title="Trophy case"
          sub={player.rings > 0 ? `${player.rings} championship${player.rings > 1 ? 's' : ''}` : 'Individual honours'} />
        <TrophyCase honours={player.honours} />
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Where he has played" sub="Career timeline" />
        <div className="mb-4 flex h-9 w-full overflow-hidden rounded-lg">
          {stints.map((s) => {
            const team = engine.getTeam(s.team)
            const width = (((s.to ?? last) - s.from + 1) / span) * 100
            return (
              <motion.div key={`${s.team}-${s.from}`}
                initial={{ width: 0 }} animate={{ width: `${width}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-center text-[10px] font-bold text-white"
                title={`${s.team} ${s.from}–${s.to ?? 'present'}`}
                style={{ background: team?.primaryColor ?? '#333', marginRight: 2 }}>
                {width > 12 && s.team}
              </motion.div>
            )
          })}
        </div>
        <ul className="space-y-2">
          {stints.map((s) => {
            const team = engine.getTeam(s.team)
            return (
              <li key={`${s.team}-${s.from}`} className="flex items-center gap-3">
                <span aria-hidden className="h-8 w-1 rounded-full"
                  style={{ background: team?.primaryColor ?? 'var(--border-strong)' }} />
                {team && <TeamLogo teamId={team.teamId} abbr={team.abbr} size={26} />}
                <span className="min-w-0 flex-1">
                  <Link to={`/teams/${s.team}`}
                    className="block truncate font-display text-base font-bold hover:text-[var(--brand-lit)]">
                    {team?.fullName ?? s.team}
                  </Link>
                  <span className="num text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {s.from}–{s.to ?? 'present'} · {s.seasons} season{s.seasons > 1 ? 's' : ''}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Career paths are recorded for the players in the demo dataset; the ingest job fills the
          rest from the transaction history.
        </p>
      </GlassCard>
    </div>
  )
}
