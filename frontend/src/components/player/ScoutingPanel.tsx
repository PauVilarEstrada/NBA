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
import type { ArchetypeKey, ReportNote } from '@/lib/season'
import { useI18n, type Dict } from '@/i18n'
import type { Player } from '@/types'

/** The archetype one-liner sits beside its label under a `<key>Detail` key, so
 *  the rules can hand back a bare key and the dictionary supplies both halves. */
type ArchetypeDetailKey = `${ArchetypeKey}Detail`

const label = (t: Dict, key: ArchetypeKey): string => t.scouting.archetypes[key]
const detail = (t: Dict, key: ArchetypeKey): string =>
  t.scouting.archetypes[`${key}Detail` as ArchetypeDetailKey]

/**
 * One report note, rendered.
 *
 * The rules produce data — a kind and its numbers — and the sentence is built
 * here, in whichever language is active. The switch is exhaustive over the
 * union, so adding a note kind to the model is a compile error until the copy
 * for it exists too.
 */
function note(n: ReportNote, t: Dict): string {
  const r = t.scouting.report
  switch (n.k) {
    case 'scoring': return r.scoring(n.top, n.ppg)
    case 'efficiency': return r.efficiency(n.ts, n.usg)
    case 'creation': return r.creation(n.pctile, n.ast)
    case 'rebounding': return r.rebounding(n.reb, n.pctile)
    case 'defence': return r.defence(n.stl, n.blk)
    case 'spacing': return r.spacing(n.pct)
    case 'noStrength': return r.noStrength
    case 'lowEfficiency': return r.lowEfficiency(n.ts)
    case 'turnovers': return r.turnovers(n.tov)
    case 'coldShooting': return r.coldShooting(n.fg3a, n.pct)
    case 'lowRebounding': return r.lowRebounding
    case 'age': return r.age(n.age)
    case 'overpaid': return r.overpaid(n.m)
    case 'noConcerns': return r.noConcerns
  }
}

/**
 * The model's read on a player.
 *
 * Three things live here, and all three are computed rather than written:
 * a nearest-neighbour search for statistically similar players, a rule-based
 * archetype, and a scouting report whose every line is triggered by a
 * percentile threshold. Nothing is invented prose — it is the same data the
 * charts show, in a form you can read out loud.
 */
export function ScoutingPanel({ player }: { player: Player }) {
  const tokens = useChartTokens()
  const { t, f } = useI18n()
  const arch = useMemo(() => archetype(player), [player])
  const report = useMemo(() => scoutingReport(player), [player])
  const similar = useMemo(() => similarPlayers(player, 5), [player])
  const radar = useMemo(() => engine.radar(player), [player])

  const archLabel = label(t, arch)
  const archDetail = detail(t, arch)
  const summary = t.scouting.report.summary({
    ...report.summary,
    archetype: archLabel.toLowerCase(),
    detail: archDetail.toLowerCase(),
  }) + (report.team
    ? t.scouting.report.teamContext(
        report.team.fullName, report.team.wins, report.team.losses, report.team.net)
    : '')

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
              <p className="eyebrow">{t.scouting.modelRead}</p>
              <h2 className="headline mt-1 text-[clamp(1.6rem,4vw,2.75rem)]">{archLabel}</h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{archDetail}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="brand">
                {report.teamAbbr ? `${report.position} · ${report.teamAbbr}` : report.position}
              </Badge>
              <Badge>{t.scouting.percentilePer(player.percentiles.per)}</Badge>
              <Badge tone={player.surplus >= 0 ? 'good' : 'bad'}>
                {player.surplus >= 0 ? t.scouting.underpaid : t.scouting.overpaid}{' '}
                {f.money(Math.abs(player.surplus))}
              </Badge>
            </div>
          </div>

          <p className="mt-4 max-w-4xl text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
            {summary}
          </p>
        </div>
      </GlassCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <GlassCard>
          <SectionTitle title={t.scouting.strengths} sub={t.scouting.strengthsSub} />
          <ul className="space-y-2">
            {report.strengths.map((s, i) => (
              <motion.li key={s.k}
                initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex gap-2.5 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'color-mix(in srgb, var(--good) 10%, transparent)' }}>
                <span aria-hidden style={{ color: 'var(--good)' }}>▲</span>
                <span>{note(s, t)}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.scouting.concerns} sub={t.scouting.concernsSub} />
          <ul className="space-y-2">
            {report.concerns.map((s, i) => (
              <motion.li key={s.k}
                initial={{ opacity: 0, x: 10 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                className="flex gap-2.5 rounded-xl px-3 py-2 text-sm"
                style={{ background: 'color-mix(in srgb, var(--bad) 10%, transparent)' }}>
                <span aria-hidden style={{ color: 'var(--bad)' }}>▼</span>
                <span>{note(s, t)}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      </div>

      {/* ------------------------------------------------ similar players */}
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <GlassCard>
          <SectionTitle title={t.scouting.similar} sub={t.scouting.similarSub} />
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
                        {team.abbr} · {p.position} · {f.dec(p.pts)}/{f.dec(p.reb)}/{f.dec(p.ast)}
                      </span>
                    </span>
                    <span className="w-24 shrink-0">
                      <span className="num block text-right text-sm font-bold"
                        style={{ color: tokens.series[0] }}>{f.dec(similarity)}%</span>
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
            {t.scouting.similarNote}
          </p>
        </GlassCard>

        <SkillRadar
          axes={radar.map((r) => r.axis)}
          title={t.scouting.radarTitle}
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
        <SectionTitle title={t.scouting.allPercentiles} sub={t.scouting.allPercentilesSub} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {([
            [t.stat.pts, player.pts, 'pts', (v: number) => f.dec(v)],
            [t.stat.reb, player.reb, 'reb', (v: number) => f.dec(v)],
            [t.stat.ast, player.ast, 'ast', (v: number) => f.dec(v)],
            [t.stat.stl, player.stl, 'stl', (v: number) => f.dec(v)],
            [t.stat.blk, player.blk, 'blk', (v: number) => f.dec(v)],
            [t.stat.tov, player.tov, 'tov', (v: number) => f.dec(v)],
            [t.stat.fg3m, player.fg3m, 'fg3m', (v: number) => f.dec(v)],
            [t.stat.min, player.min, 'min', (v: number) => f.dec(v)],
            [t.stat.fgPct, player.shooting.fgPct * 100, 'fgPct', (v: number) => f.pct(v / 100, 1)],
            [t.stat.fg3Pct, player.shooting.fg3Pct * 100, 'fg3Pct', (v: number) => f.pct(v / 100, 1)],
            [t.stat.efgPct, player.shooting.efgPct * 100, 'efgPct', (v: number) => f.pct(v / 100, 1)],
            [t.stat.ts, player.ts * 100, 'ts', (v: number) => f.pct(v / 100, 1)],
            [t.stat.usg, player.usg * 100, 'usg', (v: number) => f.pct(v / 100, 1)],
            [t.stat.per, player.per, 'per', (v: number) => f.dec(v)],
            [t.stat.bpm, player.bpm, 'bpm', (v: number) => f.signed(v)],
            [t.stat.vorp, player.vorp, 'vorp', (v: number) => f.dec(v)],
            [t.stat.ws, player.ws, 'ws', (v: number) => f.dec(v)],
            [t.stat.gameScore, player.gameScore, 'gameScore', (v: number) => f.dec(v)],
          ] as const).map(([label, value, key, fmt]) => (
            <PercentileBar key={key} label={label} value={value}
              percentile={player.percentiles[key] ?? 50} format={fmt} />
          ))}
        </div>
      </GlassCard>
    </div>
  )
}
