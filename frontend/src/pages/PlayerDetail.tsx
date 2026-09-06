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
import { AskPanel } from '@/components/assistant/AskPanel'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { SkillRadar } from '@/components/charts/SkillRadar'
import { TrendLine } from '@/components/charts/TrendLine'
import { ChartFrame, TooltipBox } from '@/components/charts/ChartFrame'
import { useChartTokens } from '@/lib/palette'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { useI18n } from '@/i18n'
import type { GameLog, Player, SeasonRow, Team } from '@/types'

type Tab = 'overview' | 'scouting' | 'shooting' | 'advanced' | 'splits' | 'gamelog' | 'career' | 'honours'
/** Order only — every label is read from `t.player.tabs` at render time. */
const TAB_KEYS: Tab[] = [
  'overview', 'scouting', 'shooting', 'advanced', 'splits', 'gamelog', 'career', 'honours',
]

/** The four series the overview trend line can plot, labelled from `t.stat`. */
const TRENDS = ['pts', 'reb', 'ast', 'min'] as const
type Trend = (typeof TRENDS)[number]

export default function PlayerDetail() {
  const { id } = useParams()
  const { t } = useI18n()
  const tokens = useChartTokens()
  const [tab, setTab] = useState<Tab>('overview')
  const [trend, setTrend] = useState<Trend>('pts')
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
        <EmptyState title={t.player.notFound} hint={t.player.notFoundHint} />
      </PageTransition>
    )
  }
  if (!data) {
    return (
      <PageTransition>
        <PageLoader label={t.player.loading} sub={t.player.loadingSub} />
      </PageTransition>
    )
  }

  const { player, team, career, gameLogs, radar, splits, monthly } = data
  const tabs = TAB_KEYS.map((value) => ({ value, label: t.player.tabs[value] }))

  return (
    <PageTransition>
      <PlayerHero player={player} team={team} />

      <div className="sticky top-[92px] z-20 -mx-4 mb-4 mt-5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)',
                 backdropFilter: 'blur(12px)' }}>
        <Segmented value={tab} onChange={setTab} options={tabs} />
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

      {/* Scoped to this player: it will not answer about anybody else. */}
      <AskPanel
        subject={{ kind: 'player', id: player.playerId, name: player.name, teamAbbr: player.team }}
        color={team?.primaryColor ?? 'var(--brand-lit)'} />
    </PageTransition>
  )
}

// ------------------------------------------------------------------- hero
function PlayerHero({ player, team }: { player: Player; team: Team }) {
  const { t, f } = useI18n()
  const b = player.bio
  const facts = [
    { k: t.stat.height, v: `${b.heightLabel} · ${b.heightCm}cm` },
    { k: t.stat.weight, v: `${b.weightLb}lb · ${b.weightKg}kg` },
    { k: t.stat.age, v: String(player.age) },
    { k: t.stat.country, v: b.country },
    { k: t.stat.draft,
      // Rebuilt from the structured fields rather than shown as the stored
      // English label, which the ingest job writes once and cannot translate.
      v: b.draftYear && b.draftRound && b.draftPick
        ? t.player.draftLine(b.draftYear, b.draftRound, b.draftPick)
        : t.stat.undrafted },
    { k: t.stat.experience, v: player.isRookie ? t.common.rookie : t.common.seasons(player.experience) },
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
                {player.season} {t.player.seasonSuffix}
              </span>
            </div>

            <h1 className="headline mt-1 text-[clamp(2.25rem,6vw,4.75rem)]">{player.name}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{player.position}</Badge>
              {player.isRookie && <Badge tone="accent">{t.common.rookie}</Badge>}
              {player.rings > 0 && (
                <Badge tone="good">{t.common.champion(player.rings)}</Badge>
              )}
              <Badge>{t.player.capHit(f.money(player.salary))}</Badge>
              <Badge tone={player.surplus >= 0 ? 'good' : 'bad'}>
                {player.surplus >= 0 ? t.player.surplus : t.player.overpaid} {f.money(Math.abs(player.surplus))}
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
                {t.player.estimatedMeasurements}
              </p>
            )}
          </motion.div>

          <motion.div variants={riseItem}
            className="grid grid-cols-3 gap-2 lg:w-[300px] lg:grid-cols-2">
            <HeroStat label={t.abbr.ppg} value={player.pts} pct={player.percentiles.pts} accent={team.primaryColor} />
            <HeroStat label={t.abbr.rpg} value={player.reb} pct={player.percentiles.reb} accent={team.primaryColor} />
            <HeroStat label={t.abbr.apg} value={player.ast} pct={player.percentiles.ast} accent={team.primaryColor} />
            <HeroStat label={t.abbr.ts} value={player.ts * 100} decimals={1} suffix="%"
              pct={player.percentiles.ts} accent={team.primaryColor} />
            <HeroStat label={t.abbr.per} value={player.per} pct={player.percentiles.per} accent={team.primaryColor} />
            <HeroStat label={t.abbr.min} value={player.min} pct={player.percentiles.min} accent={team.primaryColor} />
          </motion.div>
        </div>

        <motion.div variants={riseItem} className="mt-6 flex flex-wrap gap-2">
          <Link to={`/predict/player?player=${player.playerId}`}
            className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A] px-4 py-2.5
                       text-xs font-bold uppercase tracking-widest text-white shadow-glow
                       transition-transform hover:-translate-y-0.5">
            {t.player.ctaProject}
          </Link>
          <Link to={`/head-to-head?player=${player.playerId}`}
            className="glass glass-hover rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest">
            {t.player.ctaH2H}
          </Link>
          <Link to={`/compare?a=${player.playerId}`}
            className="glass glass-hover rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-widest">
            {t.player.ctaCompare}
          </Link>
        </motion.div>
      </div>
    </motion.section>
  )
}

function HeroStat({ label, value, pct: percentile, decimals = 1, suffix = '', accent }: {
  label: string; value: number; pct: number; decimals?: number; suffix?: string; accent: string
}) {
  const { t, f } = useI18n()
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
        {percentile}{f.ordinal(percentile)} {t.player.percentileSuffix}
      </p>
    </div>
  )
}

// --------------------------------------------------------------- overview
function Overview({ player, radar, gameLogs, trend, setTrend, colors }: {
  player: Player
  radar: Array<{ axis: string; value: number; raw: number }>
  gameLogs: GameLog[]
  trend: Trend
  setTrend: (v: Trend) => void
  colors: string[]
}) {
  const { t, f } = useI18n()
  const seasonAvg = player[trend] as number
  const trendLabel = t.stat[trend]
  const gameLabel = (l: GameLog) =>
    `${f.shortDate(l.date)} ${l.isHome ? t.common.vs : t.common.at} ${l.opponent}`
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendLine
            title={t.player.gameLogTitle(trendLabel)}
            sub={t.player.gameLogSub(gameLogs.length)}
            data={gameLogs.map((l) => ({
              label: gameLabel(l),
              value: l[trend] as number,
            }))}
            xKey="label"
            series={[{ key: 'value', label: trendLabel, color: colors[0] }]}
            referenceY={seasonAvg}
            referenceLabel={t.player.seasonAvg(f.dec(seasonAvg))}
            height={300}
            table={{
              columns: [t.abbr.matchup, trendLabel],
              rows: gameLogs.slice(-20).map((l) => [
                gameLabel(l), f.dec(l[trend] as number),
              ]),
            }}
          />
          <div className="mt-3">
            <Segmented value={trend} onChange={setTrend}
              options={TRENDS.map((v) => ({ value: v, label: t.stat[v] }))} />
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
          <SectionTitle title={t.player.whereHeRanks}
            sub={t.player.whereHeRanksSub(engine.PLAYERS.length)} />
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              [t.stat.pts, player.pts, 'pts'], [t.stat.reb, player.reb, 'reb'],
              [t.stat.ast, player.ast, 'ast'], [t.stat.stl, player.stl, 'stl'],
              [t.stat.blk, player.blk, 'blk'], [t.stat.tov, player.tov, 'tov'],
              [t.stat.ts, player.ts * 100, 'ts'], [t.stat.usg, player.usg * 100, 'usg'],
            ] as const).map(([label, value, key]) => (
              <PercentileBar key={key} label={label} value={value}
                percentile={player.percentiles[key]}
                format={(v) => (key === 'ts' || key === 'usg' ? `${f.dec(v)}%` : f.dec(v))} />
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t.player.turnoverNote}
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
  const { t, f } = useI18n()
  const from = player.shooting.pointsFrom
  const total = from.two + from.three + from.free || 1
  const rows = [
    { key: t.player.twoPointers, value: from.two, color: colors[0] },
    { key: t.player.threePointers, value: from.three, color: colors[1] },
    { key: t.player.freeThrows, value: from.free, color: colors[3] },
  ]
  return (
    <GlassCard>
      <SectionTitle title={t.player.pointsFrom} sub={t.player.pointsFromSub} />
      <div className="flex h-8 overflow-hidden rounded-lg" role="img"
        aria-label={rows.map((r) => `${r.key} ${f.pct(r.value / total, 0)}`).join(', ')}>
        {rows.map((r, i) => (
          <motion.div key={r.key}
            initial={{ width: 0 }} animate={{ width: `${(100 * r.value) / total}%` }}
            transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center justify-center text-[10px] font-bold text-white"
            style={{ background: r.color, marginRight: i < rows.length - 1 ? 2 : 0 }}>
            {(100 * r.value) / total > 12 && f.pct(r.value / total, 0)}
          </motion.div>
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.key} className="flex items-center gap-2 text-sm">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: r.color }} />
            <span style={{ color: 'var(--text-2)' }}>{r.key}</span>
            <span className="num ml-auto font-bold">{f.dec(r.value)}</span>
            <span className="num w-12 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
              {f.pct(r.value / total, 0)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
        {([[t.abbr.fgPct, player.shooting.fgPct], [t.abbr.fg3Pct, player.shooting.fg3Pct],
           [t.abbr.efgPct, player.shooting.efgPct]] as const).map(([k, v]) => (
          <div key={k} className="text-center">
            <dt className="eyebrow">{k}</dt>
            <dd className="num text-lg font-bold">{f.dec(v * 100)}</dd>
          </div>
        ))}
      </dl>
    </GlassCard>
  )
}

// --------------------------------------------------------------- shooting
function Shooting({ player, colors }: { player: Player; colors: string[] }) {
  const { t, f } = useI18n()
  const s = player.shooting
  const volume = [
    { label: t.player.allShots, made: s.fgm, attempted: s.fga, pct: s.fgPct },
    { label: t.player.twoPointers, made: s.fg2m, attempted: s.fg2a, pct: s.fg2Pct },
    { label: t.player.threePointers, made: s.fg3m, attempted: s.fg3a, pct: s.fg3Pct },
    { label: t.player.freeThrows, made: s.ftm, attempted: s.fta, pct: s.ftPct },
  ]
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.player.shootingLine} sub={t.common.perGame} />
          <div className="space-y-3">
            {volume.map((v, i) => (
              <div key={v.label}>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-semibold">{v.label}</span>
                  <span className="num">
                    <b className="text-base">{f.dec(v.made)}</b>
                    <span style={{ color: 'var(--text-muted)' }}> / {f.dec(v.attempted)}</span>
                    <b className="ml-2" style={{ color: colors[i % colors.length] }}>
                      {f.pct(v.pct, 1)}
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
          <SectionTitle title={t.player.shotDiet} sub={t.player.shotDietSub} />
          <div className="space-y-3">
            <PercentileBar label={t.player.threeRate} value={s.threeRate * 100}
              percentile={Math.round(s.threeRate * 160)} format={(v) => `${f.dec(v)}%`} />
            <PercentileBar label={t.player.ftRate} value={s.ftRate * 100}
              percentile={Math.round(s.ftRate * 220)} format={(v) => `${f.dec(v)}%`} />
            <PercentileBar label={t.stat.efgPct} value={s.efgPct * 100}
              percentile={player.percentiles.efgPct} format={(v) => `${f.dec(v)}%`} />
            <PercentileBar label={t.stat.ts} value={s.tsPct * 100}
              percentile={player.percentiles.ts} format={(v) => `${f.dec(v)}%`} />
          </div>
          <p className="mt-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t.player.efgNote}
          </p>
        </GlassCard>
      </div>

      <ChartFrame
        title={t.player.efficiencyVolume}
        sub={t.player.efficiencyVolumeSub}
        height={260}
        series={[
          { key: 'made', label: t.player.made, color: colors[0] },
          { key: 'attempted', label: t.player.attempted, color: colors[2] },
        ]}
        table={{
          columns: [t.player.shotType, t.player.made, t.player.attempted, '%'],
          rows: volume.map((v) => [v.label, f.dec(v.made), f.dec(v.attempted), f.pct(v.pct, 1)]),
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
                  label: String(p.name), value: f.dec(Number(p.value)), color: String(p.color),
                }))} />
              ) : null} />
            <Bar dataKey="attempted" name={t.player.attempted} fill={colors[2]} radius={[0, 4, 4, 0]} />
            <Bar dataKey="made" name={t.player.made} fill={colors[0]} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}

// --------------------------------------------------------------- advanced
function Advanced({ player }: { player: Player }) {
  const { t, f } = useI18n()
  const a = player.advanced
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title={t.player.advancedTitle} sub={t.player.advancedSub} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PercentileBar label={t.player.perLabel} value={a.per}
              percentile={player.percentiles.per} hint={t.player.perHint} />
            <PercentileBar label={t.player.bpmLabel} value={a.bpm}
              percentile={player.percentiles.bpm} format={(v) => f.signed(v)}
              hint={t.player.bpmHint} />
            <PercentileBar label={t.player.vorpLabel} value={a.vorp}
              percentile={player.percentiles.vorp} hint={t.player.vorpHint} />
            <PercentileBar label={t.stat.ws} value={a.ws}
              percentile={player.percentiles.ws} hint={t.player.wsHint} />
            <PercentileBar label={t.stat.gameScore} value={a.gameScore}
              percentile={player.percentiles.gameScore} hint={t.player.gameScoreHint} />
            <PercentileBar label={t.stat.usg} value={a.usgPct}
              percentile={player.percentiles.usg} format={(v) => `${f.dec(v)}%`}
              hint={t.player.usgHint} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.player.twoWay} sub={t.player.twoWaySub} />
          <div className="space-y-4">
            <TwoWayRow label={t.player.obpm} value={a.obpm} max={10} />
            <TwoWayRow label={t.player.dbpm} value={a.dbpm} max={6} />
            <div className="grid grid-cols-2 gap-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <div>
                <p className="eyebrow">{t.stat.offRating}</p>
                <p className="num text-2xl font-bold">{f.dec(a.ortg)}</p>
              </div>
              <div>
                <p className="eyebrow">{t.stat.defRating}</p>
                <p className="num text-2xl font-bold">{f.dec(a.drtg)}</p>
              </div>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t.player.ratingsNote}
            </p>
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle title={t.player.per36} sub={t.player.per36Sub} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {[t.player.basis, t.abbr.pts, t.abbr.reb, t.abbr.ast, t.abbr.stl,
                  t.abbr.blk, t.abbr.tov, t.abbr.fg3m].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                <td className="px-2 py-2 font-semibold">{t.player.perGameWithMin(f.dec(player.min))}</td>
                {(['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m'] as const).map((k) => (
                  <td key={k} className="num px-2 py-2">{f.dec(player[k])}</td>
                ))}
              </tr>
              <tr>
                <td className="px-2 py-2 font-semibold">{t.player.per36Row}</td>
                {(['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m'] as const).map((k) => (
                  <td key={k} className="num px-2 py-2 font-bold text-[var(--brand-lit)]">
                    {f.dec(player.per36[k] ?? 0)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {player.advanced.derived && (
        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {t.player.derivedNote}
        </p>
      )}
    </div>
  )
}

function TwoWayRow({ label, value, max }: { label: string; value: number; max: number }) {
  const { f } = useI18n()
  const width = Math.min(50, (Math.abs(value) / max) * 50)
  const positive = value >= 0
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="num font-bold" style={{ color: positive ? 'var(--good)' : 'var(--bad)' }}>
          {f.signed(value)}
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
  const { t, f } = useI18n()
  const rows = [
    [t.player.splitHome, splits.home], [t.player.splitAway, splits.away],
    [t.player.splitRested, splits.rested], [t.player.splitB2B, splits.backToBack],
  ] as const
  // The engine builds its month labels in English; re-label them here, where the
  // active locale is known, so the axis reads "ene 26" on a Spanish page.
  const months = monthly.map((m) => ({ ...m, label: f.monthLabel(m.month) }))
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.player.splitsTitle} sub={t.player.splitsSub} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                  {[t.player.split, t.abbr.gp, t.abbr.min, t.abbr.pts, t.abbr.reb,
                    t.abbr.ast, t.abbr.fg3m].map((h) => (
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
                    <td className="num px-2 py-2">{f.dec(s.min)}</td>
                    <td className="num px-2 py-2 font-bold">{f.dec(s.pts)}</td>
                    <td className="num px-2 py-2">{f.dec(s.reb)}</td>
                    <td className="num px-2 py-2">{f.dec(s.ast)}</td>
                    <td className="num px-2 py-2">{f.dec(s.fg3m)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DeltaTile label={t.player.homeCourtWorth} value={splits.home.pts - splits.away.pts} unit="pts" />
            <DeltaTile label={t.player.b2bCost}
              value={(splits.backToBack.gp ? splits.backToBack.pts : splits.away.pts) - splits.rested.pts}
              unit="pts" />
          </div>
        </GlassCard>

        <ChartFrame
          title={t.player.monthly}
          sub={t.player.monthlySub}
          height={280}
          series={[
            { key: 'pts', label: t.abbr.pts, color: colors[0] },
            { key: 'reb', label: t.abbr.reb, color: colors[2] },
            { key: 'ast', label: t.abbr.ast, color: colors[3] },
          ]}
          table={{
            columns: [t.abbr.month, t.abbr.gp, t.abbr.pts, t.abbr.reb, t.abbr.ast, t.abbr.min],
            rows: monthly.map((m) => [
              f.monthLabel(m.month), m.gp, f.dec(m.pts), f.dec(m.reb), f.dec(m.ast), f.dec(m.min),
            ]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={months} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipBox title={String(label)} rows={payload.map((p) => ({
                  label: String(p.name), value: f.dec(Number(p.value)), color: String(p.color),
                }))} />
              ) : null} />
              <Line type="monotone" dataKey="pts" name={t.abbr.pts} stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="reb" name={t.abbr.reb} stroke={colors[2]} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="ast" name={t.abbr.ast} stroke={colors[3]} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartFrame>
      </div>
    </div>
  )
}

function DeltaTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  const { f } = useI18n()
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--layer-1)' }}>
      <p className="eyebrow">{label}</p>
      <p className="num text-xl font-bold"
        style={{ color: value >= 0 ? 'var(--good)' : 'var(--bad)' }}>
        {f.signed(value)} <span className="text-xs font-normal">{unit}</span>
      </p>
    </div>
  )
}

// --------------------------------------------------------------- game log
function GameLogTable({ logs }: { logs: GameLog[] }) {
  const { t, f } = useI18n()
  const [limit, setLimit] = useState(15)
  const shown = [...logs].reverse().slice(0, limit)
  const best = Math.max(...logs.map((l) => l.pts))
  return (
    <GlassCard>
      <SectionTitle title={t.player.gameLog} sub={t.player.gameLogSubList(logs.length)}
        right={<Badge tone="accent">{t.player.seasonHigh(best)}</Badge>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
              {[t.abbr.date, t.abbr.matchup, t.abbr.rest, t.abbr.min, t.abbr.pts, t.abbr.reb,
                t.abbr.ast, t.abbr.stl, t.abbr.blk, t.abbr.tov, t.abbr.fg3m, t.abbr.ts,
                t.abbr.plusMinus]
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
                  {f.shortDate(l.date)}
                </td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">
                  <span style={{ color: l.isHome ? 'var(--brand-lit)' : 'var(--text-muted)' }}>
                    {l.isHome ? t.common.vs : t.common.at}
                  </span> {l.opponent}
                </td>
                <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>
                  {l.restDays === 0 ? t.player.b2bShort : `${l.restDays}d`}
                </td>
                <td className="num px-2 py-2">{f.dec(l.min)}</td>
                <td className="num px-2 py-2 font-bold"
                  style={{ color: l.pts === best ? 'var(--accent-lit)' : undefined }}>{l.pts}</td>
                <td className="num px-2 py-2">{l.reb}</td>
                <td className="num px-2 py-2">{l.ast}</td>
                <td className="num px-2 py-2">{l.stl}</td>
                <td className="num px-2 py-2">{l.blk}</td>
                <td className="num px-2 py-2">{l.tov}</td>
                <td className="num px-2 py-2">{l.fg3m}</td>
                <td className="num px-2 py-2">{f.dec(l.ts * 100, 0)}</td>
                <td className="num px-2 py-2"
                  style={{ color: l.plusMinus >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                  {f.signed(l.plusMinus, 0)}
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
          {t.common.showMore(logs.length - limit)}
        </button>
      )}
    </GlassCard>
  )
}

// ----------------------------------------------------------------- career
function Career({ career, colors }: { career: SeasonRow[]; colors: string[] }) {
  const { t, f } = useI18n()
  return (
    <div className="space-y-4">
      <ChartFrame
        title={t.player.careerProgression}
        sub={t.player.careerProgressionSub}
        height={280}
        series={[
          { key: 'pts', label: t.abbr.pts, color: colors[0] },
          { key: 'reb', label: t.abbr.reb, color: colors[2] },
          { key: 'ast', label: t.abbr.ast, color: colors[3] },
        ]}
        table={{
          columns: [t.abbr.season, t.stat.age, t.abbr.gp, t.abbr.pts, t.abbr.reb, t.abbr.ast,
            t.abbr.per, t.abbr.vorp],
          rows: career.map((c) => [
            c.season, c.age, c.gp, f.dec(c.pts), f.dec(c.reb), f.dec(c.ast),
            f.dec(c.per), f.dec(c.vorp),
          ]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={career} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="season" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox title={String(label)} rows={payload.map((p) => ({
                label: String(p.name), value: f.dec(Number(p.value)), color: String(p.color),
              }))} />
            ) : null} />
            <Line type="monotone" dataKey="pts" name={t.abbr.pts} stroke={colors[0]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="reb" name={t.abbr.reb} stroke={colors[2]} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="ast" name={t.abbr.ast} stroke={colors[3]} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      <GlassCard>
        <SectionTitle title={t.player.seasonBySeason} sub={t.player.seasonBySeasonSub} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {[t.abbr.season, t.stat.age, t.abbr.team, t.abbr.gp, t.abbr.min, t.abbr.pts,
                  t.abbr.reb, t.abbr.ast, t.abbr.stl, t.abbr.blk, t.abbr.fg3m, t.abbr.ts,
                  t.abbr.per, t.abbr.ws, t.abbr.bpm, t.abbr.vorp].map((h) => (
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
                  <td className="num px-2 py-2">{f.dec(c.min)}</td>
                  <td className="num px-2 py-2 font-bold">{f.dec(c.pts)}</td>
                  <td className="num px-2 py-2">{f.dec(c.reb)}</td>
                  <td className="num px-2 py-2">{f.dec(c.ast)}</td>
                  <td className="num px-2 py-2">{f.dec(c.stl)}</td>
                  <td className="num px-2 py-2">{f.dec(c.blk)}</td>
                  <td className="num px-2 py-2">{f.dec(c.fg3m)}</td>
                  <td className="num px-2 py-2">{f.dec(c.ts * 100)}</td>
                  <td className="num px-2 py-2">{f.dec(c.per)}</td>
                  <td className="num px-2 py-2">{f.dec(c.ws)}</td>
                  <td className="num px-2 py-2">{f.dec(c.bpm)}</td>
                  <td className="num px-2 py-2">{f.dec(c.vorp)}</td>
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
  const { t } = useI18n()
  const stints = player.stints
  const first = Math.min(...stints.map((s) => s.from))
  const last = 2026
  const span = Math.max(last - first, 1)
  // The data layer emits honour names in English; the dictionary is keyed by
  // those exact names, so an unknown one falls back to what came in.
  const honours = player.honours.map((h) => ({
    ...h, label: t.honour[h.label as keyof typeof t.honour] ?? h.label,
  }))
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard>
        <SectionTitle title={t.player.trophyCase}
          sub={player.rings > 0
            ? t.player.trophyCaseChampionships(player.rings)
            : t.player.individualHonours} />
        <TrophyCase honours={honours} />
      </GlassCard>

      <GlassCard>
        <SectionTitle title={t.player.whereHePlayed} sub={t.player.careerTimeline} />
        <div className="mb-4 flex h-9 w-full overflow-hidden rounded-lg">
          {stints.map((s) => {
            const team = engine.getTeam(s.team)
            const width = (((s.to ?? last) - s.from + 1) / span) * 100
            return (
              <motion.div key={`${s.team}-${s.from}`}
                initial={{ width: 0 }} animate={{ width: `${width}%` }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-center justify-center text-[10px] font-bold text-white"
                title={`${s.team} ${s.from}–${s.to ?? t.common.present}`}
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
                    {s.from}–{s.to ?? t.common.present} · {t.common.seasons(s.seasons)}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {t.player.stintsNote}
        </p>
      </GlassCard>
    </div>
  )
}
