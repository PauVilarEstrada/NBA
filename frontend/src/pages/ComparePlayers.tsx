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
import { useI18n } from '@/i18n'
import type { Player } from '@/types'

const SLOTS = 4
const KEYS = ['a', 'b', 'c', 'd'] as const

const GROUP_KEYS = ['box', 'shooting', 'advanced', 'value'] as const
type GroupKey = (typeof GROUP_KEYS)[number]

interface Row {
  key: string
  label: string
  get: (p: Player) => number
  fmt: (v: number) => string
  higherIsBetter: boolean
  percentileKey?: string
  group: GroupKey
}

export default function ComparePlayers() {
  const tokens = useChartTokens()
  const { t, f } = useI18n()
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
  const [group, setGroup] = useState<GroupKey>('box')

  // Every row carries its own label and formatter, so the table is described
  // once and both the bars and the line-by-line list read from it.
  const allRows: Row[] = useMemo(() => {
    const d = (v: number) => f.dec(v)
    const p1 = (v: number) => f.pct(v / 100, 1)
    return [
      { key: 'pts', label: t.stat.pts, get: (p) => p.pts, fmt: d, higherIsBetter: true, percentileKey: 'pts', group: 'box' },
      { key: 'reb', label: t.stat.reb, get: (p) => p.reb, fmt: d, higherIsBetter: true, percentileKey: 'reb', group: 'box' },
      { key: 'ast', label: t.stat.ast, get: (p) => p.ast, fmt: d, higherIsBetter: true, percentileKey: 'ast', group: 'box' },
      { key: 'stl', label: t.stat.stl, get: (p) => p.stl, fmt: d, higherIsBetter: true, percentileKey: 'stl', group: 'box' },
      { key: 'blk', label: t.stat.blk, get: (p) => p.blk, fmt: d, higherIsBetter: true, percentileKey: 'blk', group: 'box' },
      { key: 'tov', label: t.stat.tov, get: (p) => p.tov, fmt: d, higherIsBetter: false, percentileKey: 'tov', group: 'box' },
      { key: 'min', label: t.stat.min, get: (p) => p.min, fmt: d, higherIsBetter: true, percentileKey: 'min', group: 'box' },

      { key: 'fga', label: t.stat.fga, get: (p) => p.shooting.fga, fmt: d, higherIsBetter: true, group: 'shooting' },
      { key: 'fgPct', label: t.stat.fgPct, get: (p) => p.shooting.fgPct * 100, fmt: p1, higherIsBetter: true, percentileKey: 'fgPct', group: 'shooting' },
      { key: 'fg3m', label: t.stat.fg3m, get: (p) => p.fg3m, fmt: d, higherIsBetter: true, percentileKey: 'fg3m', group: 'shooting' },
      { key: 'fg3Pct', label: t.stat.fg3Pct, get: (p) => p.shooting.fg3Pct * 100, fmt: p1, higherIsBetter: true, percentileKey: 'fg3Pct', group: 'shooting' },
      { key: 'efg', label: t.stat.efgPct, get: (p) => p.shooting.efgPct * 100, fmt: p1, higherIsBetter: true, percentileKey: 'efgPct', group: 'shooting' },
      { key: 'ts', label: t.stat.ts, get: (p) => p.ts * 100, fmt: p1, higherIsBetter: true, percentileKey: 'ts', group: 'shooting' },

      { key: 'per', label: t.stat.per, get: (p) => p.per, fmt: d, higherIsBetter: true, percentileKey: 'per', group: 'advanced' },
      { key: 'bpm', label: t.stat.bpm, get: (p) => p.bpm, fmt: (v) => f.signed(v), higherIsBetter: true, percentileKey: 'bpm', group: 'advanced' },
      { key: 'vorp', label: t.stat.vorp, get: (p) => p.vorp, fmt: d, higherIsBetter: true, percentileKey: 'vorp', group: 'advanced' },
      { key: 'ws', label: t.stat.ws, get: (p) => p.ws, fmt: d, higherIsBetter: true, percentileKey: 'ws', group: 'advanced' },
      { key: 'usg', label: t.stat.usg, get: (p) => p.usg * 100, fmt: p1, higherIsBetter: true, percentileKey: 'usg', group: 'advanced' },
      { key: 'ortg', label: t.stat.offRating, get: (p) => p.advanced.ortg, fmt: d, higherIsBetter: true, group: 'advanced' },
      { key: 'drtg', label: t.stat.defRating, get: (p) => p.advanced.drtg, fmt: d, higherIsBetter: false, group: 'advanced' },

      { key: 'salary', label: t.stat.salary, get: (p) => p.salary, fmt: (v) => f.money(v), higherIsBetter: true, group: 'value' },
      { key: 'value', label: t.stat.marketValue, get: (p) => p.estimatedValue, fmt: (v) => f.money(v), higherIsBetter: true, group: 'value' },
      { key: 'surplus', label: t.player.surplus, get: (p) => p.surplus, fmt: (v) => `${v >= 0 ? '+' : '−'}${f.money(Math.abs(v))}`, higherIsBetter: true, group: 'value' },
      { key: 'age', label: t.stat.age, get: (p) => p.age, fmt: (v) => f.int(Math.round(v)), higherIsBetter: false, group: 'value' },
    ]
  }, [t, f])

  useEffect(() => {
    const next = new URLSearchParams()
    picks.forEach((p, i) => { if (p) next.set(KEYS[i], String(p.playerId)) })
    setParams(next, { replace: true })
  }, [picks, setParams])

  const chosen = picks.filter(Boolean) as Player[]
  const radars = useMemo(() => chosen.map((p) => engine.radar(p)), [chosen])
  const axes = radars[0]?.map((r) => r.axis) ?? []
  const rows = allRows.filter((r) => r.group === group)
  const boxRows = allRows.filter((r) => r.group === 'box')

  const set = (i: number, p: Player | null) =>
    setPicks((prev) => prev.map((x, j) => (j === i ? p : x)))

  /** Category wins, the way a fight card scores rounds. It is the fastest way
   *  to read a comparison, and it is honest because every row is shown below. */
  const scoreboard = useMemo(() => {
    if (chosen.length < 2) return []
    const wins = chosen.map(() => 0)
    for (const row of allRows) {
      const values = chosen.map(row.get)
      const best = row.higherIsBetter ? Math.max(...values) : Math.min(...values)
      const idx = values.findIndex((v) => v === best)
      if (idx >= 0) wins[idx]++
    }
    return wins
  }, [chosen, allRows])

  return (
    <PageTransition>
      <SectionTitle title={t.compare.title} sub={t.compare.sub(engine.SEASON_LABEL)} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: SLOTS }).map((_, i) => (
          <PlayerPicker
            key={i} value={picks[i] ?? null} onChange={(p) => set(i, p)}
            placeholder={i < 2 ? t.compare.pickPlayer : t.compare.addAnother}
            exclude={chosen.map((p) => p.playerId)}
          />
        ))}
      </div>

      {chosen.length < 2 ? (
        <EmptyState title={t.compare.emptyTitle} hint={t.compare.emptyHint} />
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
                        {t.compare.categoriesWon}
                      </span>
                      {p.rings > 0 && (
                        <span className="num mt-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                          style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}>
                          {t.compare.championBadge(p.rings)}
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
              title={t.compare.radarTitle}
            />
            <CompareBars
              title={t.compare.barsTitle}
              sub={t.compare.barsSub}
              height={360}
              data={boxRows.map((r) => ({
                label: r.label,
                ...Object.fromEntries(chosen.map((p) => [p.name, Number(r.get(p).toFixed(1))])),
              }))}
              series={chosen.map((p, i) => ({ key: p.name, label: p.name, color: tokens.series[i] }))}
              table={{
                columns: [t.abbr.stat, ...chosen.map((p) => p.name)],
                rows: boxRows.map((r) => [r.label, ...chosen.map((p) => r.fmt(r.get(p)))]),
              }}
            />
          </div>

          {/* --------------------------------------------- stat comparison */}
          <div className="mt-4">
            <SectionTitle title={t.compare.lineByLine}
              sub={t.compare.lineByLineSub}
              right={<Segmented value={group} onChange={setGroup}
                options={GROUP_KEYS.map((g) => ({ value: g, label: t.compare.groups[g] }))} />} />

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
                {t.compare.invertedNote}
              </p>
            </GlassCard>
          </div>

          {/* ------------------------------------------------ trophy cases */}
          <div className="mt-4 grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(chosen.length, 2)}, minmax(0,1fr))` }}>
            {chosen.map((p) => (
              <GlassCard key={p.playerId}>
                <SectionTitle title={t.compare.honoursTitle(p.lastName)}
                  sub={p.honours.length ? t.compare.honoursCount(p.honours.length) : t.compare.honoursNone} />
                <TrophyCase honours={p.honours} compact />
              </GlassCard>
            ))}
          </div>
        </>
      )}
    </PageTransition>
  )
}
