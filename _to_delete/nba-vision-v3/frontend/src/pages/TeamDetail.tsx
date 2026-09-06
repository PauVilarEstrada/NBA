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
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { CompareBars } from '@/components/charts/CompareBars'
import { TeamPicker } from '@/components/ui/Pickers'
import { useChartTokens } from '@/lib/palette'
import { api } from '@/lib/api'
import * as engine from '@/lib/engine'
import { CAP, LUXURY_TAX } from '@/lib/cap'
import { dec, money, signed } from '@/lib/format'
import type { Player, Team } from '@/types'

type Tab = 'roster' | 'stats' | 'arena' | 'cap' | 'history'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'roster', label: 'Roster' },
  { value: 'stats', label: 'Team stats' },
  { value: 'arena', label: 'Arena & gate' },
  { value: 'cap', label: 'Cap sheet' },
  { value: 'history', label: 'History' },
]

export default function TeamDetail() {
  const { abbr } = useParams()
  const tokens = useChartTokens()
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
    return <PageTransition><EmptyState title="Team not found" /></PageTransition>
  }
  if (!data) {
    return <PageTransition><PageLoader label="Loading the team" sub="Roster, ratings, cap sheet and banners" /></PageTransition>
  }

  const { team, roster, leaders } = data

  return (
    <PageTransition>
      <TeamHero team={team} leaders={leaders} />

      <div className="sticky top-[92px] z-20 -mx-4 mb-4 mt-5 overflow-x-auto px-4 py-2 sm:-mx-6 sm:px-6"
        style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', backdropFilter: 'blur(12px)' }}>
        <Segmented value={tab} onChange={setTab} options={TABS} />
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
    </PageTransition>
  )
}

// ------------------------------------------------------------------- hero
function TeamHero({ team, leaders }: {
  team: Team; leaders: ReturnType<typeof engine.teamLeaders>
}) {
  const f = team.franchise
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
            <p className="eyebrow">{team.conference}ern Conference · {team.division}</p>
            <h1 className="headline text-[clamp(2rem,5.5vw,4.25rem)]">{team.fullName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{team.wins}-{team.losses}</Badge>
              <Badge tone={team.netRating >= 0 ? 'good' : 'bad'}>Net {signed(team.netRating)}</Badge>
              {f.titleCount > 0 && (
                <Badge tone="accent">{f.titleCount}× NBA champion</Badge>
              )}
              {v0.arena && <Badge>{v0.arena} · {v0.capacity.toLocaleString()} seats</Badge>}
              <Badge>Since {f.founded}</Badge>
            </div>
          </div>

          <div className="ml-auto grid grid-cols-2 gap-2 sm:grid-cols-4">
            <TeamStatTile label="Points" value={team.pointsPerGame} rank={team.pointsPerGameRank} />
            <TeamStatTile label="Offence" value={team.offRating} rank={team.offRatingRank} hint="per 100" />
            <TeamStatTile label="Defence" value={team.defRating} rank={team.defRatingRank} hint="per 100" />
            <TeamStatTile label="Pace" value={team.pace} rank={team.paceRank} hint="poss/48" />
          </div>
        </motion.div>

        {/* Team leaders strip — the faces behind the numbers */}
        <motion.div variants={riseItem} className="mt-6 flex flex-wrap gap-2">
          {(['pts', 'reb', 'ast', 'fg3m', 'per'] as const).map((k) => {
            const l = leaders[k]
            if (!l) return null
            const labels: Record<string, string> = {
              pts: 'Points', reb: 'Rebounds', ast: 'Assists', fg3m: 'Threes', per: 'PER',
            }
            return (
              <Link key={k} to={`/players/${l.playerId}`}
                className="glass glass-hover flex items-center gap-2.5 rounded-xl px-3 py-2">
                <PlayerAvatar playerId={l.playerId} name={l.name} color={team.primaryColor}
                  size={34} ring={false} />
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--text-muted)' }}>{labels[k]} leader</span>
                  <span className="block text-sm font-semibold leading-tight">{l.name}</span>
                </span>
                <span className="num ml-1 text-lg font-bold" style={{ color: team.primaryColor }}>
                  {dec(l.value)}
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
  const [sort, setSort] = useState<'pts' | 'min' | 'per' | 'salary' | 'age'>('pts')
  const sorted = useMemo(
    () => [...roster].sort((a, b) => (b[sort] as number) - (a[sort] as number)),
    [roster, sort])

  return (
    <div className="space-y-4">
      <SectionTitle title="Roster" sub={`${roster.length} players in the index · ${team.season}`}
        right={<Segmented size="sm" value={sort} onChange={setSort} options={[
          { value: 'pts', label: 'Points' }, { value: 'min', label: 'Minutes' },
          { value: 'per', label: 'PER' }, { value: 'salary', label: 'Salary' },
          { value: 'age', label: 'Age' },
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
                      {p.position} · {p.bio.heightLabel} · {p.age} yrs
                      {p.isRookie && <span className="ml-1 text-[var(--accent-lit)]">· Rookie</span>}
                    </p>
                    <p className="num text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {money(p.salary)}
                    </p>
                  </div>
                  {p.rings > 0 && (
                    <span className="num shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}
                      title={`${p.rings} championship${p.rings > 1 ? 's' : ''}`}>
                      {p.rings}◎
                    </span>
                  )}
                </div>
                <dl className="grid grid-cols-5 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                  {([['MIN', dec(p.min)], ['PTS', dec(p.pts)], ['REB', dec(p.reb)],
                     ['AST', dec(p.ast)], ['PER', dec(p.per)]] as const).map(([k, v]) => (
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
        <SectionTitle title="Roster table" sub="Every column, sortable by the control above" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {['Player', 'Pos', 'Age', 'Ht', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK',
                  'FG%', '3P%', 'TS%', 'PER', 'VORP', 'Salary'].map((h) => (
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
                  <td className="num px-2 py-2">{dec(p.min)}</td>
                  <td className="num px-2 py-2 font-bold">{dec(p.pts)}</td>
                  <td className="num px-2 py-2">{dec(p.reb)}</td>
                  <td className="num px-2 py-2">{dec(p.ast)}</td>
                  <td className="num px-2 py-2">{dec(p.stl)}</td>
                  <td className="num px-2 py-2">{dec(p.blk)}</td>
                  <td className="num px-2 py-2">{(p.shooting.fgPct * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{(p.shooting.fg3Pct * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{(p.ts * 100).toFixed(1)}</td>
                  <td className="num px-2 py-2">{dec(p.per)}</td>
                  <td className="num px-2 py-2">{dec(p.vorp)}</td>
                  <td className="num px-2 py-2">{money(p.salary)}</td>
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
  const pctOf = (rank: number) => Math.round(((30 - rank) / 29) * 100)
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Team profile" sub="Percentile is against the other 29 teams" />
          <div className="grid gap-3 sm:grid-cols-2">
            <PercentileBar label="Offensive rating" value={team.offRating} percentile={pctOf(team.offRatingRank)} />
            <PercentileBar label="Defensive rating" value={team.defRating} percentile={pctOf(team.defRatingRank)}
              hint="lower is better — percentile already inverted" />
            <PercentileBar label="Net rating" value={team.netRating} percentile={pctOf(team.netRatingRank)}
              format={(v) => signed(v)} />
            <PercentileBar label="Pace" value={team.pace} percentile={pctOf(team.paceRank)} />
            <PercentileBar label="Win percentage" value={team.winPct * 100} percentile={pctOf(team.winPctRank)}
              format={(v) => `${v.toFixed(1)}%`} />
            <PercentileBar label="Team true shooting" value={team.tsPct * 100} percentile={62}
              format={(v) => `${v.toFixed(1)}%`} />
          </div>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Scoring identity" sub="Rating × pace is the actual scoreboard" />
          <div className="grid grid-cols-3 gap-3">
            <BigStat label="Scored" value={team.pointsPerGame} tone="var(--brand-lit)" />
            <BigStat label="Allowed" value={team.pointsAllowed} tone="var(--accent-lit)" />
            <BigStat label="Differential" value={team.pointDiff} tone={team.pointDiff >= 0 ? 'var(--good)' : 'var(--bad)'} signed />
          </div>
          <dl className="mt-5 space-y-2 text-sm">
            {([
              ['Possessions per 48', dec(team.pace)],
              ['Team true shooting', `${(team.tsPct * 100).toFixed(1)}%`],
              ['Share of shots from three', `${(team.threeRate * 100).toFixed(1)}%`],
              ['Minutes-weighted age', `${dec(team.avgAge)} years`],
              ['Payroll on the books', money(team.payroll)],
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
        <SectionTitle title="Matchup defence"
          sub="Points conceded to each position, relative to league average — positive means a soft spot" />
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
                  style={{ color: soft ? 'var(--bad)' : 'var(--good)' }}>{signed(v)}</p>
                <p className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
                  {soft ? 'soft' : 'tough'}
                </p>
              </div>
            )
          })}
        </div>
        <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          This row is a direct input to the player projection model — a guard facing a team that
          concedes to guards gets a higher forecast.
        </p>
      </GlassCard>

      <div>
        <SectionTitle title="Compare with another team"
          sub="Same axes, same scale"
          right={<div className="w-64"><TeamPicker value={rival} onChange={setRival} /></div>} />
        {rival && rival.abbr !== team.abbr && (
          <div className="grid gap-4 lg:grid-cols-2">
            <CompareBars
              title="Head to head on the numbers"
              sub="Lower defensive rating is better"
              height={300}
              data={[
                { label: 'Offence', [team.abbr]: team.offRating, [rival.abbr]: rival.offRating },
                { label: 'Defence', [team.abbr]: team.defRating, [rival.abbr]: rival.defRating },
                { label: 'Pace', [team.abbr]: team.pace, [rival.abbr]: rival.pace },
                { label: 'Scored', [team.abbr]: team.pointsPerGame, [rival.abbr]: rival.pointsPerGame },
                { label: 'Allowed', [team.abbr]: team.pointsAllowed, [rival.abbr]: rival.pointsAllowed },
              ]}
              series={[
                { key: team.abbr, label: team.fullName, color: colors[0] },
                { key: rival.abbr, label: rival.fullName, color: colors[1] },
              ]}
              table={{
                columns: ['Metric', team.abbr, rival.abbr],
                rows: [
                  ['Offence', dec(team.offRating), dec(rival.offRating)],
                  ['Defence', dec(team.defRating), dec(rival.defRating)],
                  ['Pace', dec(team.pace), dec(rival.pace)],
                  ['Record', `${team.wins}-${team.losses}`, `${rival.wins}-${rival.losses}`],
                ],
              }}
            />
            <GlassCard>
              <SectionTitle title="Side by side" />
              <div className="space-y-2">
                {([
                  ['Record', `${team.wins}-${team.losses}`, `${rival.wins}-${rival.losses}`, team.winPct > rival.winPct],
                  ['Net rating', signed(team.netRating), signed(rival.netRating), team.netRating > rival.netRating],
                  ['Offence', dec(team.offRating), dec(rival.offRating), team.offRating > rival.offRating],
                  ['Defence', dec(team.defRating), dec(rival.defRating), team.defRating < rival.defRating],
                  ['Pace', dec(team.pace), dec(rival.pace), team.pace > rival.pace],
                  ['Payroll', money(team.payroll), money(rival.payroll), team.payroll > rival.payroll],
                  ['Titles', String(team.franchise.titleCount), String(rival.franchise.titleCount),
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
                  Forecast the game
                </Link>
                <Link to={`/simulate?home=${team.abbr}&away=${rival.abbr}`}
                  className="rounded-xl bg-gradient-to-br from-[#C8102E] to-[#7A0A1C] py-2.5
                             text-center text-xs font-bold uppercase tracking-widest text-white">
                  Simulate and watch
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
  const committed = roster.reduce((s, p) => s + p.salary, 0)
  const space = CAP - committed
  const tax = Math.max(0, committed - LUXURY_TAX)
  const capPct = Math.min(100, (committed / CAP) * 100)

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <GlassCard className="lg:col-span-2">
        <SectionTitle title="Payroll" sub={`${team.season} commitments for the listed roster`} />
        <div className="mb-5">
          <div className="mb-1.5 flex justify-between text-xs">
            <span style={{ color: 'var(--text-2)' }}>Committed</span>
            <span className="num font-bold">{money(committed)} / {money(CAP)}</span>
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
            <span>Salary cap <b className="num text-[var(--text-2)]">{money(CAP)}</b></span>
            <span>Luxury tax <b className="num text-[var(--text-2)]">{money(LUXURY_TAX)}</b></span>
            <span>
              {tax > 0
                ? <>In the tax by <b className="num" style={{ color: 'var(--bad)' }}>{money(tax)}</b></>
                : <>Room under the cap <b className="num" style={{ color: 'var(--good)' }}>{money(space)}</b></>}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                {['Player', 'Age', 'Cap hit', 'Modelled value', 'Surplus', 'Share of cap'].map((h) => (
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
                  <td className="num px-2 py-2 font-bold">{money(p.salary)}</td>
                  <td className="num px-2 py-2">{money(p.estimatedValue)}</td>
                  <td className="num px-2 py-2 font-semibold"
                    style={{ color: p.surplus >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                    {p.surplus >= 0 ? '+' : '−'}{money(Math.abs(p.surplus))}
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
          Modelled value is what the market-value model thinks he is worth: production, scaled by an
          age curve and availability, priced against the cap. Surplus is that minus what he is paid.
        </p>
      </GlassCard>

      <GlassCard>
        <SectionTitle title="Best and worst contracts" sub="By surplus value" />
        {(() => {
          const sorted = [...roster].sort((a, b) => b.surplus - a.surplus)
          const best = sorted.slice(0, 3)
          const worst = sorted.slice(-3).reverse()
          return (
            <div className="space-y-4">
              <div>
                <p className="eyebrow mb-2">Bargains</p>
                <ul className="space-y-1.5">
                  {best.map((p) => <ContractRow key={p.playerId} p={p} team={team} good />)}
                </ul>
              </div>
              <div>
                <p className="eyebrow mb-2">Overpaid</p>
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
  return (
    <li>
      <Link to={`/players/${p.playerId}`}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover-layer-1">
        <PlayerAvatar playerId={p.playerId} name={p.name} color={team.primaryColor} size={30} ring={false} />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
        <span className="num text-xs font-bold"
          style={{ color: good ? 'var(--good)' : 'var(--bad)' }}>
          {p.surplus >= 0 ? '+' : '−'}{money(Math.abs(p.surplus))}
        </span>
      </Link>
    </li>
  )
}

// ---------------------------------------------------------------- history
function HistoryTab({ team }: { team: Team }) {
  const f = team.franchise
  const finals = engine.RECENT_FINALS ?? []
  const theirFinals = finals.filter((x) => x.champion === team.abbr || x.runnerUp === team.abbr)
  return (
    <div className="space-y-4">
      <GlassCard>
        <SectionTitle title="The rafters"
          sub={f.titleCount
            ? `${f.titleCount} NBA championship${f.titleCount > 1 ? 's' : ''}${f.lastTitle ? `, the last in ${f.lastTitle}` : ''}`
            : 'No NBA championship yet'} />
        <BannerRafters franchise={f} primary={team.primaryColor}
          secondary={team.secondaryColor} abbr={team.abbr} />
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="Franchise facts" />
          <dl className="space-y-2 text-sm">
            {([
              ['Founded', String(f.founded ?? '—')],
              ['Home arena', f.arena ?? '—'],
              ['Conference', `${team.conference}ern`],
              ['Division', team.division],
              ['NBA championships', String(f.titleCount)],
              ['Most recent title', f.lastTitle ? String(f.lastTitle) : 'None'],
              ['Seasons since a title', f.titleDrought !== null ? String(f.titleDrought) : '—'],
              ['ABA championships', String(f.abaChampionships?.length ?? 0)],
            ] as const).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
                <dt style={{ color: 'var(--text-2)' }}>{k}</dt>
                <dd className="num font-bold">{v}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Recent Finals" sub="Last eight championship rounds" />
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
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>def.</span>
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
              {team.abbr} have not reached the Finals in this window.
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
