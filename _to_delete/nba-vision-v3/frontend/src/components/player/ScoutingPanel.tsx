import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle } from '@/components/ui/Bits'
import { PercentileBar } from '@/components/ui/Numbers'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { SkillRadar } from '@/components/charts/SkillRadar'
import { useChartTokens } from '@/lib/palette'
import * as engine from '@/lib/engine'
import { archetype, scoutingReport, similarPlayers } from '@/lib/season'
import { dec, money } from '@/lib/format'
import type { Player } from '@/types'

/**
 * The model's read on a player.
 *
 * Three things live here, and all three are computed rather than written:
 * a nearest-neighbour search for statistically similar players, a rule-based
 * archetype, and a scouting report whose every sentence is triggered by a
 * percentile threshold. Nothing is invented prose — it is the same data the
 * charts show, in a form you can read out loud.
 */
export function ScoutingPanel({ player }: { player: Player }) {
  const tokens = useChartTokens()
  const arch = useMemo(() => archetype(player), [player])
  const report = useMemo(() => scoutingReport(player), [player])
  const similar = useMemo(() => similarPlayers(player, 5), [player])
  const radar = useMemo(() => engine.radar(player), [player])

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------- the report */}
      <GlassCard padded={false} className="overflow-hidden">
        <div className="relative p-6"
          style={{
            background: `linear-gradient(120deg, ${engine.getTeam(player.teamId)?.primaryColor}33, transparent 62%)`,
          }}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Model read</p>
              <h2 className="headline mt-1 text-[clamp(1.6rem,4vw,2.75rem)]">{arch.label}</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{arch.detail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">{player.position}</Badge>
              <Badge>{player.percentiles.per}th pctile PER</Badge>
              <Badge tone={player.surplus >= 0 ? 'good' : 'bad'}>
                {player.surplus >= 0 ? 'Underpaid' : 'Overpaid'} {money(Math.abs(player.surplus))}
              </Badge>
            </div>
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {report.summary}
          </p>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title="What he does well"
            sub="Each line fires off a percentile threshold, not an opinion" />
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <motion.li key={s}
                initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex gap-2.5 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'color-mix(in srgb, var(--good) 10%, transparent)' }}>
                <span aria-hidden style={{ color: 'var(--good)' }}>▲</span>
                <span>{s}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="Where the questions are" sub="Same method, opposite direction" />
          <ul className="space-y-2">
            {report.concerns.map((s, i) => (
              <motion.li key={s}
                initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex gap-2.5 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'color-mix(in srgb, var(--bad) 10%, transparent)' }}>
                <span aria-hidden style={{ color: 'var(--bad)' }}>▼</span>
                <span>{s}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* ------------------------------------------------ similar players */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <GlassCard>
          <SectionTitle title="Statistically similar players"
            sub="Nearest neighbours on the twelve-axis percentile profile" />
          <ul className="space-y-2">
            {similar.map(({ player: p, similarity }, i) => {
              const team = engine.getTeam(p.teamId)!
              return (
                <motion.li key={p.playerId}
                  initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                  <Link to={`/players/${p.playerId}`}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 transition-colors hover-layer-1">
                    <PlayerAvatar playerId={p.playerId} name={p.name}
                      color={team.primaryColor} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-base font-bold leading-tight">
                        {p.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px]"
                        style={{ color: 'var(--text-muted)' }}>
                        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={12} />
                        {team.abbr} · {p.position} · {dec(p.pts)}/{dec(p.reb)}/{dec(p.ast)}
                      </span>
                    </span>
                    <span className="w-24 shrink-0">
                      <span className="num block text-right text-sm font-bold"
                        style={{ color: tokens.series[0] }}>{similarity}%</span>
                      <span className="mt-1 block h-1.5 overflow-hidden rounded-full"
                        style={{ background: 'var(--layer-2)' }}>
                        <motion.span className="block h-full rounded-full"
                          initial={{ width: 0 }} whileInView={{ width: `${similarity}%` }}
                          viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.05 }}
                          style={{ background: tokens.series[0] }} />
                      </span>
                    </span>
                  </Link>
                </motion.li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Distance is weighted Euclidean over percentile ranks — points, rebounds, assists, steals,
            blocks, turnovers, threes, true shooting, usage, minutes, PER and BPM. Percentiles are
            already on a shared 0-100 scale, which is what stops one axis from dominating.
          </p>
        </GlassCard>

        <SkillRadar
          axes={radar.map((r) => r.axis)}
          title="Profile against his closest comparison"
          height={380}
          series={[
            {
              name: player.lastName, color: tokens.series[0],
              values: Object.fromEntries(radar.map((r) => [r.axis, r.value])),
            },
            ...(similar[0] ? [{
              name: similar[0].player.lastName, color: tokens.series[1],
              values: Object.fromEntries(
                engine.radar(similar[0].player).map((r) => [r.axis, r.value])),
            }] : []),
          ]}
        />
      </div>

      {/* ------------------------------------------------- full percentile */}
      <GlassCard>
        <SectionTitle title="Every tracked percentile"
          sub="Where he sits in the league on all eighteen measured axes" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ['Points', player.pts, 'pts', (v: number) => dec(v)],
            ['Rebounds', player.reb, 'reb', (v: number) => dec(v)],
            ['Assists', player.ast, 'ast', (v: number) => dec(v)],
            ['Steals', player.stl, 'stl', (v: number) => dec(v)],
            ['Blocks', player.blk, 'blk', (v: number) => dec(v)],
            ['Turnovers', player.tov, 'tov', (v: number) => dec(v)],
            ['Threes made', player.fg3m, 'fg3m', (v: number) => dec(v)],
            ['Minutes', player.min, 'min', (v: number) => dec(v)],
            ['Field goal %', player.shooting.fgPct * 100, 'fgPct', (v: number) => `${v.toFixed(1)}%`],
            ['Three-point %', player.shooting.fg3Pct * 100, 'fg3Pct', (v: number) => `${v.toFixed(1)}%`],
            ['Effective FG%', player.shooting.efgPct * 100, 'efgPct', (v: number) => `${v.toFixed(1)}%`],
            ['True shooting', player.ts * 100, 'ts', (v: number) => `${v.toFixed(1)}%`],
            ['Usage rate', player.usg * 100, 'usg', (v: number) => `${v.toFixed(1)}%`],
            ['PER', player.per, 'per', (v: number) => dec(v)],
            ['Box plus/minus', player.bpm, 'bpm', (v: number) => (v > 0 ? `+${dec(v)}` : dec(v))],
            ['VORP', player.vorp, 'vorp', (v: number) => dec(v)],
            ['Win shares', player.ws, 'ws', (v: number) => dec(v)],
            ['Game score', player.gameScore, 'gameScore', (v: number) => dec(v)],
          ] as const).map(([label, value, key, fmt]) => (
            <PercentileBar key={key} label={label} value={value}
              percentile={player.percentiles[key] ?? 50} format={fmt} />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
