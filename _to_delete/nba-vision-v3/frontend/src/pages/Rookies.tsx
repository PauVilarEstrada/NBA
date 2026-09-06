import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CountUp } from '@/components/ui/Numbers'
import { CardGridSkeleton } from '@/components/ui/Loading'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { ChartFrame, TooltipBox } from '@/components/charts/ChartFrame'
import { useChartTokens } from '@/lib/palette'
import { api, SEASON_LABEL } from '@/lib/api'
import * as engine from '@/lib/engine'
import { dec, money } from '@/lib/format'
import type { Player } from '@/types'

const SORTS = [
  { value: 'pick', label: 'Draft order' },
  { value: 'pts', label: 'Points' },
  { value: 'roy', label: 'ROY race' },
  { value: 'per', label: 'PER' },
] as const

/**
 * Rookie of the Year score.
 *
 * Voters do not reward raw counting stats alone — a rookie on 30 minutes for a
 * playoff team beats one padding numbers on a 20-win roster. This blends
 * production, efficiency, role and team success into one comparable number, and
 * shows its components so the ranking is arguable rather than magic.
 */
function royScore(p: Player): { total: number; parts: Array<{ label: string; value: number }> } {
  const team = engine.getTeam(p.teamId)
  const production = p.pts + 1.2 * p.reb + 1.5 * p.ast + 2 * p.stl + 2 * p.blk - p.tov
  const efficiency = (p.ts - 0.52) * 100
  const role = p.min * 0.55
  const winning = (team ? team.winPct - 0.5 : 0) * 30
  const parts = [
    { label: 'Production', value: Math.round(production * 1.2 * 10) / 10 },
    { label: 'Efficiency', value: Math.round(efficiency * 0.8 * 10) / 10 },
    { label: 'Role', value: Math.round(role * 10) / 10 },
    { label: 'Team success', value: Math.round(winning * 10) / 10 },
  ]
  return { total: Math.round(parts.reduce((s, x) => s + x.value, 0) * 10) / 10, parts }
}

export default function Rookies() {
  const tokens = useChartTokens()
  const [rows, setRows] = useState<Player[] | null>(null)
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('pick')

  useEffect(() => { api.rookies().then(setRows) }, [])

  const ranked = useMemo(() => {
    if (!rows) return []
    const withScore = rows.map((p) => ({ p, roy: royScore(p) }))
    const sorted = [...withScore]
    if (sort === 'pick') sorted.sort((a, b) => (a.p.bio.draftPick ?? 99) - (b.p.bio.draftPick ?? 99))
    if (sort === 'pts') sorted.sort((a, b) => b.p.pts - a.p.pts)
    if (sort === 'per') sorted.sort((a, b) => b.p.per - a.p.per)
    if (sort === 'roy') sorted.sort((a, b) => b.roy.total - a.roy.total)
    return sorted
  }, [rows, sort])

  const royRace = useMemo(() => {
    if (!rows) return []
    return rows.map((p) => ({ p, roy: royScore(p) }))
      .sort((a, b) => b.roy.total - a.roy.total).slice(0, 8)
  }, [rows])

  if (!rows) {
    return (
      <PageTransition>
        <SectionTitle title="Rookie class" sub="Loading the draft board…" />
        <CardGridSkeleton count={8} />
      </PageTransition>
    )
  }

  const classYear = rows[0]?.bio.draftYear ?? engine.SEASON
  const topScorer = [...rows].sort((a, b) => b.pts - a.pts)[0]
  const leader = royRace[0]

  return (
    <PageTransition>
      {/* -------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8"
        style={{ background: 'linear-gradient(130deg, rgba(200,16,46,.28), rgba(29,66,138,.28) 55%, transparent)' }}>
        <span aria-hidden className="absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-30 blur-[100px]"
          style={{ background: '#C8102E' }} />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div>
            <Badge tone="accent">{classYear} draft class</Badge>
            <h1 className="headline mt-3 text-[clamp(2.25rem,6vw,4.5rem)]">
              The rookies
            </h1>
            <p className="mt-2 max-w-xl text-sm" style={{ color: 'var(--text-2)' }}>
              Every first-year player in the index, their draft slot, where they came from and how
              the {SEASON_LABEL} season is going. The Rookie of the Year race is scored below.
            </p>
          </div>
          {leader && (
            <Link to={`/players/${leader.p.playerId}`} className="glass glass-hover rounded-2xl p-4">
              <p className="eyebrow">ROY front-runner</p>
              <div className="mt-2 flex items-center gap-3">
                <PlayerAvatar playerId={leader.p.playerId} name={leader.p.name}
                  color={engine.getTeam(leader.p.teamId)?.primaryColor} size={64} />
                <div>
                  <p className="font-display text-2xl font-bold leading-none">{leader.p.name}</p>
                  <p className="num text-xs" style={{ color: 'var(--text-muted)' }}>
                    {leader.p.team} · pick {leader.p.bio.draftPick} · {dec(leader.p.pts)} PPG
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>

        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroTile label="Rookies tracked" value={rows.length} decimals={0} />
          <HeroTile label="Top scorer" value={topScorer?.pts ?? 0} suffix=" PPG"
            caption={topScorer?.name} />
          <HeroTile label="Average minutes"
            value={rows.reduce((s, p) => s + p.min, 0) / rows.length} suffix=" min" />
          <HeroTile label="Class payroll"
            value={rows.reduce((s, p) => s + p.salary, 0) / 1e6} suffix="M" decimals={1} prefix="$" />
        </div>
      </section>

      {/* --------------------------------------------------- ROY race */}
      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <ChartFrame
          title="Rookie of the Year race"
          sub="A blended score: production, efficiency, role and team success"
          height={320}
          table={{
            columns: ['Rookie', 'Team', 'Score', 'PTS', 'MIN', 'TS%'],
            rows: royRace.map(({ p, roy }) => [
              p.name, p.team, roy.total, dec(p.pts), dec(p.min), `${(p.ts * 100).toFixed(1)}%`,
            ]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={royRace.map(({ p, roy }) => ({
              name: p.lastName, score: roy.total, color: engine.getTeam(p.teamId)?.primaryColor,
            }))} layout="vertical" margin={{ top: 4, right: 34, bottom: 4, left: 10 }}>
              <CartesianGrid stroke="var(--grid)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={96}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ fill: 'var(--layer-1)' }}
                content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipBox title={String(label)} rows={[{
                    label: 'ROY score', value: dec(Number(payload[0].value)),
                  }]} />
                ) : null} />
              {/* Bars are coloured by team, which is an identity encoding, so the
                  team badge next to each name carries the same information. */}
              <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                {royRace.map(({ p }, i) => (
                  <Cell key={i} fill={engine.getTeam(p.teamId)?.primaryColor ?? tokens.series[0]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartFrame>

        <GlassCard>
          <SectionTitle title="How the score breaks down" sub="Top five, component by component" />
          <div className="space-y-3">
            {royRace.slice(0, 5).map(({ p, roy }, i) => (
              <div key={p.playerId} className="rounded-xl p-3" style={{ background: 'var(--layer-1)' }}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="num w-5 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                    {i + 1}
                  </span>
                  <PlayerAvatar playerId={p.playerId} name={p.name}
                    color={engine.getTeam(p.teamId)?.primaryColor} size={28} ring={false} />
                  <Link to={`/players/${p.playerId}`}
                    className="flex-1 truncate text-sm font-semibold hover:text-[var(--brand-lit)]">
                    {p.name}
                  </Link>
                  <span className="num text-base font-bold">{roy.total}</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full">
                  {roy.parts.map((part, j) => (
                    <span key={part.label}
                      title={`${part.label}: ${part.value}`}
                      style={{
                        width: `${Math.max(0, (part.value / Math.max(roy.total, 1)) * 100)}%`,
                        background: tokens.series[j],
                        marginRight: j < roy.parts.length - 1 ? 2 : 0,
                      }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            {['Production', 'Efficiency', 'Role', 'Team success'].map((label, j) => (
              <li key={label} className="flex items-center gap-1.5 text-[11px]"
                style={{ color: 'var(--text-2)' }}>
                <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: tokens.series[j] }} />
                {label}
              </li>
            ))}
          </ul>
        </GlassCard>
      </section>

      {/* ------------------------------------------------- draft board */}
      <section className="mt-6">
        <SectionTitle title="Draft board" sub={`${classYear} first round · click a card for the profile`}
          right={<Segmented value={sort} onChange={setSort} options={SORTS.map((s) => ({ ...s }))} />} />

        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ranked.map(({ p, roy }, i) => {
            const team = engine.getTeam(p.teamId)!
            return (
              <motion.div key={p.playerId} variants={riseItem} layout>
                <Link to={`/players/${p.playerId}`}>
                  <GlassCard hover sheen padded={false} className="relative overflow-hidden"
                    style={{ background: `linear-gradient(150deg, ${team.primaryColor}2A, var(--surface-glass) 62%)` }}>
                    {/* the pick number, big and in the corner, like a draft card */}
                    <span aria-hidden
                      className="headline absolute -right-1 -top-3 text-[64px] leading-none opacity-15"
                      style={{ color: team.primaryColor }}>
                      {p.bio.draftPick ?? '—'}
                    </span>
                    <div className="relative flex items-start gap-3 p-3">
                      <PlayerAvatar playerId={p.playerId} name={p.name}
                        color={team.primaryColor} size={68} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--text-2)' }}>
                          <TeamLogo teamId={team.teamId} abbr={team.abbr} size={14} />
                          {team.abbr} · {p.position}
                        </p>
                        <p className="truncate font-display text-lg font-bold leading-tight">{p.name}</p>
                        <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {p.bio.origin ?? '—'} · {p.bio.heightLabel} · {p.bio.country}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                      {([['PTS', dec(p.pts)], ['REB', dec(p.reb)], ['AST', dec(p.ast)],
                         ['ROY', String(roy.total)]] as const).map(([k, v]) => (
                        <div key={k} className="border-r px-1 py-1.5 last:border-0"
                          style={{ borderColor: 'var(--border)' }}>
                          <dt className="text-[8px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)' }}>{k}</dt>
                          <dd className="num text-sm font-bold"
                            style={{ color: k === 'ROY' ? team.primaryColor : undefined }}>{v}</dd>
                        </div>
                      ))}
                    </dl>
                    {sort !== 'pick' && (
                      <span className="absolute left-2 top-2 num rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{ background: 'var(--layer-3)' }}>#{i + 1}</span>
                    )}
                  </GlassCard>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* ------------------------------------------------ class table */}
      <section className="mt-6">
        <GlassCard>
          <SectionTitle title="Class table" sub="Every rookie, every column" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                  {['Pick', 'Player', 'Team', 'Pos', 'From', 'Ht', 'MIN', 'PTS', 'REB', 'AST',
                    'TS%', 'PER', 'Salary'].map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...rows].sort((a, b) => (a.bio.draftPick ?? 99) - (b.bio.draftPick ?? 99)).map((p) => (
                  <tr key={p.playerId} className="border-b last:border-0 hover-layer-1"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="num px-2 py-2 font-bold">{p.bio.draftPick ?? '—'}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <Link to={`/players/${p.playerId}`} className="font-semibold hover:text-[var(--brand-lit)]">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{p.team}</td>
                    <td className="px-2 py-2">{p.position}</td>
                    <td className="whitespace-nowrap px-2 py-2" style={{ color: 'var(--text-2)' }}>
                      {p.bio.origin ?? '—'}
                    </td>
                    <td className="num whitespace-nowrap px-2 py-2">{p.bio.heightLabel}</td>
                    <td className="num px-2 py-2">{dec(p.min)}</td>
                    <td className="num px-2 py-2 font-bold">{dec(p.pts)}</td>
                    <td className="num px-2 py-2">{dec(p.reb)}</td>
                    <td className="num px-2 py-2">{dec(p.ast)}</td>
                    <td className="num px-2 py-2">{(p.ts * 100).toFixed(1)}</td>
                    <td className="num px-2 py-2">{dec(p.per)}</td>
                    <td className="num px-2 py-2">{money(p.salary)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </section>
    </PageTransition>
  )
}

function HeroTile({ label, value, decimals = 1, prefix = '', suffix = '', caption }: {
  label: string; value: number; decimals?: number; prefix?: string; suffix?: string; caption?: string
}) {
  return (
    <div className="glass rounded-xl px-3 py-2.5">
      <p className="eyebrow">{label}</p>
      <p className="text-2xl font-bold leading-none">
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
      {caption && <p className="mt-0.5 truncate text-[10px]" style={{ color: 'var(--text-muted)' }}>{caption}</p>}
    </div>
  )
}
