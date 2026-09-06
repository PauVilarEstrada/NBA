import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, Segmented } from '@/components/ui/Bits'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import { useChartTokens } from '@/lib/palette'
import { useI18n, type Dict } from '@/i18n'
import type { BoxRow, PlayDescriptor, SimEvent, SimResult } from '@/types'

const GAME_SECONDS_PER_REAL_SECOND = 60   // 1 real second = 1 game minute

/**
 * A play descriptor, written out as a sentence.
 *
 * The worker cannot reach the dictionary, so it ships the play as data and the
 * caption is composed here — which is also why switching language re-narrates a
 * game already on screen. `event.text` is the English fallback for any event
 * that arrives without a descriptor.
 */
function caption(play: PlayDescriptor, t: Dict): string {
  const e = t.sim.events
  switch (play.t) {
    case 'turnover':
      return e.turnover(play.actor, play.stealer)
    case 'blocked':
      return e.blocked(play.actor, e.shotKind[play.kind], play.blocker)
    case 'made': {
      const assist = play.assist ? ` (${play.assist})` : ''
      return `${play.actor} ${e[play.kind]}${assist}${play.andOne ? e.andOne : ''}`
    }
    case 'ft':
      return e.freeThrows(play.actor, play.made, play.shots)
    case 'miss':
      return e.miss(play.actor, e.shotKind[play.kind])
    case 'rebound':
      return e.rebound(play.name, play.offensive)
    case 'secondChance':
      return e.secondChance(play.actor)
    case 'putbackMiss':
      return e.putbackMiss(play.actor)
    case 'period':
      return e.endOf(play.label)
  }
}

const line = (event: SimEvent, t: Dict): string =>
  event.play ? caption(event.play, t) : event.text

/**
 * Timelapse replay of a simulated game.
 *
 * The simulator already produced the whole event stream with a game clock on
 * every event, so playback is a pure function of one number: how much game time
 * has elapsed. That means scrubbing, pausing and skipping are free, the score
 * can never disagree with the play-by-play, and the box score is just a fold
 * over the visible events.
 */
export function GameBroadcast({ result, onReplay }: { result: SimResult; onReplay: () => void }) {
  const tokens = useChartTokens()
  const { t, f } = useI18n()
  const total = result.durationSeconds
  const [clock, setClock] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const [playing, setPlaying] = useState(true)
  const [tab, setTab] = useState<'feed' | 'box'>('feed')
  const raf = useRef<number>()
  const last = useRef<number>(0)

  useEffect(() => { setClock(0); setPlaying(true); setSpeed(1) }, [result])

  useEffect(() => {
    if (speed === 0) { setClock(total); setPlaying(false); return }
    if (!playing) return
    last.current = performance.now()
    const tick = (now: number) => {
      const dt = (now - last.current) / 1000
      last.current = now
      setClock((c) => {
        const next = c + dt * GAME_SECONDS_PER_REAL_SECOND * speed
        if (next >= total) { setPlaying(false); return total }
        return next
      })
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [playing, speed, total])

  const visible = useMemo(
    () => result.events.filter((e) => e.clockSeconds <= clock),
    [result.events, clock])

  const live = visible.at(-1)
  const homeScore = live?.homeScore ?? 0
  const awayScore = live?.awayScore ?? 0
  const period = live?.period ?? 1
  const periodClock = live?.periodClock ?? '12:00'
  const finished = clock >= total

  const box = useMemo(() => foldBox(result, visible), [result, visible])
  const highlights = useMemo(
    () => visible.filter((e) => e.highlight).slice(-6).reverse(),
    [visible])

  const userAbbr = result.userSide === 'home' ? result.home.abbr : result.away.abbr
  const speeds = [
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 4, label: '4×' },
    { value: 0, label: t.sim.skip },
  ]

  return (
    <div className="space-y-4">
      {/* --------------------------------------------------------- scoreboard */}
      <GlassCard padded={false} className="overflow-hidden">
        <div className="relative px-5 py-5"
          style={{
            background: `linear-gradient(100deg, ${result.home.color ?? '#1D428A'}33, transparent 45%, ${result.away.color ?? '#C8102E'}33)`,
          }}>
          <div className="flex items-center justify-between gap-3">
            <SideScore side={result.home} score={homeScore} you={result.userSide === 'home'} yourLineup={t.sim.yourLineup} />
            <div className="shrink-0 text-center">
              <p className="num text-xs font-bold uppercase tracking-[.2em]"
                style={{ color: 'var(--text-muted)' }}>
                {period <= 4 ? `Q${period}` : `OT${period - 4}`}
              </p>
              <p className="num text-3xl font-bold leading-none">{finished ? t.sim.final : periodClock}</p>
              {result.isPlayoffs && <Badge tone="accent" className="mt-1.5">{t.common.playoffs}</Badge>}
            </div>
            <SideScore side={result.away} score={awayScore} you={result.userSide === 'away'} align="right"
              yourLineup={t.sim.yourLineup} />
          </div>

          {/* progress / scrubber */}
          <div className="mt-5">
            <input
              type="range" min={0} max={total} value={Math.round(clock)}
              onChange={(e) => { setPlaying(false); setClock(Number(e.target.value)) }}
              aria-label={t.sim.gameClock}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full layer-3
                         accent-[#3B82F6] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-white"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => (finished ? onReplay() : setPlaying((p) => !p))}
                  className="rounded-lg layer-2 px-3 py-1.5 text-[11px] font-bold uppercase
                             tracking-widest transition-colors hover-layer-3">
                  {finished ? t.sim.runItAgain : playing ? t.sim.pause : t.sim.play}
                </button>
                <Segmented size="sm" value={speed} onChange={setSpeed} options={speeds} />
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {t.sim.tempoNote(result.seed)}
              </p>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ------------------------------------------------------- highlights */}
      {highlights.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <AnimatePresence initial={false}>
            {highlights.map((h) => (
              <motion.div key={`${h.clockSeconds}-${h.text}`}
                initial={{ opacity: 0, scale: 0.9, x: -12 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
                className="glass shrink-0 rounded-xl px-3 py-2">
                <p className="num text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Q{h.period} {h.periodClock} · {h.team}
                </p>
                <p className="max-w-[240px] truncate text-xs font-semibold">{line(h, t)}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ------------------------------------------------------- feed / box */}
      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title={t.sim.playByPlay} sub={t.sim.plays(visible.length)} />
          <ul className="max-h-[460px] space-y-1 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {[...visible].reverse().slice(0, 60).map((e, i) => (
                <motion.li key={`${e.clockSeconds}-${i}-${e.text}`}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={clsx('flex gap-2.5 rounded-lg px-2 py-1.5 text-xs',
                    e.highlight && 'layer-2',
                    e.kind === 'period' && 'bg-[#3B82F6]/12 font-bold uppercase tracking-wider')}>
                  <span className="num w-14 shrink-0" style={{ color: 'var(--text-muted)' }}>
                    {e.kind === 'period' ? '' : `Q${e.period} ${e.periodClock}`}
                  </span>
                  <span className={clsx('num w-9 shrink-0 font-bold',
                    e.team === userAbbr ? 'text-[#3B82F6]' : 'text-[var(--text-2)]')}>
                    {e.kind === 'period' ? '' : e.team}
                  </span>
                  <span className="min-w-0 flex-1">{line(e, t)}</span>
                  {e.points > 0 && <span className="num shrink-0 font-bold text-[var(--good)]">+{e.points}</span>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </GlassCard>

        <GlassCard className="lg:col-span-3">
          <SectionTitle title={t.sim.boxScore} sub={t.sim.updatingLive}
            right={<Segmented size="sm" value={tab} onChange={setTab}
              options={[{ value: 'feed', label: result.home.abbr }, { value: 'box', label: result.away.abbr }]} />} />
          <BoxTable
            rows={tab === 'feed' ? box.home : box.away}
            accent={tab === 'feed' ? tokens.series[0] : tokens.series[1]}
            teamId={Number(tab === 'feed' ? result.home.teamId : result.away.teamId)}
          />
        </GlassCard>
      </div>

      {result.distribution && (
        <GlassCard>
          <SectionTitle title={t.sim.distributionTitle(result.distribution.runs)}
            sub={t.sim.distributionSub} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              [t.sim.homeWinRate, f.pct(result.distribution.homeWinProb, 1)],
              [t.sim.averageMargin, f.dec(result.distribution.marginMean)],
              [t.sim.margin1090,
                `${f.dec(result.distribution.marginP10)} ${t.common.to} ${f.dec(result.distribution.marginP90)}`],
              [t.sim.averageTotal, f.dec(result.distribution.totalMean)],
            ] as const).map(([k, v]) => (
              <div key={k} className="rounded-xl layer-1 px-3 py-2.5">
                <p className="eyebrow">{k}</p>
                <p className="num mt-0.5 text-lg font-bold">{v}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}

function SideScore({ side, score, you, yourLineup, align = 'left' }: {
  side: SimResult['home']; score: number; you: boolean; yourLineup: string
  align?: 'left' | 'right'
}) {
  return (
    <div className={clsx('flex min-w-0 flex-1 flex-col', align === 'right' && 'items-end text-right')}>
      <div className={clsx('flex items-center gap-2.5', align === 'right' && 'flex-row-reverse')}>
        {typeof side.teamId === 'number'
          ? <TeamLogo teamId={side.teamId} abbr={side.abbr} size={44} />
          : <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#3B82F6]/20 text-sm font-bold">YOU</span>}
        <div className={align === 'right' ? 'text-right' : ''}>
          <p className="headline truncate text-lg leading-none">{side.name}</p>
          {you && <Badge tone="brand" className="mt-1">{yourLineup}</Badge>}
        </div>
      </div>
      <motion.p key={score} initial={{ scale: 1.18, opacity: 0.7 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="num mt-1 text-[clamp(2.5rem,8vw,4.5rem)] font-bold leading-none">
        {score}
      </motion.p>
    </div>
  )
}

function BoxTable({ rows, accent, teamId }: { rows: BoxRow[]; accent: string; teamId: number }) {
  const { t, f } = useI18n()
  const sorted = [...rows].sort((a, b) => b.pts - a.pts)
  const headers = [t.abbr.player, t.abbr.min, t.abbr.pts, t.abbr.reb, t.abbr.ast, t.abbr.fg, '3P']
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
            {headers.map((h) => (
              <th key={h} className="px-2 py-2 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* No layout animation on these rows: they re-sort on every score
              change, and FLIP-animating a <tr> makes them slide over each other. */}
          {sorted.map((r) => (
            <tr key={r.playerId}
              className={clsx('border-b last:border-0 transition-colors', r.isFiller && 'opacity-55')}
              style={{ borderColor: 'var(--border)' }}>
              <td className="px-2 py-1.5">
                <span className="flex items-center gap-2">
                  <PlayerAvatar playerId={r.playerId} name={r.name}
                    color={accent} size={28} ring={false} />
                  <span className="truncate font-semibold">{r.name}</span>
                  {r.isFiller && (
                    <span className="shrink-0 text-[9px] uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                      title={t.sim.fillerTooltip}>
                      {t.common.filler}
                    </span>
                  )}
                </span>
              </td>
              <td className="num px-2 py-1.5">{f.dec(r.min)}</td>
              <td className="num px-2 py-1.5 text-base font-bold" style={{ color: accent }}>{r.pts}</td>
              <td className="num px-2 py-1.5">{r.reb}</td>
              <td className="num px-2 py-1.5">{r.ast}</td>
              <td className="num px-2 py-1.5">{r.fgm}-{r.fga}</td>
              <td className="num px-2 py-1.5">{r.tpm}-{r.tpa}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
        {teamId > 0 ? t.sim.rosterFromIndex : t.sim.yourAssembledLineup}
      </p>
    </div>
  )
}

/** The box score is a fold over the events that have already happened — it can
 *  never drift from the score on the board. */
function foldBox(result: SimResult, visible: SimResult['events']) {
  const blank = (rows: BoxRow[]) =>
    new Map(rows.map((r) => [r.playerId, { ...r, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
      tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, min: 0 }]))

  const home = blank(result.home.box)
  const away = blank(result.away.box)
  const find = (id: number | null) =>
    id === null ? undefined : home.get(id) ?? away.get(id)

  for (const e of visible) {
    const row = find(e.playerId)
    const assist = find(e.assistPlayerId ?? null)
    const defender = find(e.defenderPlayerId ?? null)
    if (e.kind === 'shot_made' && row) {
      row.fgm++; row.fga++
      row.pts += e.points
      if (e.points === 3) { row.tpm++; row.tpa++ }
      // An and-one carries a made free throw the event's `points` field does
      // not include — miss it and the box score comes in a point light.
      if (e.text.includes('AND ONE')) { row.ftm++; row.fta++; row.pts++ }
      if (assist) assist.ast++
    } else if (e.kind === 'shot_miss' && row) {
      row.fga++
      if (e.text.includes('three')) row.tpa++
      if (defender) defender.blk++
    } else if (e.kind === 'rebound' && row) {
      row.reb++
    } else if (e.kind === 'turnover' && row) {
      row.tov++
      if (defender) defender.stl++
    } else if (e.kind === 'ft' && row) {
      const shots = Number(e.text.match(/\/(\d)/)?.[1] ?? 2)
      row.pts += e.points; row.ftm += e.points; row.fta += shots
    }
  }

  // Minutes are the one column that cannot be folded from events (players
  // accrue time while off the ball), so they scale with elapsed game time.
  const share = result.durationSeconds > 0
    ? (visible.at(-1)?.clockSeconds ?? 0) / result.durationSeconds : 0
  const scale = (map: Map<number, BoxRow>, final: BoxRow[]) =>
    final.map((f) => ({ ...(map.get(f.playerId) as BoxRow), min: Math.round(f.min * share * 10) / 10 }))

  return { home: scale(home, result.home.box), away: scale(away, result.away.box) }
}
