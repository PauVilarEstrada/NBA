/**
 * The offline engine — a faithful TypeScript port of the backend's mock
 * inference layer (`app/ml/mock.py`, `app/services/synth.py`,
 * `app/ml/simulator.py`).
 *
 * Why it exists: the site has to be openable and fully explorable with
 * `npm run dev` and nothing else — no Python, no Postgres, no keys. When
 * `VITE_API_URL` is set, `lib/api.ts` calls the real backend instead and this
 * file goes unused. The two implementations share constants and produce the
 * same response shapes deliberately, so switching is invisible to components.
 */
import seed from './seed.generated.json'
import { hashSeed, makeRng, type Rng } from './rng'
import { clamp, distribution, halfPointLine, mean, withLine } from './stats'
import type {
  BoxRow, Distribution, Driver, GameLog, H2HGame, Player, PlayerPrediction,
  PricedPlayer, SeasonRow, SimEvent, SimResult, Team, TeamPrediction,
} from '@/types'

export const TEAMS = seed.teams as unknown as Team[]
export const PLAYERS = seed.players as unknown as Player[]
export const SEASON = seed.season as number
export const SEASON_LABEL = `${seed.season}-${String(seed.season + 1).slice(2)}`
export const RECENT_FINALS = seed.recentFinals as Array<{
  year: number; champion: string; runnerUp: string; finalsMvp: string
}>
export const DEF_VS_POSITION = seed.defVsPosition as Record<string, Record<string, number>>

const TEAM_BY_ID = new Map(TEAMS.map((t) => [t.teamId, t]))
const TEAM_BY_ABBR = new Map(TEAMS.map((t) => [t.abbr, t]))
const PLAYER_BY_ID = new Map(PLAYERS.map((p) => [p.playerId, p]))

export const LEAGUE = {
  avgRating: 113.5,
  avgPace: 99.2,
  homeAdvantage: 2.4,
  marginSigma: 11.8,
}

export const PLAYOFF_ADJ = {
  paceMultiplier: 0.972,
  defRatingDelta: -2.1,
  homeAdvantage: 3.1,
  starUsageBoost: 0.06,
  varianceMultiplier: 0.92,
}

/** sigma / mean, measured on 2015-2025 player game logs. */
const DISPERSION: Record<string, number> = {
  pts: 0.315, reb: 0.36, ast: 0.4, min: 0.15, fg3m: 0.52, stl: 0.7, blk: 0.8, tov: 0.52,
}
const SKEW: Record<string, number> = { pts: 0.16, reb: 0.1, ast: 0.14, min: 0, fg3m: 0.22 }

const POSITION_SLOT: Record<string, string> = {
  PG: 'pg', SG: 'sg', SF: 'sf', PF: 'pf', C: 'c', G: 'sg', F: 'sf',
}

// ------------------------------------------------------------------ lookups
export const getTeam = (key: string | number): Team | undefined =>
  typeof key === 'number' ? TEAM_BY_ID.get(key) : TEAM_BY_ABBR.get(String(key).toUpperCase())
export const getPlayer = (id: number): Player | undefined => PLAYER_BY_ID.get(id)
export const roster = (key: string | number): Player[] => {
  const t = getTeam(key)
  return t ? PLAYERS.filter((p) => p.teamId === t.teamId).sort((a, b) => b.pts - a.pts) : []
}

export function searchPlayers(q: string, limit = 24): Player[] {
  const term = q.trim().toLowerCase()
  if (!term) return [...PLAYERS].sort((a, b) => b.pts - a.pts).slice(0, limit)
  const scored: Array<[number, Player]> = []
  for (const p of PLAYERS) {
    const name = p.name.toLowerCase()
    if (name.startsWith(term)) scored.push([0, p])
    else if (name.includes(term)) scored.push([1, p])
    else if (p.team.toLowerCase() === term) scored.push([2, p])
    else if (p.position.toLowerCase() === term) scored.push([3, p])
  }
  return scored.sort((a, b) => a[0] - b[0] || b[1].pts - a[1].pts).slice(0, limit).map((s) => s[1])
}

// --------------------------------------------------------------- projections
export interface Ctx {
  isHome: boolean
  restDays: number
  isPlayoffs: boolean
  oppDefRating: number
  oppPace: number
  oppDefVsPos: number
  formIndex: number
  minutesShare: number
}

export function defaultCtx(partial: Partial<Ctx> = {}): Ctx {
  return {
    isHome: true, restDays: 2, isPlayoffs: false,
    oppDefRating: LEAGUE.avgRating, oppPace: LEAGUE.avgPace,
    oppDefVsPos: 0, formIndex: 0, minutesShare: 1, ...partial,
  }
}

/** Product of independent, individually defensible effects.
 *  Mirrors `ml/mock.py::_multiplier` exactly — change one, change both. */
function multiplier(stat: string, ctx: Ctx, rng: Rng): number {
  let m = 1

  m *= ctx.isHome ? 1.015 : 0.985

  if (ctx.restDays <= 1) m *= stat === 'pts' || stat === 'min' ? 0.962 : 0.975
  else if (ctx.restDays >= 3) m *= 1.012

  if (stat === 'pts' || stat === 'fg3m') m *= 1 + (ctx.oppDefRating - LEAGUE.avgRating) * 0.009
  else if (stat === 'ast') m *= 1 + (ctx.oppDefRating - LEAGUE.avgRating) * 0.005

  m *= 1 + (ctx.oppPace - LEAGUE.avgPace) * 0.006

  if (['pts', 'reb', 'ast'].includes(stat)) m *= 1 + ctx.oppDefVsPos * 0.012

  if (ctx.isPlayoffs) {
    m *= PLAYOFF_ADJ.paceMultiplier
    m *= stat === 'pts' || stat === 'fg3m' ? 0.965 : 0.98
    m *= 1 + PLAYOFF_ADJ.starUsageBoost * ctx.minutesShare
  }

  m *= 1 + ctx.formIndex * 0.045
  m *= ctx.minutesShare
  m *= rng.normal(1, 0.012)
  return m
}

export function projectStat(baseline: number, stat: string, ctx: Ctx, rng: Rng): Distribution {
  const mu = Math.max(0, baseline * multiplier(stat, ctx, rng))
  let sigma = mu * (DISPERSION[stat] ?? 0.35)
  sigma = Math.max(sigma, Math.sqrt(Math.max(mu, 0.4)) * 0.65)
  if (ctx.isPlayoffs) sigma *= PLAYOFF_ADJ.varianceMultiplier
  return distribution(mu, sigma, SKEW[stat] ?? 0.1, 0)
}

export function formIndex(recent: number[], seasonMean: number): number {
  if (!recent.length || seasonMean <= 0) return 0
  const last5 = recent.slice(-5)
  return Math.tanh(((mean(last5) - seasonMean) / seasonMean) * 2.2)
}

// ------------------------------------------------------------ synthetic data
const SEASON_START = new Date(Date.UTC(SEASON, 9, 21))

function schedule(teamAbbr: string, n: number) {
  const rng = makeRng(hashSeed('sched', teamAbbr, SEASON))
  const others = TEAMS.map((t) => t.abbr).filter((a) => a !== teamAbbr)
  const games: Array<{ gameId: string; date: string; opponent: string; isHome: boolean; restDays: number }> = []
  let day = SEASON_START.getTime()
  const gaps = [1, 2, 2, 2, 3, 3, 4]
  for (let i = 0; i < n; i++) {
    const gap = rng.pick(gaps)
    day += gap * 86400000
    games.push({
      gameId: `00${String(SEASON % 100).padStart(2, '0')}${String(i).padStart(5, '0')}`,
      date: new Date(day).toISOString().slice(0, 10),
      opponent: rng.pick(others),
      isHome: rng.next() < 0.5,
      restDays: gap - 1,
    })
  }
  return games
}

export function gameLogs(player: Player, n = 68): GameLog[] {
  const rng = makeRng(hashSeed('logs', player.playerId, SEASON))
  const pos = POSITION_SLOT[player.position?.toUpperCase()] ?? 'sf'
  return schedule(player.team, n).map((g) => {
    const opp = getTeam(g.opponent)!
    const ctx = defaultCtx({
      isHome: g.isHome, restDays: g.restDays,
      oppDefRating: opp.defRating, oppPace: opp.pace,
      oppDefVsPos: DEF_VS_POSITION[g.opponent]?.[pos] ?? 0,
      formIndex: Math.tanh(rng.normal(0, 0.5)),
    })
    const row: Record<string, number> = {}
    for (const stat of ['pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'fg3m', 'min'] as const) {
      const base = (player as unknown as Record<string, number>)[stat] ?? 0
      const mu = base * multiplier(stat, ctx, rng)
      const sd = Math.max(mu * (DISPERSION[stat] ?? 0.35), Math.sqrt(Math.max(mu, 0.4)) * 0.6)
      const v = Math.max(0, rng.normal(mu, sd))
      row[stat] = stat === 'min' ? Math.round(v * 10) / 10 : Math.round(v)
    }
    return {
      ...g, opponentId: opp.teamId, ...row,
      ts: Math.round(clamp(rng.normal(player.ts, 0.075), 0.3, 0.85) * 1000) / 1000,
      plusMinus: Math.round(rng.normal(0, 11)),
    } as GameLog
  })
}

export function headToHead(player: Player, opponentAbbr: string, seasons = 6): H2HGame[] {
  const out: H2HGame[] = []
  const opp = getTeam(opponentAbbr)!
  for (let s = 0; s < seasons; s++) {
    const season = SEASON - s
    const rng = makeRng(hashSeed('h2h', player.playerId, opponentAbbr, season))
    const n = rng.int(2, 5)
    for (let i = 0; i < n; i++) {
      const isHome = i % 2 === 0
      const ageFactor = 1 - 0.018 * s
      const ctx = defaultCtx({
        isHome, restDays: rng.int(1, 4),
        oppDefRating: opp.defRating, oppPace: opp.pace,
        formIndex: Math.tanh(rng.normal(0, 0.55)),
      })
      const rec: Record<string, number> = {}
      for (const stat of ['pts', 'reb', 'ast', 'min'] as const) {
        const base = ((player as unknown as Record<string, number>)[stat] ?? 0) * ageFactor
        const mu = base * multiplier(stat, ctx, rng)
        const sd = Math.max(mu * (DISPERSION[stat] ?? 0.35), 1)
        const v = Math.max(0, rng.normal(mu, sd))
        rec[stat] = stat === 'min' ? Math.round(v * 10) / 10 : Math.round(v)
      }
      out.push({
        season: `${season}-${String(season + 1).slice(2)}`,
        date: new Date(SEASON_START.getTime() - s * 365 * 86400000 + i * 30 * 86400000)
          .toISOString().slice(0, 10),
        isHome, ...rec,
      } as H2HGame)
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function ageCurve(age: number): number {
  if (age <= 27) return 0.8 + 0.2 * (1 - Math.exp(-(age - 18) / 3.2))
  return Math.max(0.35, 1 - 0.055 * (age - 27) ** 1.25)
}

export function careerSeasons(player: Player, n = 8): SeasonRow[] {
  const rng = makeRng(hashSeed('career', player.playerId))
  const rows: SeasonRow[] = []
  for (let i = 0; i < n; i++) {
    const seasonStart = SEASON - (n - 1 - i)
    const age = player.age - (n - 1 - i)
    if (age < 19) continue
    let scale = ageCurve(age) / Math.max(ageCurve(player.age), 1e-6)
    if (age < 24) scale *= 0.62 + 0.095 * (age - 19)
    const wobble = rng.normal(1, 0.045)
    const s = (k: keyof Player) =>
      Math.round(((player[k] as number) ?? 0) * scale * wobble * 10) / 10
    rows.push({
      season: `${seasonStart}-${String(seasonStart + 1).slice(2)}`,
      seasonStart, age: Math.round(age), team: player.team,
      gp: Math.round(clamp(rng.normal(66, 9), 28, 82)),
      min: s('min'), pts: s('pts'), reb: s('reb'), ast: s('ast'),
      stl: s('stl'), blk: s('blk'), tov: s('tov'), fg3m: s('fg3m'),
      ts: Math.round(clamp(player.ts * (0.94 + 0.06 * scale), 0.45, 0.7) * 1000) / 1000,
      per: Math.round(clamp(12 + 14 * scale * (player.usg / 0.22) * 0.55, 8, 34) * 10) / 10,
      ws: Math.round(clamp(9 * scale * wobble, 0.4, 20) * 10) / 10,
      bpm: Math.round(clamp(-2 + 11 * scale * (player.usg / 0.25), -4, 13) * 10) / 10,
      vorp: Math.round(clamp(6.5 * scale * wobble, 0, 11) * 10) / 10,
    })
  }
  return rows
}

/** Six skill axes scaled 0-100 against a league reference, so two players'
 *  shapes are comparable. A radar of raw box-score numbers is meaningless. */
export function radar(p: Player) {
  const refs: Record<string, number> = {
    Scoring: 30, Playmaking: 11, Rebounding: 13, Defence: 3.6, Efficiency: 0.65, Volume: 38,
  }
  const vals: Record<string, number> = {
    Scoring: p.pts, Playmaking: p.ast, Rebounding: p.reb,
    Defence: p.stl * 1.6 + p.blk * 1.9, Efficiency: p.ts, Volume: p.min,
  }
  return Object.keys(refs).map((axis) => ({
    axis,
    value: Math.round(Math.min(100, (100 * vals[axis]) / refs[axis]) * 10) / 10,
    raw: Math.round(vals[axis] * 100) / 100,
  }))
}

export const rookies = (): Player[] =>
  PLAYERS.filter((p) => p.isRookie)
    .sort((a, b) => (a.bio?.draftPick ?? 99) - (b.bio?.draftPick ?? 99))

export function teamLeaders(key: string | number) {
  const r = roster(key)
  if (!r.length) return {} as Record<string, { playerId: number; name: string; value: number; headshot: string }>
  const keys = ['pts', 'reb', 'ast', 'stl', 'blk', 'fg3m', 'per'] as const
  const out: Record<string, { playerId: number; name: string; value: number; headshot: string }> = {}
  for (const k of keys) {
    const best = r.reduce((a, b) => ((b[k] as number) > (a[k] as number) ? b : a))
    out[k] = { playerId: best.playerId, name: best.name, value: best[k] as number, headshot: best.headshot }
  }
  return out
}

/** Month-by-month form. A season average hides a player who started cold and
 *  has been the best version of himself since January. */
export function monthlySplits(logs: GameLog[]) {
  const buckets = new Map<string, GameLog[]>()
  for (const l of logs) {
    const key = l.date.slice(0, 7)
    const arr = buckets.get(key)
    arr ? arr.push(l) : buckets.set(key, [l])
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, rows]) => ({
      month,
      label: new Date(`${month}-01T00:00:00Z`)
        .toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      gp: rows.length,
      pts: r1(mean(rows.map((r) => r.pts))),
      reb: r1(mean(rows.map((r) => r.reb))),
      ast: r1(mean(rows.map((r) => r.ast))),
      min: r1(mean(rows.map((r) => r.min))),
      ts: Math.round(mean(rows.map((r) => r.ts)) * 1000) / 1000,
    }))
}

export function splits(logs: GameLog[]) {
  const agg = (rows: GameLog[]) => {
    if (!rows.length) return { gp: 0, pts: 0, reb: 0, ast: 0, min: 0, fg3m: 0 }
    const g = (k: keyof GameLog) =>
      Math.round((rows.reduce((s, r) => s + (r[k] as number), 0) / rows.length) * 10) / 10
    return { gp: rows.length, pts: g('pts'), reb: g('reb'), ast: g('ast'), min: g('min'), fg3m: g('fg3m') }
  }
  return {
    home: agg(logs.filter((l) => l.isHome)),
    away: agg(logs.filter((l) => !l.isHome)),
    rested: agg(logs.filter((l) => l.restDays >= 2)),
    backToBack: agg(logs.filter((l) => l.restDays <= 0)),
  }
}

// ------------------------------------------------------------- player vs team
export function predictPlayer(
  playerId: number, opponentKey: string | number,
  opts: { isHome?: boolean; restDays?: number; isPlayoffs?: boolean } = {},
): PlayerPrediction {
  const player = getPlayer(playerId)!
  const opponent = getTeam(opponentKey)!
  const { isHome = true, restDays = 2, isPlayoffs = false } = opts
  const logs = gameLogs(player)
  const pos = POSITION_SLOT[player.position?.toUpperCase()] ?? 'sf'
  const ctx = defaultCtx({
    isHome, restDays, isPlayoffs,
    oppDefRating: opponent.defRating, oppPace: opponent.pace,
    oppDefVsPos: opponent.defVsPosition[pos] ?? 0,
    formIndex: formIndex(logs.slice(-8).map((l) => l.pts), player.pts),
  })
  const rng = makeRng(hashSeed(playerId, opponent.teamId, isHome, isPlayoffs, Math.round(restDays)))

  const projections: Record<string, Distribution> = {}
  for (const stat of ['pts', 'reb', 'ast', 'fg3m', 'stl', 'blk', 'tov', 'min'] as const) {
    const d = projectStat((player as unknown as Record<string, number>)[stat] ?? 0, stat, ctx, rng)
    projections[stat] = ['pts', 'reb', 'ast', 'fg3m'].includes(stat)
      ? withLine(d, halfPointLine(d))
      : d
  }

  const base = player.pts
  const drivers: Driver[] = [
    { label: 'Venue', detail: isHome ? 'Home court' : 'On the road',
      impact: r2(base * (isHome ? 0.015 : -0.015)) },
    { label: 'Opponent defence', detail: `${opponent.abbr} DRtg ${opponent.defRating.toFixed(1)}`,
      impact: r2(base * (opponent.defRating - LEAGUE.avgRating) * 0.009) },
    { label: 'Pace', detail: `${opponent.abbr} plays at ${opponent.pace.toFixed(1)}`,
      impact: r2(base * (opponent.pace - LEAGUE.avgPace) * 0.006) },
    { label: 'Rest', detail: restDays <= 1 ? 'Back-to-back' : `${restDays} days off`,
      impact: r2(base * (restDays <= 1 ? -0.038 : restDays >= 3 ? 0.012 : 0)) },
    { label: 'Matchup', detail: `${player.position} defence vs league average`,
      impact: r2(base * ctx.oppDefVsPos * 0.012) },
    { label: 'Recent form', detail: 'Last 5 games vs season average',
      impact: r2(base * ctx.formIndex * 0.045) },
  ]
  if (isPlayoffs) {
    drivers.push({ label: 'Playoff intensity', detail: 'Tighter defence, shorter rotations',
      impact: r2(base * -0.035 + base * 0.06) })
  }

  return {
    player, opponent,
    context: {
      venue: isHome ? 'home' : 'away', restDays,
      seasonType: isPlayoffs ? 'playoffs' : 'regular',
      formIndex: r2(ctx.formIndex), matchupDefVsPosition: ctx.oppDefVsPos,
    },
    projections,
    drivers: drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
    source: 'mock',
  }
}

const r2 = (v: number) => Math.round(v * 100) / 100

// --------------------------------------------------------------- team vs team
function projectScore(home: Team, away: Team, isPlayoffs: boolean, homeRest: number, awayRest: number) {
  const paceMult = isPlayoffs ? PLAYOFF_ADJ.paceMultiplier : 1
  const defDelta = isPlayoffs ? PLAYOFF_ADJ.defRatingDelta : 0
  const edge = isPlayoffs ? PLAYOFF_ADJ.homeAdvantage : LEAGUE.homeAdvantage
  const poss = ((home.pace + away.pace) / 2) * paceMult
  const points = (off: Team, def: Team) =>
    ((LEAGUE.avgRating + (off.offRating - LEAGUE.avgRating) + (def.defRating + defDelta - LEAGUE.avgRating)) * poss) / 100
  let h = points(home, away) + edge / 2
  let a = points(away, home) - edge / 2
  h += 0.35 * (homeRest - 2) - 1.4 * (homeRest <= 1 ? 1 : 0)
  a += 0.35 * (awayRest - 2) - 1.4 * (awayRest <= 1 ? 1 : 0)
  return { h, a, poss }
}

export function winProbability(margin: number, isPlayoffs = false): number {
  const sigma = LEAGUE.marginSigma * (isPlayoffs ? PLAYOFF_ADJ.varianceMultiplier : 1)
  return 0.5 * (1 + erfLocal(margin / (sigma * Math.SQRT2)))
}

function erfLocal(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const poly = t * 0.254829592 + t ** 2 * -0.284496736 + t ** 3 * 1.421413741 +
    t ** 4 * -1.453152027 + t ** 5 * 1.061405429
  return sign * (1 - poly * Math.exp(-ax * ax))
}

/** Exact best-of-seven probability under the 2-2-1-1-1 format. */
export function seriesProbability(pHome: number, pAway: number): number {
  const homes = [true, true, false, false, true, false, true]
  let total = 0
  for (let mask = 0; mask < 1 << 7; mask++) {
    let wins = 0, losses = 0, prob = 1, played = 0
    for (let g = 0; g < 7; g++) {
      if (wins === 4 || losses === 4) break
      const won = ((mask >> g) & 1) === 1
      const p = homes[g] ? pHome : pAway
      prob *= won ? p : 1 - p
      won ? wins++ : losses++
      played++
    }
    if (wins === 4) total += prob / 2 ** (7 - played)
  }
  return clamp(total, 0, 1)
}

export function predictTeam(
  homeKey: string | number, awayKey: string | number,
  opts: { isPlayoffs?: boolean; homeRest?: number; awayRest?: number; series?: boolean } = {},
): TeamPrediction {
  const home = getTeam(homeKey)!, away = getTeam(awayKey)!
  const { isPlayoffs = false, homeRest = 2, awayRest = 2, series = false } = opts
  const rng = makeRng(hashSeed(home.teamId, away.teamId, isPlayoffs, homeRest, awayRest))
  const { h, a, poss } = projectScore(home, away, isPlayoffs, homeRest, awayRest)
  const hp = h + rng.normal(0, 0.8), ap = a + rng.normal(0, 0.8)
  const margin = hp - ap
  const p = winProbability(margin, isPlayoffs)
  const varMult = isPlayoffs ? PLAYOFF_ADJ.varianceMultiplier : 1

  const contributions = [
    ...topContributions(home, away, true, isPlayoffs),
    ...topContributions(away, home, false, isPlayoffs),
  ].sort((x, y) => y.pts - x.pts)

  const out: TeamPrediction = {
    home, away, seasonType: isPlayoffs ? 'playoffs' : 'regular',
    projection: {
      homePts: distribution(hp, 10.5, 0.05, 60),
      awayPts: distribution(ap, 10.5, 0.05, 60),
      margin: withLine(distribution(margin, LEAGUE.marginSigma * varMult, 0, -80), 0),
      total: distribution(hp + ap, 13.5 * varMult, 0.05, 120),
      homeWinProb: r4(p), awayWinProb: r4(1 - p),
      possessions: Math.round(poss * 10) / 10,
      spread: Math.round(-margin * 10) / 10,
    },
    contributions,
    source: 'mock',
  }

  if (series) {
    const rev = projectScore(away, home, isPlayoffs, awayRest, homeRest)
    const pAway = 1 - winProbability(rev.h - rev.a, isPlayoffs)
    out.series = {
      homeWinsSeries: r4(seriesProbability(p, pAway)),
      gameHomeProb: r4(p), gameAwayProb: r4(pAway), format: '2-2-1-1-1',
    }
  }
  return out
}

const r4 = (v: number) => Math.round(v * 10000) / 10000

function topContributions(team: Team, opp: Team, isHome: boolean, isPlayoffs: boolean) {
  return roster(team.teamId).slice(0, 8).map((p) => {
    const pos = POSITION_SLOT[p.position?.toUpperCase()] ?? 'sf'
    const ctx = defaultCtx({
      isHome, isPlayoffs, oppDefRating: opp.defRating, oppPace: opp.pace,
      oppDefVsPos: opp.defVsPosition[pos] ?? 0,
    })
    const rng = makeRng(hashSeed('contrib', p.playerId, opp.teamId, isHome, isPlayoffs))
    return {
      playerId: p.playerId, name: p.name, team: team.abbr, headshot: p.headshot,
      pts: r1(projectStat(p.pts, 'pts', ctx, rng).mean),
      reb: r1(projectStat(p.reb, 'reb', ctx, rng).mean),
      ast: r1(projectStat(p.ast, 'ast', ctx, rng).mean),
      min: r1(projectStat(p.min, 'min', ctx, rng).mean),
    }
  })
}

const r1 = (v: number) => Math.round(v * 10) / 10

// ------------------------------------------------------------------- fantasy
export const BUDGET_PRESETS = [10_000_000, 20_000_000, 50_000_000, 100_000_000]
export const ROSTER_MIN = 5
export const ROSTER_MAX = 10

export function pricePool(budget: number): PricedPlayer[] {
  const leagueMax = PLAYERS[0]?.leagueMax ?? Math.max(...PLAYERS.map((p) => p.marketPrice))
  return PLAYERS.map((p) => {
    const share = 0.38 * (p.marketPrice / leagueMax) ** 0.85
    const cost = Math.round(share * budget * 100) / 100
    return {
      ...p, cost,
      costPct: Math.round((1000 * cost) / budget) / 10,
      efficiency: Math.round(((p.pts + 1.2 * p.reb + 1.5 * p.ast) /
        Math.max((cost / budget) * 100, 0.1)) * 100) / 100,
    }
  }).sort((a, b) => b.cost - a.cost)
}

// ----------------------------------------------------------------- simulator
const TS_TO_EFG = 0.96
const BASE_TURNOVER = 0.132
const BASE_OREB = 0.265
const PERIOD_SECONDS = 12 * 60
const OT_SECONDS = 5 * 60
const ROTATION_SIZE = 9

interface SimP {
  playerId: number; name: string; team: string; position: string
  minutes: number; usage: number; ts: number; threeRate: number; ftRate: number
  rebRate: number; astRate: number; stlRate: number; blkRate: number; tovRate: number
  stamina: number; isFiller?: boolean
  pts: number; reb: number; ast: number; stl: number; blk: number; tov: number
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; secs: number
}

interface SimT {
  teamId: number | string; name: string; abbr: string; logo?: string; color?: string
  players: SimP[]; offRating: number; defRating: number; pace: number; score: number
  isHome?: boolean
}

function toSimPlayer(p: Partial<Player> & { isFiller?: boolean }, abbr: string, minutes: number): SimP {
  return {
    playerId: p.playerId!, name: p.name!, team: abbr, position: p.position ?? 'SF',
    minutes, usage: p.usg ?? 0.2, ts: p.ts ?? 0.57,
    threeRate: Math.min(0.62, (p.fg3m ?? 1) / Math.max((p.pts ?? 10) / 2.2, 1)),
    ftRate: 0.24,
    rebRate: Math.min(0.3, (p.reb ?? 4) / 44),
    astRate: Math.min(0.4, (p.ast ?? 3) / 24),
    stlRate: (p.stl ?? 1) / 60, blkRate: (p.blk ?? 0.6) / 45,
    tovRate: Math.min(0.25, (p.tov ?? 2) / 16),
    stamina: 1, isFiller: p.isFiller,
    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
    fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, secs: 0,
  }
}

function allocateMinutes(pool: Array<{ usg?: number }>, cap = 36, floor = 8) {
  const weights = pool.map((p) => Math.max(p.usg ?? 0.18, 0.08))
  const total = weights.reduce((s, w) => s + w, 0)
  const mins = weights.map((w) => Math.min(cap, Math.max(floor, (240 * w) / total)))
  const scale = 240 / mins.reduce((s, m) => s + m, 0)
  return mins.map((m) => m * scale)
}

export function buildUserTeam(picks: Player[], name = 'Your Team'): SimT {
  const mins = allocateMinutes(picks, 38, 12)
  return {
    teamId: 'user', name, abbr: 'YOU',
    color: '#3B82F6',
    players: picks.map((p, i) => toSimPlayer(p, 'YOU', mins[i])),
    offRating: Math.min(126, 104 + picks.reduce((s, p) => s + p.pts, 0) * 0.42),
    defRating: Math.max(103, 118 - picks.reduce((s, p) => s + p.stl * 2.2 + p.blk * 2.6, 0) * 0.55),
    pace: 100.5, score: 0,
  }
}

/** Replacement-level filler so three stars do not play 48 minutes each.
 *  Flagged so the UI can grey them out; disappears once real rosters load. */
function fillers(team: Team, n: number, startIndex: number) {
  const quality = (team.offRating - LEAGUE.avgRating) * 0.004
  return Array.from({ length: n }, (_, k) => {
    const i = startIndex + k
    return {
      playerId: -(team.teamId * 100 + i),
      name: `${team.abbr} Rotation ${i + 1}`,
      position: ['PG', 'SG', 'SF', 'PF', 'C'][i % 5],
      isFiller: true, min: 16, pts: 7.4, reb: 3.2, ast: 1.8, stl: 0.6, blk: 0.4,
      tov: 1.1, fg3m: 1, ts: 0.545 + quality, usg: 0.155,
    } as Partial<Player> & { isFiller: boolean }
  })
}

export function buildRealTeam(key: string | number, exclude: Set<number> = new Set()): SimT {
  const team = getTeam(key)!
  let pool: Array<Partial<Player> & { isFiller?: boolean }> =
    roster(team.teamId).filter((p) => !exclude.has(p.playerId))
  const removed = roster(team.teamId).filter((p) => exclude.has(p.playerId))
  if (!pool.length) throw new Error(`You signed every listed ${team.abbr} player — pick another opponent`)
  if (pool.length < ROTATION_SIZE) pool = [...pool, ...fillers(team, ROTATION_SIZE - pool.length, pool.length)]

  const mins = allocateMinutes(pool)
  const offPenalty = removed.reduce((s, p) => s + p.pts * 0.33 + p.ast * 0.28, 0)
  const defPenalty = removed.reduce((s, p) => s + p.stl * 1.4 + p.blk * 1.6, 0)
  return {
    teamId: team.teamId, name: team.fullName, abbr: team.abbr,
    logo: team.logo, color: team.primaryColor,
    players: pool.map((p, i) => toSimPlayer(p, team.abbr, mins[i])),
    offRating: team.offRating - offPenalty,
    defRating: team.defRating + defPenalty,
    pace: team.pace, score: 0,
  }
}

const fmtClock = (rem: number) => `${Math.floor(rem / 60)}:${String(rem % 60).padStart(2, '0')}`

export function simulateGame(
  home: SimT, away: SimT, seedValue = 7, isPlayoffs = false,
): Omit<SimResult, 'userSide' | 'seed' | 'isPlayoffs'> {
  const rng = makeRng(seedValue >>> 0)
  const events: SimEvent[] = []
  let elapsed = 0, period = 1
  const pace = ((home.pace + away.pace) / 2) * (isPlayoffs ? PLAYOFF_ADJ.paceMultiplier : 1)
  const secsPerPoss = (48 * 60) / Math.max(pace * 2, 1)

  const periodStart = () =>
    period <= 4 ? (period - 1) * PERIOD_SECONDS : 4 * PERIOD_SECONDS + (period - 5) * OT_SECONDS

  const emit = (team: SimT, kind: SimEvent['kind'], text: string,
                player?: SimP, points = 0, highlight = false,
                extra: { assist?: SimP; defender?: SimP } = {}) => {
    const rem = Math.max(0, (period <= 4 ? PERIOD_SECONDS : OT_SECONDS) - (elapsed - periodStart()))
    events.push({
      clockSeconds: elapsed, period, periodClock: fmtClock(rem), team: team.abbr,
      kind, text, homeScore: home.score, awayScore: away.score,
      playerId: player?.playerId ?? null,
      assistPlayerId: extra.assist?.playerId ?? null,
      defenderPlayerId: extra.defender?.playerId ?? null,
      points, highlight,
    })
  }

  const onCourt = (t: SimT) =>
    [...t.players].sort((a, b) => (b.minutes * 60 - b.secs) - (a.minutes * 60 - a.secs)).slice(0, 5)
  const pickBy = (t: SimT, key: keyof SimP) =>
    rng.weighted(t.players, t.players.map((p) => Math.max(Number(p[key]) || 0.001, 0.001)))

  const rebound = (off: SimT, def: SimT, depth = 0) => {
    const offensive = rng.next() < BASE_OREB
    const team = offensive ? off : def
    const board = pickBy(team, 'rebRate')
    board.reb++
    emit(team, 'rebound', `${board.name} ${offensive ? 'offensive' : 'defensive'} rebound`, board)
    if (offensive && depth < 2) secondChance(off, def, board, depth + 1)
  }

  const secondChance = (off: SimT, def: SimT, board: SimP, depth: number) => {
    elapsed += Math.max(2, Math.round(rng.normal(5, 2)))
    const putback = rng.next() < 0.55
    const actor = putback ? board : rng.weighted(onCourt(off), onCourt(off).map((p) => p.usage))
    actor.fga++
    const pMake = clamp(actor.ts * TS_TO_EFG * (putback ? 1.18 : 0.94)
      - (LEAGUE.avgRating - def.defRating) * 0.006, 0.2, 0.8)
    if (rng.next() < pMake) {
      actor.fgm++; actor.pts += 2; off.score += 2
      emit(off, 'shot_made', `${actor.name} second-chance bucket`, actor, 2, putback)
    } else {
      emit(off, 'shot_miss', `${actor.name} misses the putback`, actor)
      rebound(off, def, depth)
    }
  }

  const possession = (off: SimT, def: SimT) => {
    const on = onCourt(off)
    const dur = Math.max(4, Math.round(rng.normal(secsPerPoss, 4.5)))
    elapsed += dur
    for (const p of on) p.secs += dur
    for (const p of onCourt(def)) p.secs += dur

    let dStr = (LEAGUE.avgRating - def.defRating) * 0.006
    if (isPlayoffs) dStr += 0.012

    const actor = rng.weighted(on, on.map((p) => p.usage * p.stamina))

    if (rng.next() < BASE_TURNOVER * (1 + dStr * 2) * (actor.tovRate / 0.12)) {
      actor.tov++
      const stealer = pickBy(def, 'stlRate')
      stealer.stl++
      emit(off, 'turnover', `${actor.name} turnover, stolen by ${stealer.name}`, actor,
        0, false, { defender: stealer })
      return
    }

    const isThree = rng.next() < actor.threeRate
    const kind = isThree ? 'three' : rng.next() < 0.55 ? 'rim' : 'mid'
    const baseEfg = actor.ts * TS_TO_EFG - dStr
    const pMake = clamp(
      kind === 'three' ? baseEfg * 0.62 : kind === 'rim' ? baseEfg * 1.13 : baseEfg * 0.78,
      0.2, 0.8)

    actor.fga++
    if (isThree) actor.tpa++

    if (!isThree && rng.next() < 0.055 + dStr) {
      const blocker = pickBy(def, 'blkRate')
      blocker.blk++
      emit(off, 'shot_miss', `${actor.name} ${kind} BLOCKED by ${blocker.name}`, actor, 0, true,
        { defender: blocker })
      rebound(off, def)
      return
    }

    if (rng.next() < pMake) {
      const pts = isThree ? 3 : 2
      actor.fgm++; actor.pts += pts; off.score += pts
      if (isThree) actor.tpm++
      let passer: SimP | undefined
      if (rng.next() < (isThree ? 0.78 : 0.62)) {
        const mates = on.filter((p) => p !== actor)
        if (mates.length) {
          passer = rng.weighted(mates, mates.map((p) => p.astRate))
          passer.ast++
        }
      }
      const verb = kind === 'three' ? 'drains a three'
        : kind === 'rim' ? 'throws it down' : 'hits the mid-range'
      let text = `${actor.name} ${verb}${passer ? ` (${passer.name})` : ''}`
      if (rng.next() < 0.075) {
        actor.fta++
        if (rng.next() < 0.77) { actor.ftm++; actor.pts++; off.score++; text += ' — AND ONE!' }
      }
      emit(off, 'shot_made', text, actor, pts, isThree || kind === 'rim', { assist: passer })
      return
    }

    if (rng.next() < actor.ftRate * 0.5) {
      const shots = isThree ? 3 : 2
      let made = 0
      for (let i = 0; i < shots; i++) {
        actor.fta++
        if (rng.next() < 0.77) { actor.ftm++; made++ }
      }
      actor.pts += made; off.score += made
      emit(off, 'ft', `${actor.name} ${made}/${shots} from the line`, actor, made)
      return
    }

    emit(off, 'shot_miss', `${actor.name} misses the ${kind}`, actor)
    rebound(off, def)
  }

  let homeBall = rng.next() < 0.5
  for (;;) {
    const end = periodStart() + (period <= 4 ? PERIOD_SECONDS : OT_SECONDS)
    while (elapsed < end) {
      const [off, def] = homeBall ? [home, away] : [away, home]
      possession(off, def)
      homeBall = !homeBall
      for (const t of [home, away]) {
        for (const p of t.players) {
          p.stamina = clamp(1 - p.secs / 60 / (p.minutes * 2.6), 0.55, 1)
        }
      }
    }
    elapsed = end
    emit(home, 'period', `End of ${period <= 4 ? 'Q' : 'OT'}${period <= 4 ? period : period - 4}`)
    if (period >= 4 && home.score !== away.score) break
    if (period > 8) { if (home.score === away.score) home.score += 2; break }
    period++
  }

  const box = (t: SimT): BoxRow[] => t.players.map((p) => ({
    playerId: p.playerId, name: p.name, team: t.abbr,
    min: Math.round((p.secs / 60) * 10) / 10,
    pts: p.pts, reb: p.reb, ast: p.ast, stl: p.stl, blk: p.blk, tov: p.tov,
    fgm: p.fgm, fga: p.fga, tpm: p.tpm, tpa: p.tpa, ftm: p.ftm, fta: p.fta,
    isFiller: p.isFiller,
  }))

  return {
    final: { home: home.score, away: away.score, periods: period, overtime: Math.max(0, period - 4) },
    home: { teamId: home.teamId, name: home.name, abbr: home.abbr, score: home.score,
            box: box(home), logo: home.logo, color: home.color },
    away: { teamId: away.teamId, name: away.name, abbr: away.abbr, score: away.score,
            box: box(away), logo: away.logo, color: away.color },
    events, durationSeconds: elapsed,
  }
}

const freshTeam = (t: SimT): SimT => ({
  ...t, score: 0,
  players: t.players.map((p) => ({
    ...p, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0,
    fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, secs: 0, stamina: 1,
  })),
})

export function runSimulation(
  picks: Player[], opponentKey: string | number,
  opts: { seed?: number; isPlayoffs?: boolean; userIsHome?: boolean; monteCarloRuns?: number } = {},
): SimResult {
  const { seed: s = 7, isPlayoffs = false, userIsHome = false, monteCarloRuns = 0 } = opts
  const signed = new Set(picks.map((p) => p.playerId))
  const user = buildUserTeam(picks)
  const real = buildRealTeam(opponentKey, signed)
  const [home, away] = userIsHome ? [user, real] : [real, user]

  const result = simulateGame(freshTeam(home), freshTeam(away), s, isPlayoffs) as SimResult
  result.userSide = userIsHome ? 'home' : 'away'
  result.seed = s
  result.isPlayoffs = isPlayoffs

  if (monteCarloRuns > 0) {
    result.distribution = sweep(home, away, s, isPlayoffs, monteCarloRuns)
  }
  return result
}

function summarise(margins: number[], totals: number, wins: number, runs: number) {
  const sorted = [...margins].sort((x, y) => x - y)
  const pct = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  const mu = mean(margins)
  return {
    runs,
    homeWinProb: wins / runs,
    marginMean: r1(mu),
    marginStd: r1(Math.sqrt(mean(margins.map((m) => (m - mu) ** 2)))),
    marginP10: pct(0.1),
    marginP90: pct(0.9),
    totalMean: r1(totals / runs),
  }
}

/** Monte Carlo for a user-built lineup, with a progress callback so the worker
 *  can report real progress instead of an indeterminate spinner. */
export function monteCarloFor(
  picks: Player[], opponentKey: string | number,
  opts: {
    seed?: number; isPlayoffs?: boolean; userIsHome?: boolean; runs?: number
    onProgress?: (done: number, total: number) => void
  } = {},
) {
  const { seed: s = 7, isPlayoffs = false, userIsHome = false, runs = 200, onProgress } = opts
  const signed = new Set(picks.map((p) => p.playerId))
  const user = buildUserTeam(picks)
  const real = buildRealTeam(opponentKey, signed)
  const [home, away] = userIsHome ? [user, real] : [real, user]
  return sweep(home, away, s, isPlayoffs, runs, onProgress)
}

function sweep(
  home: SimT, away: SimT, seedValue: number, isPlayoffs: boolean,
  runs: number, onProgress?: (done: number, total: number) => void,
) {
  const margins: number[] = []
  let wins = 0, totals = 0
  for (let i = 0; i < runs; i++) {
    const r = simulateGame(freshTeam(home), freshTeam(away), seedValue + i + 1, isPlayoffs)
    const m = r.final.home - r.final.away
    margins.push(m)
    totals += r.final.home + r.final.away
    if (m > 0) wins++
    if (onProgress && (i % 20 === 19 || i === runs - 1)) onProgress(i + 1, runs)
  }
  return summarise(margins, totals, wins, runs)
}

// ------------------------------------------------- real team vs real team
/** Build a real NBA team for the simulator, optionally ruling players out.
 *  Sitting a starter is not cosmetic: his minutes redistribute to the players
 *  behind him and the team's ratings move by what he actually contributes. */
export function buildTeamWithInjuries(
  key: string | number, excluded: Set<number>, isHome: boolean,
): SimT {
  const team = getTeam(key)!
  const full = roster(team.teamId)
  const out = full.filter((p) => excluded.has(p.playerId))
  let pool: Array<Partial<Player> & { isFiller?: boolean }> =
    full.filter((p) => !excluded.has(p.playerId))
  if (pool.length < ROTATION_SIZE) pool = [...pool, ...fillers(team, ROTATION_SIZE - pool.length, pool.length)]

  const mins = allocateMinutes(pool)
  const offPenalty = out.reduce((s, p) => s + p.pts * 0.33 + p.ast * 0.28, 0)
  const defPenalty = out.reduce((s, p) => s + p.stl * 1.4 + p.blk * 1.6, 0)
  return {
    teamId: team.teamId, name: team.fullName, abbr: team.abbr,
    logo: team.logo, color: team.primaryColor,
    players: pool.map((p, i) => toSimPlayer(p, team.abbr, mins[i])),
    offRating: team.offRating - offPenalty,
    defRating: team.defRating + defPenalty,
    pace: team.pace, score: 0, isHome,
  }
}

export function runRealGame(
  homeKey: string, awayKey: string,
  opts: {
    excluded?: Set<number>; seed?: number; isPlayoffs?: boolean; monteCarloRuns?: number
  } = {},
): SimResult {
  const { excluded = new Set<number>(), seed: s = 11, isPlayoffs = false, monteCarloRuns = 0 } = opts
  const home = buildTeamWithInjuries(homeKey, excluded, true)
  const away = buildTeamWithInjuries(awayKey, excluded, false)
  const result = simulateGame(freshTeam(home), freshTeam(away), s, isPlayoffs) as SimResult
  result.userSide = 'home'
  result.seed = s
  result.isPlayoffs = isPlayoffs
  if (monteCarloRuns > 0) result.distribution = sweep(home, away, s, isPlayoffs, monteCarloRuns)
  return result
}

export function monteCarloReal(
  homeKey: string, awayKey: string,
  opts: {
    excluded?: Set<number>; seed?: number; isPlayoffs?: boolean; runs?: number
    onProgress?: (done: number, total: number) => void
  } = {},
) {
  const { excluded = new Set<number>(), seed: s = 11, isPlayoffs = false, runs = 200, onProgress } = opts
  return sweep(
    buildTeamWithInjuries(homeKey, excluded, true),
    buildTeamWithInjuries(awayKey, excluded, false),
    s, isPlayoffs, runs, onProgress,
  )
}
