/**
 * Season-level analytics: standings, leaders, award races — and a simulator
 * that can play a whole 82-game season, including one team you invented.
 *
 * The game-level engine in `engine.ts` plays possessions, which is the right
 * granularity for one game and hopeless for 1,230 of them. Here the unit is a
 * *result*: the ratings model produces an expected margin, a seeded normal draw
 * turns it into a score, and the whole league season resolves in milliseconds.
 * Playoff series then run through the same model with home-court alternation.
 */
import * as engine from './engine'
import { fmt } from '@/i18n'
import { hashSeed, makeRng, type Rng } from './rng'
import { clamp, mean } from './stats'
import type { Player, Team } from '@/types'

// ------------------------------------------------------------------ types
export interface SimTeamRecord {
  abbr: string
  name: string
  conference: 'East' | 'West'
  division: string
  color: string
  teamId: number | string
  isCustom?: boolean
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  streak: number          // + wins, - losses
  last10: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
}

export interface SimGameResult {
  home: string
  away: string
  homePts: number
  awayPts: number
  day: number
}

export interface SeriesResult {
  round: string
  high: string
  low: string
  highWins: number
  lowWins: number
  winner: string
  games: Array<{ home: string; away: string; homePts: number; awayPts: number }>
}

export interface LeagueSimResult {
  standings: { East: SimTeamRecord[]; West: SimTeamRecord[] }
  playoffs: SeriesResult[]
  champion: string
  championName: string
  finalsMvp: { playerId: number; name: string; team: string; headshot: string; ppg: number } | null
  leaders: Record<string, Array<{ abbr: string; value: number }>>
  seed: number
  customTeam?: CustomTeamSpec
  totals: { games: number; avgTotal: number; avgMargin: number }
}

export interface CustomTeamSpec {
  abbr: string
  name: string
  conference: 'East' | 'West'
  color: string
  playerIds: number[]
  offRating: number
  defRating: number
  pace: number
  payroll: number
}

// -------------------------------------------------------------- standings
/** The real table, straight from the season record in the dataset. */
export function realStandings() {
  const byConf = { East: [] as Team[], West: [] as Team[] }
  for (const t of engine.TEAMS) byConf[t.conference].push(t)
  const sort = (rows: Team[]) => [...rows].sort((a, b) => b.winPct - a.winPct || b.netRating - a.netRating)
  return { East: sort(byConf.East), West: sort(byConf.West) }
}

/** Playoff picture: seeds 1-6 are in, 7-10 play the play-in, 11+ are out. */
export function playoffPicture(rows: Team[]) {
  return rows.map((t, i) => ({
    team: t,
    seed: i + 1,
    status: i < 6 ? 'clinched' : i < 10 ? 'playin' : 'out' as 'clinched' | 'playin' | 'out',
    gamesBack: Math.round(((rows[0].wins - t.wins) + (t.losses - rows[0].losses)) / 2 * 10) / 10,
  }))
}

// ---------------------------------------------------------------- leaders
export interface LeaderRow { player: Player; value: number; rank: number }

export const LEADER_CATEGORIES = [
  { key: 'pts', label: 'Points', unit: 'PPG' },
  { key: 'reb', label: 'Rebounds', unit: 'RPG' },
  { key: 'ast', label: 'Assists', unit: 'APG' },
  { key: 'stl', label: 'Steals', unit: 'SPG' },
  { key: 'blk', label: 'Blocks', unit: 'BPG' },
  { key: 'fg3m', label: 'Threes made', unit: '3PM' },
  { key: 'tov', label: 'Turnovers', unit: 'TOV' },
  { key: 'min', label: 'Minutes', unit: 'MPG' },
  { key: 'ts', label: 'True shooting', unit: 'TS%' },
  { key: 'per', label: 'PER', unit: 'PER' },
  { key: 'vorp', label: 'VORP', unit: 'VORP' },
  { key: 'ws', label: 'Win shares', unit: 'WS' },
  { key: 'bpm', label: 'Box plus/minus', unit: 'BPM' },
  { key: 'gameScore', label: 'Game score', unit: 'GmSc' },
] as const

export type LeaderKey = (typeof LEADER_CATEGORIES)[number]['key']

export function leaders(key: LeaderKey, limit = 10): LeaderRow[] {
  const get = (p: Player) => Number((p as unknown as Record<string, number>)[key] ?? 0)
  return [...engine.PLAYERS]
    .sort((a, b) => get(b) - get(a))
    .slice(0, limit)
    .map((player, i) => ({ player, value: get(player), rank: i + 1 }))
}

// ------------------------------------------------------------ award races
export interface AwardCandidate {
  player: Player
  score: number
  parts: Array<{ label: string; value: number }>
  share: number
}

/**
 * Award races, scored from the things voters actually reward.
 *
 * None of these are official — they are transparent models, and each one shows
 * its components so you can disagree with the weighting rather than with a
 * black box. Team success is in every one of them because it is in every real
 * ballot too.
 */
export function awardRace(award: 'mvp' | 'dpoy' | 'roy' | 'mip' | 'sixth', limit = 6): AwardCandidate[] {
  const pool = engine.PLAYERS.filter((p) => {
    if (award === 'roy') return p.isRookie
    if (award === 'sixth') return p.min < 30 && p.pts > 10
    if (award === 'mip') return p.experience >= 2 && p.experience <= 6
    return p.min > 26
  })

  const scored = pool.map((p) => {
    const team = engine.getTeam(p.teamId)
    const winning = (team ? team.winPct - 0.5 : 0)
    let parts: Array<{ label: string; value: number }>

    if (award === 'dpoy') {
      parts = [
        { label: 'Stocks', value: r1((p.stl * 2.4 + p.blk * 2.6) * 4.2) },
        { label: 'Defensive rebounding', value: r1(p.rebounding.dreb * 1.1) },
        { label: 'Team defence', value: r1(team ? (113.5 - team.defRating) * 2.4 : 0) },
        { label: 'Minutes', value: r1(p.min * 0.35) },
      ]
    } else if (award === 'roy') {
      parts = [
        { label: 'Production', value: r1((p.pts + 1.2 * p.reb + 1.5 * p.ast) * 1.2) },
        { label: 'Efficiency', value: r1((p.ts - 0.52) * 80) },
        { label: 'Role', value: r1(p.min * 0.55) },
        { label: 'Team success', value: r1(winning * 30) },
      ]
    } else if (award === 'mip') {
      // No prior season in the dataset, so "improvement" is proxied by how far
      // a young player's production sits above what his draft slot predicts.
      const expected = 6 + Math.max(0, 30 - (p.bio.draftPick ?? 30)) * 0.45
      parts = [
        { label: 'Above expectation', value: r1((p.pts - expected) * 1.8) },
        { label: 'Efficiency', value: r1((p.ts - 0.55) * 70) },
        { label: 'Role growth', value: r1(p.min * 0.4) },
        { label: 'Team success', value: r1(winning * 22) },
      ]
    } else if (award === 'sixth') {
      parts = [
        { label: 'Bench scoring', value: r1(p.pts * 2.1) },
        { label: 'Efficiency', value: r1((p.ts - 0.55) * 80) },
        { label: 'Playmaking', value: r1(p.ast * 2.2) },
        { label: 'Team success', value: r1(winning * 18) },
      ]
    } else {
      parts = [
        { label: 'Production', value: r1((p.pts + 1.1 * p.reb + 1.6 * p.ast) * 1.15) },
        { label: 'Efficiency', value: r1((p.ts - 0.55) * 110) },
        { label: 'Impact', value: r1(p.bpm * 2.4 + p.vorp * 1.6) },
        { label: 'Team success', value: r1(winning * 46) },
      ]
    }
    return { player: p, parts, score: r1(parts.reduce((s, x) => s + x.value, 0)) }
  })

  const top = scored.sort((a, b) => b.score - a.score).slice(0, limit)
  // Vote share via softmax, so a runaway leader looks like one.
  const exps = top.map((c) => Math.exp(c.score / 14))
  const total = exps.reduce((s, x) => s + x, 0) || 1
  return top.map((c, i) => ({ ...c, share: exps[i] / total }))
}

const r1 = (v: number) => Math.round(v * 10) / 10

// ----------------------------------------------------- similar players (AI)
/**
 * Nearest-neighbour similarity over the standardised statistical profile.
 *
 * Percentiles are already on a common 0-100 scale, which is exactly what a
 * distance metric needs — comparing raw points to raw true-shooting would let
 * one axis dominate entirely. Weighted Euclidean distance, then mapped to a
 * 0-100 similarity so the number means something to a reader.
 */
const SIM_AXES: Array<[string, number]> = [
  ['pts', 1.25], ['reb', 1.0], ['ast', 1.15], ['stl', 0.7], ['blk', 0.8],
  ['tov', 0.5], ['fg3m', 0.9], ['ts', 0.9], ['usg', 1.1], ['min', 0.6],
  ['per', 0.8], ['bpm', 0.7],
]

export function similarPlayers(target: Player, limit = 5) {
  const vec = (p: Player) => SIM_AXES.map(([k]) => p.percentiles[k] ?? 50)
  const weights = SIM_AXES.map(([, w]) => w)
  const a = vec(target)
  const maxDist = Math.sqrt(weights.reduce((s, w) => s + w * 100 ** 2, 0))

  return engine.PLAYERS
    .filter((p) => p.playerId !== target.playerId)
    .map((p) => {
      const b = vec(p)
      const d = Math.sqrt(a.reduce((s, v, i) => s + weights[i] * (v - b[i]) ** 2, 0))
      return { player: p, distance: d, similarity: Math.round((1 - d / maxDist) * 1000) / 10 }
    })
    .sort((x, y) => x.distance - y.distance)
    .slice(0, limit)
}

/**
 * Archetype keys.
 *
 * The rules return a *key*, not a sentence. The label and the one-line
 * explanation live in the dictionary, so the same deterministic rule produces
 * "Primary engine" or "Motor principal" without the logic knowing either exists.
 */
export type ArchetypeKey =
  | 'primaryEngine' | 'leadPlaymaker' | 'movementShooter' | 'bucketGetter'
  | 'rimProtector' | 'floorSpacer' | 'perimeterStopper' | 'connectiveBig' | 'roleWing'

/** Rule-based archetype from the same percentile vector. Deterministic, and it
 *  explains itself — a k-means label of "cluster 4" would not. */
export function archetype(p: Player): ArchetypeKey {
  const q = p.percentiles
  const bigMan = p.position === 'C' || p.position === 'PF'
  const shooter = (p.shooting.threeRate ?? 0) > 0.45 && q.fg3Pct >= 55
  const creator = q.ast >= 78 && q.usg >= 65
  const scorer = q.pts >= 85
  const rim = bigMan && q.blk >= 70 && q.reb >= 75
  const stopper = q.stl >= 75 || q.blk >= 80

  if (creator && scorer) return 'primaryEngine'
  if (creator) return 'leadPlaymaker'
  if (scorer && shooter) return 'movementShooter'
  if (scorer) return 'bucketGetter'
  if (rim) return 'rimProtector'
  if (shooter) return 'floorSpacer'
  if (stopper) return 'perimeterStopper'
  if (bigMan) return 'connectiveBig'
  return 'roleWing'
}

/** One observation from the report, as data. The numbers are pre-formatted to
 *  one decimal because that is a presentation choice the rules already make;
 *  the *sentence* around them is not. */
export type ReportNote =
  | { k: 'scoring'; top: number; ppg: string }
  | { k: 'efficiency'; ts: string; usg: string }
  | { k: 'creation'; pctile: number; ast: string }
  | { k: 'rebounding'; reb: string; pctile: number }
  | { k: 'defence'; stl: string; blk: string }
  | { k: 'spacing'; pct: string }
  | { k: 'noStrength' }
  | { k: 'lowEfficiency'; ts: string }
  | { k: 'turnovers'; tov: string }
  | { k: 'coldShooting'; fg3a: string; pct: string }
  | { k: 'lowRebounding' }
  | { k: 'age'; age: number }
  | { k: 'overpaid'; m: number }
  | { k: 'noConcerns' }

export interface ScoutingReport {
  archetype: ArchetypeKey
  position: string
  teamAbbr: string
  strengths: ReportNote[]
  concerns: ReportNote[]
  /** Everything the summary paragraph needs, already rounded. */
  summary: {
    name: string; pts: string; reb: string; ast: string; min: string; ts: string
    perPct: number; vorpPct: number
  }
  team?: { fullName: string; wins: number; losses: number; net: string }
}

/**
 * A scouting report, generated from the numbers.
 *
 * Every note fires off a percentile threshold — nothing here is invented prose.
 * It is a readable view of the same data the charts show, which is what makes
 * it useful rather than decorative.
 */
export function scoutingReport(p: Player): ScoutingReport {
  const q = p.percentiles
  const team = engine.getTeam(p.teamId)
  const strengths: ReportNote[] = []
  const concerns: ReportNote[] = []
  // Numbers inside a sentence have to carry the reader's decimal mark, so they
  // go through the active locale's formatter rather than `toFixed`. This is
  // called from render, so it follows a language switch like the copy does.
  const f = fmt()
  const d1 = (v: number) => f.dec(v, 1)
  const pc = (v: number) => f.dec(v * 100, 1)

  if (q.pts >= 90) strengths.push({ k: 'scoring', top: 100 - q.pts + 1, ppg: d1(p.pts) })
  if (q.ts >= 80) strengths.push({ k: 'efficiency', ts: pc(p.ts), usg: pc(p.usg) })
  if (q.ast >= 80) strengths.push({ k: 'creation', pctile: q.ast, ast: d1(p.ast) })
  if (q.reb >= 82) strengths.push({ k: 'rebounding', reb: d1(p.reb), pctile: q.reb })
  if (q.stl >= 80 || q.blk >= 80) strengths.push({ k: 'defence', stl: d1(p.stl), blk: d1(p.blk) })
  if (q.fg3Pct >= 78) strengths.push({ k: 'spacing', pct: pc(p.shooting.fg3Pct) })
  if (!strengths.length) strengths.push({ k: 'noStrength' })

  if (q.ts <= 30) concerns.push({ k: 'lowEfficiency', ts: pc(p.ts) })
  if (q.tov <= 25) concerns.push({ k: 'turnovers', tov: d1(p.tov) })
  if (q.fg3Pct <= 25 && (p.shooting.fg3a ?? 0) > 2)
    concerns.push({ k: 'coldShooting', fg3a: d1(p.shooting.fg3a), pct: pc(p.shooting.fg3Pct) })
  if (q.reb <= 20 && (p.position === 'PF' || p.position === 'C'))
    concerns.push({ k: 'lowRebounding' })
  if (p.age >= 34) concerns.push({ k: 'age', age: p.age })
  if (p.surplus < 0) concerns.push({ k: 'overpaid', m: Math.abs(Math.round(p.surplus / 1e6)) })
  if (!concerns.length) concerns.push({ k: 'noConcerns' })

  return {
    archetype: archetype(p),
    position: p.position,
    teamAbbr: team?.abbr ?? '',
    strengths,
    concerns,
    summary: {
      name: p.name, pts: d1(p.pts), reb: d1(p.reb), ast: d1(p.ast),
      min: d1(p.min), ts: pc(p.ts), perPct: q.per, vorpPct: q.vorp,
    },
    team: team
      ? { fullName: team.fullName, wins: team.wins, losses: team.losses,
          net: f.signed(team.netRating) }
      : undefined,
  }
}

// ------------------------------------------------------- league simulation
const LEAGUE_RATING = 113.5
const HOME_EDGE = 2.4

function expectedMargin(home: RatedTeam, away: RatedTeam): { margin: number; poss: number } {
  const poss = (home.pace + away.pace) / 2
  const hp = (LEAGUE_RATING + (home.off - LEAGUE_RATING) + (away.def - LEAGUE_RATING)) * poss / 100
  const ap = (LEAGUE_RATING + (away.off - LEAGUE_RATING) + (home.def - LEAGUE_RATING)) * poss / 100
  return { margin: hp - ap + HOME_EDGE, poss }
}

interface RatedTeam {
  abbr: string; off: number; def: number; pace: number
}

function playGame(home: RatedTeam, away: RatedTeam, rng: Rng) {
  const { margin, poss } = expectedMargin(home, away)
  const total = ((home.off + away.off + home.def + away.def) / 2) * poss / 100
  const drawMargin = rng.normal(margin, 11.8)
  const drawTotal = rng.normal(total, 13.5)
  let homePts = Math.round((drawTotal + drawMargin) / 2)
  let awayPts = Math.round((drawTotal - drawMargin) / 2)
  if (homePts === awayPts) homePts += rng.next() < 0.5 ? 1 : -1  // no ties in basketball
  return { homePts: clamp(homePts, 70, 175), awayPts: clamp(awayPts, 70, 175) }
}

/** Build the invented team's ratings from the players signed to it. Same shape
 *  as the fantasy builder uses, so a roster carries over between the two. */
export function customTeamFrom(
  playerIds: number[], name: string, abbr: string, conference: 'East' | 'West', color: string,
): CustomTeamSpec {
  const players = playerIds.map((id) => engine.getPlayer(id)).filter(Boolean) as Player[]
  const off = Math.min(126, 104 + players.reduce((s, p) => s + p.pts, 0) * 0.42)
  const def = Math.max(103, 118 - players.reduce((s, p) => s + p.stl * 2.2 + p.blk * 2.6, 0) * 0.55)
  return {
    abbr, name, conference, color,
    playerIds,
    offRating: Math.round(off * 10) / 10,
    defRating: Math.round(def * 10) / 10,
    pace: 100.5,
    payroll: players.reduce((s, p) => s + p.salary, 0),
  }
}

function blankRecord(t: Team | CustomTeamSpec, isCustom = false): SimTeamRecord {
  const asTeam = t as Team
  return {
    abbr: t.abbr,
    name: isCustom ? (t as CustomTeamSpec).name : asTeam.fullName,
    conference: t.conference as 'East' | 'West',
    division: isCustom ? 'Custom' : asTeam.division,
    color: isCustom ? (t as CustomTeamSpec).color : asTeam.primaryColor,
    teamId: isCustom ? 'custom' : asTeam.teamId,
    isCustom,
    wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0,
    streak: 0, last10: 0,
    homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
  }
}

/**
 * Play a full regular season, then the playoffs.
 *
 * The schedule is a simple double round-robin trimmed to 82 games per team,
 * which is not the NBA's real (conference-weighted) schedule but preserves the
 * thing that matters here: everyone plays everyone, home and away, the same
 * number of times. With a custom team in the league it becomes 31 or 32 teams,
 * so the game count is scaled to keep the season the right length.
 */
export function simulateLeague(opts: {
  seed?: number
  custom?: CustomTeamSpec | null
  replaces?: string | null     // abbr the custom team takes the place of
  onProgress?: (done: number, total: number, stage: string) => void
} = {}): LeagueSimResult {
  const { seed = 2026, custom = null, replaces = null, onProgress } = opts
  const rng = makeRng(hashSeed('league', seed, custom?.abbr ?? '-', replaces ?? '-'))

  const base = engine.TEAMS.filter((t) => !(replaces && t.abbr === replaces))
  const rated = new Map<string, RatedTeam>()
  const records = new Map<string, SimTeamRecord>()

  for (const t of base) {
    rated.set(t.abbr, { abbr: t.abbr, off: t.offRating, def: t.defRating, pace: t.pace })
    records.set(t.abbr, blankRecord(t))
  }
  if (custom) {
    rated.set(custom.abbr, {
      abbr: custom.abbr, off: custom.offRating, def: custom.defRating, pace: custom.pace,
    })
    records.set(custom.abbr, blankRecord(custom, true))
  }

  const abbrs = [...rated.keys()]
  const games: SimGameResult[] = []
  const last10: Record<string, number[]> = Object.fromEntries(abbrs.map((a) => [a, []]))

  // A double round-robin gives every team 2×(N−1) games — 58 in a 30-team
  // league. The schedule then keeps cycling shuffled pairs until everyone has
  // played 82, skipping any game where either side is already full.
  const GAMES_PER_TEAM = 82
  const basePairs: Array<[string, string]> = []
  for (const a of abbrs) for (const b of abbrs) if (a !== b) basePairs.push([a, b])

  const played: Record<string, number> = Object.fromEntries(abbrs.map((a) => [a, 0]))
  const schedule: Array<[string, string]> = []
  for (let pass = 0; pass < 6; pass++) {
    // Fisher-Yates on a copy, so each pass has a different order and the
    // trailing partial pass is not biased toward the same fixtures.
    const shuffled = [...basePairs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng.next() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    for (const [h, a] of shuffled) {
      if (played[h] >= GAMES_PER_TEAM || played[a] >= GAMES_PER_TEAM) continue
      schedule.push([h, a])
      played[h]++; played[a]++
    }
    if (abbrs.every((a) => played[a] >= GAMES_PER_TEAM)) break
  }

  let day = 0
  const totalGames = schedule.length
  {
    for (const [homeAbbr, awayAbbr] of schedule) {
      const res = playGame(rated.get(homeAbbr)!, rated.get(awayAbbr)!, rng)
      const home = records.get(homeAbbr)!
      const away = records.get(awayAbbr)!
      const homeWon = res.homePts > res.awayPts

      home.pointsFor += res.homePts; home.pointsAgainst += res.awayPts
      away.pointsFor += res.awayPts; away.pointsAgainst += res.homePts
      if (homeWon) { home.wins++; home.homeWins++; away.losses++; away.awayLosses++ }
      else { home.losses++; home.homeLosses++; away.wins++; away.awayWins++ }
      home.streak = homeWon ? Math.max(1, home.streak + 1) : Math.min(-1, home.streak - 1)
      away.streak = homeWon ? Math.min(-1, away.streak - 1) : Math.max(1, away.streak + 1)
      last10[homeAbbr].push(homeWon ? 1 : 0)
      last10[awayAbbr].push(homeWon ? 0 : 1)

      games.push({ home: homeAbbr, away: awayAbbr, homePts: res.homePts, awayPts: res.awayPts, day: day++ })
      if (onProgress && games.length % 200 === 0) {
        onProgress(games.length, totalGames, 'Playing the regular season')
      }
    }
  }
  for (const a of abbrs) {
    records.get(a)!.last10 = last10[a].slice(-10).reduce((s, x) => s + x, 0)
  }

  // ---------------------------------------------------------- standings
  const sortConf = (conf: 'East' | 'West') =>
    [...records.values()]
      .filter((r) => r.conference === conf)
      .sort((a, b) => (b.wins - a.wins)
        || ((b.pointsFor - b.pointsAgainst) - (a.pointsFor - a.pointsAgainst)))
  const standings = { East: sortConf('East'), West: sortConf('West') }

  // ----------------------------------------------------------- playoffs
  onProgress?.(totalGames, totalGames, 'Running the playoffs')
  const series: SeriesResult[] = []

  const playSeries = (round: string, high: string, low: string): string => {
    const homes = [true, true, false, false, true, false, true]
    let hw = 0, lw = 0
    const gameLog: SeriesResult['games'] = []
    for (let g = 0; g < 7 && hw < 4 && lw < 4; g++) {
      const atHigh = homes[g]
      const homeAbbr = atHigh ? high : low
      const awayAbbr = atHigh ? low : high
      const res = playGame(rated.get(homeAbbr)!, rated.get(awayAbbr)!, rng)
      gameLog.push({ home: homeAbbr, away: awayAbbr, homePts: res.homePts, awayPts: res.awayPts })
      const highWon = res.homePts > res.awayPts ? atHigh : !atHigh
      highWon ? hw++ : lw++
    }
    const winner = hw > lw ? high : low
    series.push({ round, high, low, highWins: hw, lowWins: lw, winner, games: gameLog })
    return winner
  }

  const bracket = (conf: 'East' | 'West') => {
    const seeds = standings[conf].slice(0, 8).map((r) => r.abbr)
    const r1 = [
      playSeries(`${conf} first round`, seeds[0], seeds[7]),
      playSeries(`${conf} first round`, seeds[3], seeds[4]),
      playSeries(`${conf} first round`, seeds[2], seeds[5]),
      playSeries(`${conf} first round`, seeds[1], seeds[6]),
    ]
    const rank = (a: string) => seeds.indexOf(a)
    const semi = [
      playSeries(`${conf} semi-final`, ...(rank(r1[0]) < rank(r1[1]) ? [r1[0], r1[1]] : [r1[1], r1[0]]) as [string, string]),
      playSeries(`${conf} semi-final`, ...(rank(r1[2]) < rank(r1[3]) ? [r1[2], r1[3]] : [r1[3], r1[2]]) as [string, string]),
    ]
    return playSeries(`${conf} finals`,
      ...(rank(semi[0]) < rank(semi[1]) ? [semi[0], semi[1]] : [semi[1], semi[0]]) as [string, string])
  }

  const east = bracket('East')
  const west = bracket('West')
  const eastRec = records.get(east)!
  const westRec = records.get(west)!
  const champion = playSeries('NBA Finals',
    eastRec.wins >= westRec.wins ? east : west,
    eastRec.wins >= westRec.wins ? west : east)

  // Finals MVP: best player on the winning side, by the same production score.
  const roster = champion === custom?.abbr
    ? (custom.playerIds.map((id) => engine.getPlayer(id)).filter(Boolean) as Player[])
    : engine.roster(champion)
  const mvp = roster.length
    ? roster.reduce((a, b) => (b.pts + b.reb * 0.9 + b.ast * 1.2 > a.pts + a.reb * 0.9 + a.ast * 1.2 ? b : a))
    : null

  const allTotals = games.map((g) => g.homePts + g.awayPts)
  const allMargins = games.map((g) => Math.abs(g.homePts - g.awayPts))

  return {
    standings,
    playoffs: series,
    champion,
    championName: records.get(champion)?.name ?? champion,
    finalsMvp: mvp
      ? { playerId: mvp.playerId, name: mvp.name, team: champion, headshot: mvp.headshot, ppg: mvp.pts }
      : null,
    leaders: {
      offence: [...rated.values()].sort((a, b) => b.off - a.off).slice(0, 5)
        .map((t) => ({ abbr: t.abbr, value: t.off })),
      defence: [...rated.values()].sort((a, b) => a.def - b.def).slice(0, 5)
        .map((t) => ({ abbr: t.abbr, value: t.def })),
    },
    seed,
    customTeam: custom ?? undefined,
    totals: {
      games: games.length,
      avgTotal: Math.round(mean(allTotals) * 10) / 10,
      avgMargin: Math.round(mean(allMargins) * 10) / 10,
    },
  }
}
