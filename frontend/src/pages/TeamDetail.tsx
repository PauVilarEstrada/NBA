import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, EmptyState, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CountUp, PercentileBar, RankChip } from '@/components/ui/Numbers'
import { PageLoader } from '@/components/ui/Loading'
import { BannerRafters } from '@/components/ui/Trophies'
import { ArenaPanel } from '@/components/team/ArenaPanel'
import { AskPanel } from '@/components/assistant/AskPanel'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { CompareBars } from '@/components/charts/CompareBars'
import { TeamPicker } from '@/components/ui/Pickers'
import { useChartTokens } from '@/lib/palette'
import { useI18n } from '@/i18n'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { CAP, LUXURY_TAX } from '@/lib/cap'
import type { Player, Team } from '@/types'

type Tab = 'roster' | 'stats' | 'arena' | 'cap' | 'history'

export default function TeamDetail() {
  const { abbr } = useParams()
  const tokens = useChartTokens()
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('roster')
  const [rival, setRival] = useState<Team | null>(null)
  const [data, setData] = useState<Awaited<ReturnType<typeof api.team>> | null>(null)

  const exists = Boolean(engine.getTeam(String(abbr).toUpperCase()))

  useEffect(() => {
    if (!exists) return
    let cancelled = false
    setData(null); setTab('roster')
    api.team(String(abbr).toUpperCase()).then((d) => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [abbr, exists])

  if (!exists) {
    return <PageTransition><EmptyState title={t.team.notFound} /></PageTransition>
  }
  if (!data) {
    return <PageTransition><PageLoader label={t.team.loading} sub={t.team.loadingSub} /></PageTransition>
  }

  const { team, roster, leaders } = data

  // Built here rather than at module scope so the labels follow the locale.
  const tabs: Array<{ value: Tab; label: string }> = [
    { value: 'roster', label: t.team.tabs.roster },
    { value: 'stats', label: t.team.tabs.stats },
    { value: 'arena', label: t.team.tabs.arena },
    { value: 'cap', label: t.team.tabs.cap },
    { value: 'history', label: t.team.tabs.history },
  ]

  return (
    <PageTransition>
      <TeamHero team={team} leaders={leaders} />

      <div className="sticky top-[92px] z-20 -mx-4 mb-4 mt-5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(12px)' }}>
        <Segmented value={tab} onChange={setTab} options={tabs} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
          {tab === 'roster' && <RosterTab team={team} roster={roster} />}
          {tab === 'stats' && (
            <StatsTab team={team} rival={rival} setRival={setRival} colors={tokens.series} />
          )}
          {tab === 'arena' && <ArenaPanel team={team} />}
          {tab === 'cap' && <CapTab team={team} roster={roster} colors={tokens.series} />}
          {tab === 'history' && <HistoryTab team={team} />}
        </motion.div>
      </AnimatePresence>

      {/* Scoped to this team: it will not answer about anybody else. */}
      <AskPanel
        subject={{ kind: 'team', abbr: team.abbr, name: team.name }}
        color={team.primaryColor} />
    </PageTransition>
  )
}

// ------------------------------------------------------------------- hero
function TeamHero({ team, leaders }: {
  team: Team; leaders: ReturnType<typeof engine.teamLeaders>
}) {
  const { t, f } = useI18n()
  const fr = team.franchise
  const v0 = team.venue
  return (
    <motion.section variants={stagger} initial="hidden" animate="show"
      className="relative overflow-hidden rounded-3xl"
      style={{ background: `linear-gradient(130deg, ${team.primaryColor}4D, ${team.secondaryColor}1F 50%, transparent 80%)` }}>
      <span aria-hidden className="absolute -right-28 -top-28 h-96 w-96 rounded-full opacity-30 blur-[110px]"
        style={{ background: team.primaryColor }} />
      <span aria-hidden className="pointer-events-none absolute -bottom-20 -right-6 opacity-[.06]">
        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={320} />
      </span>

      <div className="relative p-6 sm:p-8">
        <motion.div variants={riseItem} className="flex flex-wrap items-center gap-5">
          <span className="animate-floaty"><TeamLogo teamId={team.teamId} abbr={team.abbr} size={110} /></span>
          <div className="min-w-0">
            <p className="eyebrow">
              {t.team.conferenceDivision(
                team.conference === 'East' ? t.common.eastern : t.common.western,
                team.division)}
            </p>
            <h1 className="headline text-[clamp(2rem,5.5vw,4.25rem)]">{team.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{team.wins}-{team.losses}</Badge>
              <Badge tone={team.netRating >= 0 ? 'good' : 'bad'}>
                {t.abbr.net} {f.signed(team.netRating)}
              </Badge>
              {fr.titleCount > 0 && (
                <Badge tone="accent">{t.team.championBadge(fr.titleCount)}</Badge>
              )}
              {v0.arena && <Badge>{v0.arena} · {t.team.seats(f.int(v0.capacity))}</Badge>}
              {fr.founded !== null && <Badge>{t.team.since(fr.founded)}</Badge>}
            </div>
          </div>

          <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TeamStatTile label={t.stat.pts} value={team.pointsPerGame} rank={team.pointsPerGameRank} />
            <TeamStatTile label={t.predictTeam.offence} value={team.offRating} rank={team.offRatingRank}
              hint={t.common.per100} />
            <TeamStatTile label={t.predictTeam.defence} value={team.defRating} rank={team.defRatingRank}
              hint={t.common.per100} />
            <TeamStatTile label={t.stat.pace} value={team.pace} rank={team.paceRank}
              hint={t.common.possPer48} />
          </div>
        </motion.div>

        {/* Team leaders strip — the faces behind the numbers */}
        <motion.div variants={riseItem} className="mt-6 flex flex-wrap gap-2">
          {(['pts', 'reb', 'ast', 'fg3m', 'per'] as const).map((k) => {
            const l = leaders[k]
            if (!l) return null
            const labels: Record<string, string> = {
              pts: t.stat.pts, reb: t.stat.reb, ast: t.stat.ast,
              fg3m: t.stat.fg3m, per: t.stat.per,
            }
            return (
              <Link key={k} to={`/players/${l.playerId}`}
                className="glass glass-hover flex items-center gap-2.5 rounded-xl px-3 py-2">
                <PlayerAvatar playerId={l.playerId} name={l.name} color={team.primaryColor}
                  size={34} ring={false} />
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{labels[k]} {t.team.leaderSuffix}</span>
                  <span className="block text-sm font-semibold leading-tight">{l.name}</span>
                </span>
                <span className="num ml-1 text-lg font-bold" style={{ color: team.primaryColor }}>
                  {f.dec(l.value)}
                </span>
              </Link>
            )
          })}
        </motion.div>
      </div>
    </motion.section>
  )
}

function TeamStatTile({ label, value, rank, hint }: {
  label: string; value: number; rank: number; hint?: string
}) {
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="text-2xl font-bold leading-none"><CountUp value={value} /></p>
      <div className="mt-1"><RankChip rank={rank} /></div>
      {hint && <p className="mt-0.5 text-[9px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

// ----------------------------------------------------------------- roster
function RosterTab({ team, roster }: { team: Team; roster: Player[] }) {
  const { t, f } = useI18n()
  const [sort, setSort] = useState<'pts' | 'min' | 'per' | 'salary' | 'age'>('pts')
  const sorted = useMemo(
    () => [...roster].sort((a, b) => (b[sort] as number) - (a[sort] as number)),
    [roster, sort])

  return (
    <div className="space-y-4">
      <SectionTitle title={t.team.tabs.roster} sub={t.team.rosterSub(roster.length, team.season)}
        right={<Segmented size="sm" value={sort} onChange={setSort} options={[
          { value: 'pts', label: t.stat.pts }, { value: 'min', label: t.stat.min },
          { value: 'per', label: t.stat.per }, { value: 'salary', label: t.abbr.salary },
          { value: 'age', label: t.stat.age },
        ]} />} />

      <motion.div variants={stagger} initial="hidden" animate="show"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <motion.div key={p.playerId} variants={riseItem} layout>
            <Link to={`/players/${p.playerId}`}>
              <GlassCard hover sheen padded={false} className="overflow-hidden"
                style={{ background: `linear-gradient(140deg, ${team.primaryColor}22, var(--surface-glass) 60%)` }}>
                <div className="flex items-center gap-3 p-3">
                  <PlayerAvatar playerId={p.playerId} name={p.name} color={team.primaryColor} size={64} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold leading-tight">{p.name}</p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {p.position} · {p.bio.heightLabel} · {t.common.yearsOld(p.age)}
                      {p.isRookie && (
                        <span className="ml-1 text-[var(--accent-lit)]">· {t.common.rookie}</span>
                      )}
                    </p>
                    <p className="num text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {f.money(p.salary)}
                    </p>
                  </div>
                  {p.rings > 0 && (
                    <span className="num shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}
                      title={t.player.trophyCaseChampionships(p.rings)}>
                      {p.rings}◎
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                  {([[t.abbr.min, f.dec(p.min)], [t.abbr.pts, f.dec(p.pts)], [t.abbr.reb, f.dec(p.reb)],
                     [t.abbr.ast, f.dec(p.ast)], [t.abbr.per, f.dec(p.per)]] as const).map(([k, v]) => (
                    <div key={k} className="border-r px-1 py-1.5 last:border-0"
                      style={{ borderColor: 'var(--border)' }}>
                      <dt className="text-[8px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{k}</dt>
                      <dd className="num text-sm font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
              </GlassCard>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <GlassCard>
        <SectionTitle title={t.team.rosterTable} sub={t.team.rosterTableSub} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {[t.abbr.player, t.abbr.pos, t.stat.age, t.abbr.ht, t.abbr.min, t.abbr.pts,
                  t.abbr.reb, t.abbr.ast, t.abbr.stl, t.abbr.blk, t.abbr.fgPct, t.abbr.fg3Pct,
                  t.abbr.ts, t.abbr.per, t.abbr.vorp, t.abbr.salary].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.playerId} className="border-b last:border-0 hover-layer-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="whitespace-nowrap px-2 py-2">
                    <Link to={`/players/${p.playerId}`} className="font-semibold hover:text-[var(--brand-lit)]">
                      {p.name}
                    </Link>
                  </td>
                  <td className="px-2 py-2">{p.position}</td>
                  <td className="num px-2 py-2">{p.age}</td>
                  <td className="num whitespace-nowrap px-2 py-2">{p.bio.heightLabel}</td>
                  <td className="num px-2 py-2">{f.dec(p.min)}</td>
                  <td className="num px-2 py-2 font-bold">{f.dec(p.pts)}</td>
                  <td className="num px-2 py-2">{f.dec(p.reb)}</td>
                  <td className="num px-2 py-2">{f.dec(p.ast)}</td>
                  <td className="num px-2 py-2">{f.dec(p.stl)}</td>
                  <td className="num px-2 py-2">{f.dec(p.blk)}</td>
                  <td className="num px-2 py-2">{f.dec(p.shooting.fgPct * 100)}</td>
                  <td className="num px-2 py-2">{f.dec(p.shooting.fg3Pct * 100)}</td>
                  <td className="num px-2 py-2">{f.dec(p.ts * 100)}</td>
                  <td className="num px-2 py-2">{f.dec(p.per)}</td>
                  <td className="num px-2 py-2">{f.dec(p.vorp)}</td>
                  <td className="num px-2 py-2">{f.money(p.salary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  )
}

// ------------------------------------------------------------------ stats
function StatsTab({ team, rival, setRival, colors }: {
  team: Team; rival: Team | null; setRival: (t: Team) => void; colors: string[]
}) {
  const { t, f } = useI18n()
  const pctOf = (rank: number) => Math.round(((30 - rank) / 29) * 100)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.team.profileTitle} sub={t.team.profileSub} />
          <div className="grid gap-3 sm:grid-cols-2">
            <PercentileBar label={t.stat.offRating} value={team.offRating} percentile={pctOf(team.offRatingRank)} />
            <PercentileBar label={t.stat.defRating} value={team.defRating} percentile={pctOf(team.defRatingRank)}
              hint={t.team.defenceHint} />
            <PercentileBar label={t.stat.netRating} value={team.netRating} percentile={pctOf(team.netRatingRank)}
              format={(v) => f.signed(v)} />
            <PercentileBar label={t.stat.pace} value={team.pace} percentile={pctOf(team.paceRank)} />
            <PercentileBar label={t.stat.winPct} value={team.winPct * 100} percentile={pctOf(team.winPctRank)}
              format={(v) => `${f.dec(v)}%`} />
            <PercentileBar label={t.team.teamTs} value={team.tsPct * 100} percentile={62}
              format={(v) => `${f.dec(v)}%`} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.team.scoringIdentity} sub={t.team.scoringIdentitySub} />
          <div className="grid grid-cols-3 gap-3">
            <BigStat label={t.team.scored} value={team.pointsPerGame} tone="var(--brand-lit)" />
            <BigStat label={t.team.allowed} value={team.pointsAllowed} tone="var(--accent-lit)" />
            <BigStat label={t.team.differential} value={team.pointDiff} tone={team.pointDiff >= 0 ? 'var(--good)' : 'var(--bad)'} signed />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            {([
              [t.team.possPer48, f.dec(team.pace)],
              [t.team.teamTs, f.pct(team.tsPct, 1)],
              [t.team.threeShare, f.pct(team.threeRate, 1)],
              [t.team.weightedAge, t.common.years(f.dec(team.avgAge))],
              [t.team.payrollOnBooks, f.money(team.payroll)],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                <dt style={{ color: 'var(--text-2)' }}>{k}</dt>
                <dd className="num font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>

      <GlassCard>
        <SectionTitle title={t.team.matchupDefence} sub={t.team.matchupDefenceSub} />
        <div className="grid grid-cols-5 gap-2">
          {(['pg', 'sg', 'sf', 'pf', 'c'] as const).map((pos) => {
            const v = team.defVsPosition[pos] ?? 0
            const soft = v > 0
            return (
              <div key={pos} className="rounded-xl px-2 py-3 text-center"
                style={{ background: `color-mix(in srgb, ${soft ? 'var(--bad)' : 'var(--good)'} 12%, transparent)` }}>
                <p className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>{pos}</p>
                <p className="num text-xl font-bold"
                  style={{ color: soft ? 'var(--bad)' : 'var(--good)' }}>{f.signed(v)}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {soft ? t.team.soft : t.team.tough}
                </p>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {t.team.matchupNote}
        </p>
      </GlassCard>

      <div>
        <SectionTitle title={t.team.compareTitle}
          sub={t.team.compareSub}
          right={<div className="w-64"><TeamPicker value={rival} onChange={setRival} /></div>} />
        {rival && rival.abbr !== team.abbr && (
          <div className="grid gap-4 lg:grid-cols-2">
            <CompareBars
              title={t.team.headToHeadNumbers}
              sub={t.team.lowerDefBetter}
              height={300}
              data={[
                { label: t.predictTeam.offence, [team.abbr]: team.offRating, [rival.abbr]: rival.offRating },
                { label: t.predictTeam.defence, [team.abbr]: team.defRating, [rival.abbr]: rival.defRating },
                { label: t.stat.pace, [team.abbr]: team.pace, [rival.abbr]: rival.pace },
                { label: t.team.scored, [team.abbr]: team.pointsPerGame, [rival.abbr]: rival.pointsPerGame },
                { label: t.team.allowed, [team.abbr]: team.pointsAllowed, [rival.abbr]: rival.pointsAllowed },
              ]}
              series={[
                { key: team.abbr, label: team.fullName, color: colors[0] },
                { key: rival.abbr, label: rival.fullName, color: colors[1] },
              ]}
              table={{
                columns: [t.common.metric, team.abbr, rival.abbr],
                rows: [
                  [t.predictTeam.offence, f.dec(team.offRating), f.dec(rival.offRating)],
                  [t.predictTeam.defence, f.dec(team.defRating), f.dec(rival.defRating)],
                  [t.stat.pace, f.dec(team.pace), f.dec(rival.pace)],
                  [t.stat.record, `${team.wins}-${team.losses}`, `${rival.wins}-${rival.losses}`],
                ],
              }}
            />
            <GlassCard>
              <SectionTitle title={t.team.sideBySide} />
              <div className="space-y-2">
                {([
                  [t.stat.record, `${team.wins}-${team.losses}`, `${rival.wins}-${rival.losses}`, team.winPct > rival.winPct],
                  [t.stat.netRating, f.signed(team.netRating), f.signed(rival.netRating), team.netRating > rival.netRating],
                  [t.predictTeam.offence, f.dec(team.offRating), f.dec(rival.offRating), team.offRating > rival.offRating],
                  [t.predictTeam.defence, f.dec(team.defRating), f.dec(rival.defRating), team.defRating < rival.defRating],
                  [t.stat.pace, f.dec(team.pace), f.dec(rival.pace), team.pace > rival.pace],
                  [t.stat.payroll, f.money(team.payroll), f.money(rival.payroll), team.payroll > rival.payroll],
                  [t.stat.titles, String(team.franchise.titleCount), String(rival.franchise.titleCount),
                    team.franchise.titleCount > rival.franchise.titleCount],
                ] as const).map(([label, a, b, aWins]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <span className="num text-right text-sm font-bold"
                      style={{ color: aWins ? colors[0] : 'var(--text-2)' }}>{a}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{label}</span>
                    <span className="num text-sm font-bold"
                      style={{ color: !aWins ? colors[1] : 'var(--text-2)' }}>{b}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link to={`/predict/team?home=${team.abbr}&away=${rival.abbr}`}
                  className="rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A] py-2.5
                             text-center text-xs font-bold uppercase tracking-widest text-white">
                  {t.team.forecastGame}
                </Link>
                <Link to={`/simulate?home=${team.abbr}&away=${rival.abbr}`}
                  className="rounded-xl bg-gradient-to-br from-[#C8102E] to-[#7A0A1C] py-2.5
                             text-center text-xs font-bold uppercase tracking-widest text-white">
                  {t.team.simulateWatch}
                </Link>
              </div>
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  )
}

function BigStat({ label, value, tone, signed: isSigned }: {
  label: string; value: number; tone: string; signed?: boolean
}) {
  return (
    <div className="rounded-xl px-3 py-4 text-center" style={{ background: 'var(--layer-1)' }}>
      <p className="eyebrow">{label}</p>
      <p className="text-3xl font-bold leading-none" style={{ color: tone }}>
        {isSigned && value > 0 ? '+' : ''}<CountUp value={value} />
      </p>
    </div>
  )
}

// -------------------------------------------------------------------- cap
function CapTab({ team, roster, colors }: { team: Team; roster: Player[]; colors: string[] }) {
  const { t, f } = useI18n()
  const committed = roster.reduce((s, p) => s + p.salary, 0)
  const space = CAP - committed
  const tax = Math.max(0, committed - LUXURY_TAX)
  const capPct = Math.min(100, (committed / CAP) * 100)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="lg:col-span-2">
        <SectionTitle title={t.team.payrollTitle} sub={t.team.payrollSub(team.season)} />
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span style={{ color: 'var(--text-2)' }}>{t.team.committed}</span>
            <span className="num font-bold">{f.money(committed)} / {f.money(CAP)}</span>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full" style={{ background: 'var(--layer-2)' }}>
            <motion.div initial={{ width: 0 }} animate={{ width: `${capPct}%` }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${team.primaryColor}, ${colors[0]})` }} />
            <span aria-hidden className="absolute inset-y-0 w-0.5"
              style={{ left: `${(LUXURY_TAX / CAP) * 100}%`, background: 'var(--text)' }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>{t.team.salaryCap} <b className="num text-[var(--text-2)]">{f.money(CAP)}</b></span>
            <span>{t.team.luxuryTax} <b className="num text-[var(--text-2)]">{f.money(LUXURY_TAX)}</b></span>
            <span>
              {tax > 0
                ? <>{t.team.inTaxBy} <b className="num" style={{ color: 'var(--bad)' }}>{f.money(tax)}</b></>
                : <>{t.team.roomUnderCap} <b className="num" style={{ color: 'var(--good)' }}>{f.money(space)}</b></>}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {[t.abbr.player, t.stat.age, t.stat.salary, t.team.modelledValue,
                  t.team.surplusCol, t.team.shareOfCap].map((h) => (
                  <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...roster].sort((a, b) => b.salary - a.salary).map((p) => (
                <tr key={p.playerId} className="border-b last:border-0 hover-layer-1"
                  style={{ borderColor: 'var(--border)' }}>
                  <td className="px-2 py-2">
                    <Link to={`/players/${p.playerId}`} className="font-semibold hover:text-[var(--brand-lit)]">
                      {p.name}
                    </Link>
                  </td>
                  <td className="num px-2 py-2">{p.age}</td>
                  <td className="num px-2 py-2 font-bold">{f.money(p.salary)}</td>
                  <td className="num px-2 py-2">{f.money(p.estimatedValue)}</td>
                  <td className="num px-2 py-2 font-semibold"
                    style={{ color: p.surplus >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                    {p.surplus >= 0 ? '+' : '−'}{f.money(Math.abs(p.surplus))}
                  </td>
                  <td className="px-2 py-2">
                    <div className="h-2 w-full max-w-[120px] overflow-hidden rounded-full"
                      style={{ background: 'var(--layer-2)' }}>
                      <span className="block h-full rounded-full"
                        style={{ width: `${(p.salary / CAP) * 100 * 2.5}%`, background: team.primaryColor }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {t.team.capNote}
        </p>
      </GlassCard>

      <GlassCard>
        <SectionTitle title={t.team.contractsTitle} sub={t.team.contractsSub} />
        {(() => {
          const sorted = [...roster].sort((a, b) => b.surplus - a.surplus)
          const best = sorted.slice(0, 3)
          const worst = sorted.slice(-3).reverse()
          return (
            <div className="space-y-4">
              <div>
                <p className="eyebrow mb-2">{t.team.bargains}</p>
                <ul className="space-y-1.5">
                  {best.map((p) => <ContractRow key={p.playerId} p={p} team={team} good />)}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-2">{t.team.overpaid}</p>
                <ul className="space-y-1.5">
                  {worst.map((p) => <ContractRow key={p.playerId} p={p} team={team} />)}
                </ul>
              </div>
            </div>
          )
        })()}
      </GlassCard>
    </div>
  )
}

function ContractRow({ p, team, good }: { p: Player; team: Team; good?: boolean }) {
  const { f } = useI18n()
  return (
    <li>
      <Link to={`/players/${p.playerId}`}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
        <PlayerAvatar playerId={p.playerId} name={p.name} color={team.primaryColor} size={30} ring={false} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
        <span className="num text-xs font-bold"
          style={{ color: good ? 'var(--good)' : 'var(--bad)' }}>
          {p.surplus >= 0 ? '+' : '−'}{f.money(Math.abs(p.surplus))}
        </span>
      </Link>
    </li>
  )
}

// ---------------------------------------------------------------- history
function HistoryTab({ team }: { team: Team }) {
  const { t } = useI18n()
  const fr = team.franchise
  const finals = engine.RECENT_FINALS ?? []
  const theirFinals = finals.filter((x) => x.champion === team.abbr || x.runnerUp === team.abbr)
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionTitle title={t.team.rafters}
          sub={fr.titleCount
            ? t.team.raftersSub(fr.titleCount, fr.lastTitle)
            : t.team.noTitle} />
        <BannerRafters franchise={fr} primary={team.primaryColor}
          secondary={team.secondaryColor} abbr={team.abbr} />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.team.franchiseFacts} />
          <dl className="space-y-2 text-sm">
            {([
              [t.team.founded, String(fr.founded ?? '—')],
              [t.team.homeArena, fr.arena ?? '—'],
              [t.team.conference, team.conference === 'East' ? t.common.eastern : t.common.western],
              [t.team.division, team.division],
              [t.team.championships, String(fr.titleCount)],
              [t.team.mostRecentTitle, fr.lastTitle ? String(fr.lastTitle) : t.common.none],
              [t.team.titleDrought, fr.titleDrought !== null ? String(fr.titleDrought) : '—'],
              [t.team.abaChampionships, String(fr.abaChampionships?.length ?? 0)],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                <dt style={{ color: 'var(--text-2)' }}>{k}</dt>
                <dd className="num font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.team.recentFinals} sub={t.team.recentFinalsSub} />
          <ul className="space-y-1.5">
            {finals.map((x) => {
              const champ = engine.getTeam(x.champion)
              const runner = engine.getTeam(x.runnerUp)
              const involved = x.champion === team.abbr || x.runnerUp === team.abbr
              return (
                <li key={x.year}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  style={{ background: involved ? 'var(--layer-2)' : 'transparent' }}>
                  <span className="num w-10 text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                    {x.year}
                  </span>
                  {champ && <TeamLogo teamId={champ.teamId} abbr={champ.abbr} size={20} />}
                  <span className="text-sm font-semibold">{champ?.abbr}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.team.def}</span>
                  {runner && <TeamLogo teamId={runner.teamId} abbr={runner.abbr} size={18} />}
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{runner?.abbr}</span>
                  <span className="ml-auto truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {x.finalsMvp}
                  </span>
                </li>
              )
            })}
          </ul>
          {theirFinals.length === 0 && (
            <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {t.team.noFinals(team.abbr)}
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
