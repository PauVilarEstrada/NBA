import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { EmptyState, SectionTitle, Segmented } from '@/components/ui/Bits'
import { CountUp } from '@/components/ui/Numbers'
import { TrophyCase } from '@/components/ui/Trophies'
import { PlayerPicker } from '@/components/ui/Pickers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { SkillRadar } from '@/components/charts/SkillRadar'
import { CompareBars } from '@/components/charts/CompareBars'
import { useChartTokens } from '@/lib/palette'
import * as engine from '@/lib/engine'
import { dec, money } from '@/lib/format'
import type { Player } from '@/types'

const SLOTS = 4
const KEYS = ['a', 'b', 'c', 'd'] as const

interface Row {
  key: string
  label: string
  get: (p: Player) => number
  fmt: (v: number) => string
  higherIsBetter: boolean
  percentileKey?: string
  group: 'box' | 'shooting' | 'advanced' | 'value'
}

const ROWS: Row[] = [
  { key: 'pts', label: 'Points', get: (p) => p.pts, fmt: dec, higherIsBetter: true, percentileKey: 'pts', group: 'box' },
  { key: 'reb', label: 'Rebounds', get: (p) => p.reb, fmt: dec, higherIsBetter: true, percentileKey: 'reb', group: 'box' },
  { key: 'ast', label: 'Assists', get: (p) => p.ast, fmt: dec, higherIsBetter: true, percentileKey: 'ast', group: 'box' },
  { key: 'stl', label: 'Steals', get: (p) => p.stl, fmt: dec, higherIsBetter: true, percentileKey: 'stl', group: 'box' },
  { key: 'blk', label: 'Blocks', get: (p) => p.blk, fmt: dec, higherIsBetter: true, percentileKey: 'blk', group: 'box' },
  { key: 'tov', label: 'Turnovers', get: (p) => p.tov, fmt: dec, higherIsBetter: false, percentileKey: 'tov', group: 'box' },
  { key: 'min', label: 'Minutes', get: (p) => p.min, fmt: dec, higherIsBetter: true, percentileKey: 'min', group: 'box' },

  { key: 'fga', label: 'Field goals attempted', get: (p) => p.shooting.fga, fmt: dec, higherIsBetter: true, group: 'shooting' },
  { key: 'fgPct', label: 'Field goal %', get: (p) => p.shooting.fgPct * 100, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true, percentileKey: 'fgPct', group: 'shooting' },
  { key: 'fg3m', label: 'Threes made', get: (p) => p.fg3m, fmt: dec, higherIsBetter: true, percentileKey: 'fg3m', group: 'shooting' },
  { key: 'fg3Pct', label: 'Three-point %', get: (p) => p.shooting.fg3Pct * 100, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true, percentileKey: 'fg3Pct', group: 'shooting' },
  { key: 'efg', label: 'Effective FG%', get: (p) => p.shooting.efgPct * 100, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true, percentileKey: 'efgPct', group: 'shooting' },
  { key: 'ts', label: 'True shooting', get: (p) => p.ts * 100, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true, percentileKey: 'ts', group: 'shooting' },

  { key: 'per', label: 'PER', get: (p) => p.per, fmt: dec, higherIsBetter: true, percentileKey: 'per', group: 'advanced' },
  { key: 'bpm', label: 'Box plus/minus', get: (p) => p.bpm, fmt: (v) => (v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)), higherIsBetter: true, percentileKey: 'bpm', group: 'advanced' },
  { key: 'vorp', label: 'VORP', get: (p) => p.vorp, fmt: dec, higherIsBetter: true, percentileKey: 'vorp', group: 'advanced' },
  { key: 'ws', label: 'Win shares', get: (p) => p.ws, fmt: dec, higherIsBetter: true, percentileKey: 'ws', group: 'advanced' },
  { key: 'usg', label: 'Usage rate', get: (p) => p.usg * 100, fmt: (v) => `${v.toFixed(1)}%`, higherIsBetter: true, percentileKey: 'usg', group: 'advanced' },
  { key: 'ortg', label: 'Offensive rating', get: (p) => p.advanced.ortg, fmt: dec, higherIsBetter: true, group: 'advanced' },
  { key: 'drtg', label: 'Defensive rating', get: (p) => p.advanced.drtg, fmt: dec, higherIsBetter: false, group: 'advanced' },

  { key: 'salary', label: 'Cap hit', get: (p) => p.salary, fmt: money, higherIsBetter: true, group: 'value' },
  { key: 'value', label: 'Modelled value', get: (p) => p.estimatedValue, fmt: money, higherIsBetter: true, group: 'value' },
  { key: 'surplus', label: 'Surplus', get: (p) => p.surplus, fmt: (v) => `${v >= 0 ? '+' : '−'}${money(Math.abs(v))}`, higherIsBetter: true, group: 'value' },
  { key: 'age', label: 'Age', get: (p) => p.age, fmt: (v) => String(Math.round(v)), higherIsBetter: false, group: 'value' },
]

const GROUPS = [
  { value: 'box', label: 'Box score' },
  { value: 'shooting', label: 'Shooting' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'value', label: 'Contract' },
] as const

export default function ComparePlayers() {
  const tokens = useChartTokens()
  const [params, setParams] = useSearchParams()
  const [picks, setPicks] = useState<Array<Player | null>>(() => {
    const seeded = KEYS.map((k) => {
      const id = Number(params.get(k))
      return id ? engine.getPlayer(id) ?? null : null
    })
    if (!seeded.some(Boolean)) {
      const top = [...engine.PLAYERS].sort((x, y) => y.pts - x.pts)
      return [top[0], top[1], null, null]
    }
    return seeded
  })
  const [group, setGroup] = useState<(typeof GROUPS)[number]['value']>('box')

  useEffect(() => {
    const next = new URLSearchParams()
    picks.forEach((p, i) => { if (p) next.set(KEYS[i], String(p.playerId)) })
    setParams(next, { replace: true })
  }, [picks, setParams])

  const chosen = picks.filter(Boolean) as Player[]
  const radars = useMemo(() => chosen.map((p) => engine.radar(p)), [chosen])
  const axes = radars[0]?.map((r) => r.axis) ?? []
  const rows = ROWS.filter((r) => r.group === group)

  const set = (i: number, p: Player | null) =>
    setPicks((prev) => prev.map((x, j) => (j === i ? p : x)))

  /** Category wins, the way a fight card scores rounds. It is the fastest way
   *  to read a comparison, and it is honest because every row is shown below. */
  const scoreboard = useMemo(() => {
    if (chosen.length < 2) return []
    const wins = chosen.map(() => 0)
    for (const row of ROWS) {
      const values = chosen.map(row.get)
      const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values)
      const idx = values.findIndex((v) => v === best)
      if (idx >= 0) wins[idx]++
    }
    return wins
  }, [chosen])

  return (
    <PageTransition>
      <SectionTitle title="Compare players"
        sub={`Up to four at once, on ${engine.SEASON_LABEL} numbers. Every axis uses the same scale, so the shapes are comparable.`} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: SLOTS }).map((_, i) => (
          <PlayerPicker
            key={i} value={picks[i] ?? null} onChange={(p) => set(i, p)}
            placeholder={i < 2 ? 'Pick a player…' : 'Add another (optional)…'}
            exclude={chosen.map((p) => p.playerId)}
          />
        ))}
      </div>

      {chosen.length < 2 ? (
        <EmptyState title="Pick at least two players"
          hint="Use the boxes above — type a surname and hit Enter." />
      ) : (
        <>
          {/* ------------------------------------------------ versus card */}
          <GlassCard className="mb-4 overflow-hidden" padded={false}>
            <div className="grid" style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0,1fr))` }}>
              {chosen.map((p, i) => {
                const team = engine.getTeam(p.teamId)!
                const wins = scoreboard[i] ?? 0
                const isLeader = wins === Math.max(...scoreboard)
                return (
                  <div key={p.playerId} className="relative p-4"
                    style={{ background: `linear-gradient(180deg, ${team.primaryColor}30, transparent 70%)` }}>
                    <span aria-hidden className="absolute inset-x-0 top-0 h-1"
                      style={{ background: tokens.series[i] }} />
                    <div className="flex flex-col items-center text-center">
                      <PlayerAvatar playerId={p.playerId} name={p.name}
                        color={team.primaryColor} size={92} />
                      <Link to={`/players/${p.playerId}`}
                        className="mt-2 font-display text-lg font-bold leading-tight hover:text-[var(--brand-lit)]">
                        {p.name}
                      </Link>
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={13} />
                        {team.abbr} · {p.position} · {p.bio.heightLabel}
                      </span>
                      <span className="mt-2 num text-3xl font-bold"
                        style={{ color: isLeader ? tokens.series[i] : 'var(--text-2)' }}>
                        <CountUp value={wins} decimals={0} />
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>
                        categories won
                      </span>
                      {p.rings > 0 && (
                        <span className="num mt-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}>
                          {p.rings}× champion
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </GlassCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <SkillRadar
              axes={axes}
              series={chosen.map((p, i) => ({
                name: p.name, color: tokens.series[i],
                values: Object.fromEntries(radars[i].map((r) => [r.axis, r.value])),
              }))}
              height={360}
              title="Skill profiles overlaid"
            />
            <CompareBars
              title="Per-game production"
              sub="Same axis for every player — no rescaling tricks"
              height={360}
              data={ROWS.filter((r) => r.group === 'box').map((r) => ({
                label: r.label,
                ...Object.fromEntries(chosen.map((p) => [p.name, Number(r.get(p).toFixed(1))])),
              }))}
              series={chosen.map((p, i) => ({ key: p.name, label: p.name, color: tokens.series[i] }))}
              table={{
                columns: ['Stat', ...chosen.map((p) => p.name)],
                rows: ROWS.filter((r) => r.group === 'box')
                  .map((r) => [r.label, ...chosen.map((p) => r.fmt(r.get(p)))]),
              }}
            />
          </div>

          {/* --------------------------------------------- stat comparison */}
          <div className="mt-4">
            <SectionTitle title="Line by line"
              sub="The bar shows each player's league percentile, so a number is never shown without a reference"
              right={<Segmented value={group} onChange={setGroup} options={GROUPS.map((g) => ({ ...g }))} />} />

            <GlassCard>
              <div className="space-y-4">
                {rows.map((row) => {
                  const values = chosen.map(row.get)
                  const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values)
                  return (
                    <div key={row.key}>
                      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{row.label}</p>
                      <div className="space-y-1.5">
                        {chosen.map((p, i) => {
                          const v = row.get(p)
                          const isBest = v === best
                          const percentile = row.percentileKey
                            ? p.percentiles[row.percentileKey] ?? 50
                            : Math.round(100 * (Math.abs(v) / Math.max(...values.map(Math.abs), 1)))
                          return (
                            <div key={p.playerId} className="grid grid-cols-[92px_1fr_auto] items-center gap-2">
                              <span className="truncate text-xs font-semibold"
                                style={{ color: isBest ? tokens.series[i] : 'var(--text-2)' }}>
                                {p.lastName}
                              </span>
                              <div className="relative h-2.5 overflow-hidden rounded-full"
                                style={{ background: 'var(--layer-2)' }}>
                                <motion.span className="absolute inset-y-0 left-0 rounded-full"
                                  initial={{ width: 0 }}
                                  whileInView={{ width: `${Math.max(3, percentile)}%` }}
                                  viewport={{ once: true }}
                                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                  style={{ background: tokens.series[i], opacity: isBest ? 1 : 0.55 }} />
                              </div>
                              <span className={clsx('num w-24 text-right text-sm', isBest && 'font-bold')}
                                style={{ color: isBest ? tokens.series[i] : 'var(--text-2)' }}>
                                {row.fmt(v)}{isBest && chosen.length > 1 && ' ▲'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="mt-4 border-t pt-3 text-[11px]"
                style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                Turnovers, defensive rating and age are scored the other way round — lower wins the
                category. Advanced metrics are reconstructed from the per-game line in demo mode.
              </p>
            </GlassCard>
          </div>

          {/* ------------------------------------------------ trophy cases */}
          <div className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(chosen.length, 2)}, minmax(0,1fr))` }}>
            {chosen.map((p) => (
              <GlassCard key={p.playerId}>
                <SectionTitle title={`${p.lastName} — honours`}
                  sub={p.honours.length ? `${p.honours.length} categories` : 'None yet'} />
                <TrophyCase honours={p.honours} compact />
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </PageTransition>
  )
}
