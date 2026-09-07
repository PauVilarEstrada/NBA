import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { PageTransition } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionTitle, Segmented } from '@/components/ui/Bits'
import { BallSpinner } from '@/components/ui/Loading'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { PlayerPicker, TeamPicker } from '@/components/ui/Pickers'
import { useChartTokens } from '@/lib/palette'
import { useBuilder } from '@/store/builder'
import * as engine from '@/lib/engine'
import {
  customTeamFrom, simulateLeague, type LeagueSimResult, type SeriesResult, type SimTeamRecord,
} from '@/lib/season'
import { SEASON_LABEL } from '@/lib/api'
import { atLeast } from '@/lib/format'
import { useI18n } from '@/i18n'
import type { Player, Team } from '@/types'

type Phase = 'setup' | 'running' | 'result'

/**
 * Simulate an entire season.
 *
 * The possession engine is the wrong tool for 1,200 games — here each result
 * comes from the ratings model plus a seeded normal draw, which resolves the
 * whole league in milliseconds. You can drop an invented team into the league in
 * place of a real one, built from any players you like, and watch where it
 * finishes and how far it goes in the playoffs.
 */
export default function League() {
  const { t } = useI18n()
  const tokens = useChartTokens()
  const builder = useBuilder()
  const [phase, setPhase] = useState<Phase>('setup')
  const [seed, setSeed] = useState(2026)
  const [includeCustom, setIncludeCustom] = useState(true)
  const [teamName, setTeamName] = useState('Vision All-Stars')
  const [abbr, setAbbr] = useState('VIS')
  const [conference, setConference] = useState<'East' | 'West'>('West')
  const [replaces, setReplaces] = useState<Team | null>(() => engine.getTeam('WAS') ?? null)
  const [picks, setPicks] = useState<Array<Player | null>>(() => {
    // Seed from the fantasy roster if one has been built, otherwise leave empty.
    const fromBuilder = builder.roster.slice(0, 8).map((p) => engine.getPlayer(p.playerId) ?? null)
    return [...fromBuilder, ...Array(8 - fromBuilder.length).fill(null)].slice(0, 8)
  })
  const [result, setResult] = useState<LeagueSimResult | null>(null)
  const [progress, setProgress] = useState({ stage: 'Starting', pct: 0 })

  const chosen = picks.filter(Boolean) as Player[]
  const custom = useMemo(
    () => (includeCustom && chosen.length >= 5
      ? customTeamFrom(chosen.map((p) => p.playerId), teamName, abbr.toUpperCase().slice(0, 3),
        conference, tokens.series[0])
      : null),
    [includeCustom, chosen, teamName, abbr, conference, tokens.series])

  const canRun = !includeCustom || (custom !== null && replaces !== null)

  /** `lib/season.ts` reports its progress in English; map it onto the dictionary. */
  const stageLabel = (stage: string): string => {
    switch (stage) {
      case 'Building the schedule': return t.league.stageSchedule
      case 'Playing the regular season': return t.league.stageRegular
      case 'Running the playoffs': return t.league.stagePlayoffs
      case 'Starting': return t.sim.stageStarting
      default: return stage
    }
  }

  const run = async (nextSeed = seed) => {
    setPhase('running')
    setProgress({ stage: 'Building the schedule', pct: 3 })
    // The whole season is a few milliseconds of maths; the pause exists so the
    // progress readout is legible rather than a flash.
    const sim = new Promise<LeagueSimResult>((resolve) => {
      setTimeout(() => {
        resolve(simulateLeague({
          seed: nextSeed,
          custom: includeCustom ? custom : null,
          replaces: includeCustom ? replaces?.abbr ?? null : null,
          onProgress: (done, total, stage) =>
            setProgress({ stage, pct: Math.round((done / total) * 92) }),
        }))
      }, 40)
    })
    const r = await atLeast(sim, 1600)
    setResult(r)
    setPhase('result')
  }

  return (
    <PageTransition>
      <SectionTitle
        title={t.league.title}
        sub={t.league.sub(SEASON_LABEL)}
        right={phase === 'result' ? (
          <div className="flex gap-2">
            <button onClick={() => { const s = seed + 1; setSeed(s); run(s) }}
              className="rounded-xl bg-gradient-to-br from-[#C8102E] to-[#7A0A1C] px-4 py-2
                         text-xs font-bold uppercase tracking-widest text-white">
              {t.league.runAgain}
            </button>
            <button onClick={() => setPhase('setup')}
              className="glass glass-hover rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest">
              {t.league.changeSetup}
            </button>
          </div>
        ) : undefined} />

      {/*
        A keyed pane, and no `AnimatePresence`.
        `mode="wait"` holds the incoming pane until the outgoing one reports its
        exit — and a pane containing its own nested `AnimatePresence` (the player
        and team pickers) never files that report, so the old pane sat at opacity
        0 forever and the new one never mounted. That was the blank page after a
        simulation. Changing `key` remounts the pane and framer plays it in; with
        no exit to wait on, the transition cannot deadlock.
      */}
      <motion.div key={phase}
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
        {phase === 'running' && (
          <div className="glass flex flex-col items-center justify-center rounded-2xl py-24 text-center">
            <BallSpinner size={64} />
            <p className="headline mt-6 text-3xl">{t.league.playingSeason}</p>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{stageLabel(progress.stage)}…</p>
            <div className="mx-auto mt-6 h-1.5 w-72 max-w-full overflow-hidden rounded-full"
              style={{ background: 'var(--layer-2)' }}>
              <motion.div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#C8102E]"
                animate={{ width: `${Math.max(4, progress.pct)}%` }} transition={{ duration: 0.3 }} />
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <SeasonResult result={result} colors={tokens.series} />
        )}

        {phase === 'setup' && (
          <div className="space-y-4">
            <GlassCard>
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="eyebrow mb-2">{t.league.whoIsIn}</p>
                  <Segmented value={includeCustom ? 'custom' : 'real'}
                    onChange={(v) => setIncludeCustom(v === 'custom')}
                    options={[
                      { value: 'real', label: t.league.real30 },
                      { value: 'custom', label: t.league.addMyTeam },
                    ]} />
                </div>
                <div>
                  <p className="eyebrow mb-2">{t.common.seed}</p>
                  <input type="number" value={seed} min={1} max={99999}
                    onChange={(e) => setSeed(Number(e.target.value) || 1)}
                    className="glass num w-28 rounded-lg px-3 py-2 text-sm font-bold outline-none" />
                </div>
              </div>
            </GlassCard>

            {includeCustom && (
              <GlassCard accent={tokens.series[0]}>
                <SectionTitle title={t.league.yourFranchise}
                  sub={t.league.yourFranchiseSub} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="block">
                    <span className="eyebrow mb-1.5 block">{t.league.teamName}</span>
                    <input value={teamName} onChange={(e) => setTeamName(e.target.value)}
                      className="glass w-full rounded-xl px-3 py-2.5 text-sm outline-none" />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1.5 block">{t.league.threeLetterCode}</span>
                    <input value={abbr} maxLength={3}
                      onChange={(e) => setAbbr(e.target.value.toUpperCase())}
                      className="glass num w-full rounded-xl px-3 py-2.5 text-sm font-bold outline-none" />
                  </label>
                  <div>
                    <span className="eyebrow mb-1.5 block">{t.league.conference}</span>
                    <Segmented value={conference} onChange={setConference}
                      options={[{ value: 'East', label: t.common.east },
                        { value: 'West', label: t.common.west }]} />
                  </div>
                  <TeamPicker value={replaces} onChange={setReplaces} label={t.league.replaces} />
                </div>

                <div className="mt-5">
                  <p className="eyebrow mb-2">{t.league.rosterLabel}</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <PlayerPicker key={i} value={picks[i] ?? null}
                        onChange={(p) => setPicks((prev) => prev.map((x, j) => (j === i ? p : x)))}
                        placeholder={i < 5 ? t.league.signPlayer : t.league.optional}
                        exclude={chosen.map((p) => p.playerId)} />
                    ))}
                  </div>
                  {builder.roster.length > 0 && (
                    <button
                      onClick={() => {
                        const fromBuilder = builder.roster.slice(0, 8)
                          .map((p) => engine.getPlayer(p.playerId) ?? null)
                        setPicks([...fromBuilder, ...Array(8).fill(null)].slice(0, 8))
                      }}
                      className="glass glass-hover mt-3 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest">
                      {t.league.loadBuilderRoster(builder.roster.length)}
                    </button>
                  )}
                </div>

                {custom && (
                  <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4"
                    style={{ borderColor: 'var(--border)' }}>
                    <Tile label={t.stat.offRating} value={custom.offRating} />
                    <Tile label={t.stat.defRating} value={custom.defRating} />
                    <Tile label={t.stat.netRating} value={custom.offRating - custom.defRating} signedValue />
                    <Tile label={t.stat.payroll} value={custom.payroll / 1e6} prefix="$" suffix="M" />
                  </div>
                )}
                {!custom && (
                  <p className="mt-4 text-sm" style={{ color: 'var(--bad)' }}>
                    {t.league.needFive}
                  </p>
                )}
              </GlassCard>
            )}

            <div className="flex justify-end">
              <button onClick={() => run()} disabled={!canRun}
                className={clsx('rounded-xl px-8 py-3.5 text-sm font-bold uppercase tracking-widest transition-all',
                  canRun
                    ? 'animate-pulseGlow bg-gradient-to-br from-[#3B82F6] to-[#1D428A] text-white shadow-glow hover:-translate-y-0.5'
                    : 'cursor-not-allowed layer-1 text-[var(--text-muted)] ring-1 ring-[var(--border)]')}>
                {t.league.playSeason}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </PageTransition>
  )
}

function Tile({ label, value, prefix = '', suffix = '', signedValue, decimals }: {
  label: string; value: number; prefix?: string; suffix?: string
  signedValue?: boolean; decimals?: number
}) {
  const { f } = useI18n()
  // Whole numbers (games played, seeds, series count) read wrong with a decimal.
  const dp = decimals ?? (Number.isInteger(value) ? 0 : 1)
  return (
    <div className="rounded-xl px-3 py-2.5" style={{ background: 'var(--layer-1)' }}>
      <p className="eyebrow">{label}</p>
      <p className="num text-xl font-bold">
        {signedValue && value > 0 ? '+' : ''}{prefix}
        {f.dec(value, dp)}
        {suffix}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- result
function SeasonResult({ result, colors }: { result: LeagueSimResult; colors: string[] }) {
  const { t, f } = useI18n()
  const champ = engine.getTeam(result.champion)
  const isCustomChamp = result.customTeam?.abbr === result.champion
  const champColor = isCustomChamp ? result.customTeam!.color : champ?.primaryColor ?? colors[0]

  return (
    <div className="space-y-4">
      {/* ------------------------------------------------------- champion */}
      <GlassCard padded={false} className="overflow-hidden">
        <div className="relative p-8 text-center"
          style={{ background: `radial-gradient(ellipse 70% 90% at 50% 0%, ${champColor}55, transparent 70%)` }}>
          <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
            <p className="eyebrow">{t.league.simulatedChampions(SEASON_LABEL)}</p>
            <div className="mt-4 flex flex-col items-center gap-3">
              {champ
                ? <TeamLogo teamId={champ.teamId} abbr={champ.abbr} size={110} />
                : <span className="grid h-28 w-28 place-items-center rounded-2xl text-3xl font-bold text-white"
                    style={{ background: champColor }}>{result.champion}</span>}
              <h2 className="headline text-[clamp(2rem,6vw,4.5rem)]">{result.championName}</h2>
            </div>
          </motion.div>

          {result.finalsMvp && (
            <div className="mt-5 inline-flex items-center gap-3 rounded-2xl px-4 py-2.5"
              style={{ background: 'var(--layer-2)' }}>
              <PlayerAvatar playerId={result.finalsMvp.playerId} name={result.finalsMvp.name}
                color={champColor} size={44} />
              <span className="text-left">
                <span className="block text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>{t.league.finalsMvp}</span>
                <Link to={`/players/${result.finalsMvp.playerId}`}
                  className="block font-display text-lg font-bold leading-tight hover:text-[var(--brand-lit)]">
                  {result.finalsMvp.name}
                </Link>
              </span>
            </div>
          )}

          <div className="mx-auto mt-6 grid max-w-2xl grid-cols-3 gap-3">
            <Tile label={t.league.gamesPlayed} value={result.totals.games} />
            <Tile label={t.league.averageTotal} value={result.totals.avgTotal} />
            <Tile label={t.league.averageMargin} value={result.totals.avgMargin} />
          </div>
        </div>
      </GlassCard>

      {/* ------------------------------------------------------ standings */}
      <div className="grid gap-4 lg:grid-cols-2">
        {(['East', 'West'] as const).map((conf, ci) => (
          <GlassCard key={conf} accent={colors[ci]}>
            <SectionTitle
              title={t.common.conferenceOf(conf === 'East' ? t.common.eastern : t.common.western)}
              sub={t.league.finalTable} />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                    {['#', t.abbr.team, t.abbr.w, t.abbr.l, t.abbr.pct, t.abbr.diff,
                      t.common.home, t.common.away, t.abbr.last10].map((h) => (
                      <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                        style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.standings[conf].map((r, i) => <StandingRow key={r.abbr} r={r} seed={i + 1}
                    accent={colors[ci]} />)}
                </tbody>
              </table>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* -------------------------------------------------------- bracket */}
      <GlassCard>
        <SectionTitle title={t.league.bracket} sub={t.league.bracketSub} />
        <div className="grid gap-4 lg:grid-cols-3">
          {['first round', 'semi-final', 'finals'].map((stage) => (
            <div key={stage}>
              <p className="eyebrow mb-2">
                {stage === 'finals' ? t.league.finalsGroup
                  : stage === 'semi-final' ? t.league.semiFinals : t.league.firstRounds}
              </p>
              <ul className="space-y-2">
                {result.playoffs
                  .filter((s) => stage === 'finals'
                    ? s.round.includes('finals') || s.round === 'NBA Finals'
                    : s.round.includes(stage))
                  .map((s, i) => <SeriesRow key={`${s.round}-${i}`} s={s} custom={result.customTeam?.abbr} />)}
              </ul>
            </div>
          ))}
        </div>
      </GlassCard>

      {result.customTeam && (
        <GlassCard accent={result.customTeam.color}>
          <SectionTitle title={t.league.howYourTeamDid}
            sub={t.league.yourTeamSub(result.customTeam.name, result.customTeam.playerIds.length)} />
          {(() => {
            const rec = [...result.standings.East, ...result.standings.West]
              .find((r) => r.abbr === result.customTeam!.abbr)
            const seedIdx = result.standings[result.customTeam!.conference]
              .findIndex((r) => r.abbr === result.customTeam!.abbr) + 1
            const runs = result.playoffs.filter(
              (s) => s.high === result.customTeam!.abbr || s.low === result.customTeam!.abbr)
            if (!rec) return null
            return (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                  <Tile label={t.stat.record} value={rec.wins} suffix={` - ${rec.losses}`} />
                  <Tile label={t.league.seedLabel} value={seedIdx} />
                  <Tile label={t.league.pointDiff}
                    value={(rec.pointsFor - rec.pointsAgainst) / Math.max(rec.wins + rec.losses, 1)}
                    signedValue />
                  <Tile label={t.league.seriesPlayed} value={runs.length} />
                  <Tile label={t.stat.payroll} value={result.customTeam.payroll / 1e6} prefix="$" suffix="M" />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {result.customTeam.playerIds.map((id) => {
                    const p = engine.getPlayer(id)
                    if (!p) return null
                    return (
                      <Link key={id} to={`/players/${id}`}
                        className="glass glass-hover flex items-center gap-2 rounded-xl px-2.5 py-1.5">
                        <PlayerAvatar playerId={p.playerId} name={p.name} size={28} ring={false} />
                        <span className="text-sm font-semibold">{p.name}</span>
                        <span className="num text-xs" style={{ color: 'var(--text-muted)' }}>
                          {f.dec(p.pts)} {t.abbr.ppg} · {f.money(p.marketPrice)}
                        </span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </GlassCard>
      )}
    </div>
  )
}

function StandingRow({ r, seed, accent }: { r: SimTeamRecord; seed: number; accent: string }) {
  const { f } = useI18n()
  const diff = (r.pointsFor - r.pointsAgainst) / Math.max(r.wins + r.losses, 1)
  const team = r.isCustom ? null : engine.getTeam(r.abbr)
  return (
    <motion.tr layout className="border-b last:border-0 hover-layer-1"
      style={{
        borderColor: 'var(--border)',
        background: r.isCustom ? `color-mix(in srgb, ${r.color} 14%, transparent)` : undefined,
        boxShadow: seed <= 6 ? `inset 3px 0 0 0 ${accent}`
          : seed <= 10 ? 'inset 3px 0 0 0 var(--text-muted)' : undefined,
      }}>
      <td className="num px-2 py-2 font-bold">{seed}</td>
      <td className="whitespace-nowrap px-2 py-2">
        <span className="flex items-center gap-2 font-semibold">
          {team
            ? <TeamLogo teamId={team.teamId} abbr={team.abbr} size={18} />
            : <span className="grid h-[18px] w-[18px] place-items-center rounded text-[8px] font-bold text-white"
                style={{ background: r.color }}>★</span>}
          {r.isCustom
            ? <span style={{ color: r.color }}>{r.name}</span>
            : <Link to={`/teams/${r.abbr}`} className="hover:text-[var(--brand-lit)]">{r.abbr}</Link>}
        </span>
      </td>
      <td className="num px-2 py-2 font-bold">{r.wins}</td>
      <td className="num px-2 py-2">{r.losses}</td>
      <td className="num px-2 py-2">
        {f.dec(r.wins / Math.max(r.wins + r.losses, 1), 3).slice(1)}
      </td>
      <td className="num px-2 py-2 font-semibold"
        style={{ color: diff >= 0 ? 'var(--good)' : 'var(--bad)' }}>{f.signed(diff)}</td>
      <td className="num px-2 py-2">{r.homeWins}-{r.homeLosses}</td>
      <td className="num px-2 py-2">{r.awayWins}-{r.awayLosses}</td>
      <td className="num px-2 py-2">{r.last10}-{10 - r.last10}</td>
    </motion.tr>
  )
}

function SeriesRow({ s, custom }: { s: SeriesResult; custom?: string }) {
  const { t } = useI18n()
  const winnerIsHigh = s.winner === s.high
  /** `lib/season.ts` names each series in English — translate it here. */
  const roundLabel = (round: string): string => {
    const m = /^(East|West) (first round|semi-final|finals)$/.exec(round)
    if (m) {
      const conf = m[1] === 'East' ? t.common.east : t.common.west
      return m[2] === 'first round' ? t.league.rounds.firstRound(conf)
        : m[2] === 'semi-final' ? t.league.rounds.semiFinal(conf)
        : t.league.rounds.conferenceFinals(conf)
    }
    return round === 'NBA Finals' ? t.league.rounds.nbaFinals : round
  }
  const badge = (abbr: string) => {
    const t = engine.getTeam(abbr)
    return t ? <TeamLogo teamId={t.teamId} abbr={t.abbr} size={18} />
      : <span className="grid h-[18px] w-[18px] place-items-center rounded bg-[#3B82F6] text-[8px] font-bold text-white">★</span>
  }
  const isFinals = s.round === 'NBA Finals'
  return (
    <li className={clsx('rounded-xl px-3 py-2', isFinals && 'ring-1 ring-[#D4AF37]/40')}
      style={{ background: isFinals ? 'rgba(212,175,55,.10)' : 'var(--layer-1)' }}>
      <p className="mb-1 text-[9px] font-bold uppercase tracking-widest"
        style={{ color: isFinals ? '#D4AF37' : 'var(--text-muted)' }}>{roundLabel(s.round)}</p>
      <div className="flex items-center gap-2 text-sm">
        <span className={clsx('flex flex-1 items-center gap-1.5', winnerIsHigh ? 'font-bold' : 'opacity-60')}>
          {badge(s.high)}{s.high}{s.high === custom && ' ★'}
        </span>
        <span className="num font-bold">{s.highWins}–{s.lowWins}</span>
        <span className={clsx('flex flex-1 items-center justify-end gap-1.5', !winnerIsHigh ? 'font-bold' : 'opacity-60')}>
          {s.low}{s.low === custom && ' ★'}{badge(s.low)}
        </span>
      </div>
    </li>
  )
}
