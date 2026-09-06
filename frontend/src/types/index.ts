export interface Team {
  teamId: number
  abbr: string
  city: string
  name: string
  fullName: string
  conference: 'East' | 'West'
  division: string
  primaryColor: string
  secondaryColor: string
  logo: string
  offRating: number
  defRating: number
  netRating: number
  pace: number
  wins: number
  losses: number
  winPct: number
  season: string
  defVsPosition: Record<string, number>
  pointsPerGame: number
  pointsAllowed: number
  pointDiff: number
  tsPct: number
  threeRate: number
  payroll: number
  avgAge: number
  franchise: Franchise
  venue: Venue
  tickets: TicketMarket
  recentHomeGames: HomeGate[]
  attendanceRank: number
  ticketPriceRank: number
  netRatingRank: number
  offRatingRank: number
  defRatingRank: number
  paceRank: number
  winPctRank: number
  pointsPerGameRank: number
}

export interface Venue {
  arena: string
  capacity: number
  opened: number
  age: number
  city: string
  region: string
  marketRank: number
  averageAttendance: number
  fillRate: number
  totalAttendance: number
  sellouts: number
  homeGames: number
  demandIndex: number
  vsLeagueAvg: number
  /** Attendance and pricing are modelled, not scraped — the UI must say so. */
  modelled: boolean
}

export interface TicketMarket {
  averagePrice: number
  getInPrice: number
  premiumPrice: number
  vsLeagueAvg: number
  modelled: boolean
}

export interface HomeGate {
  date: string
  opponent: string
  opponentName: string
  attendance: number
  fillRate: number
  soldOut: boolean
  averagePrice: number
  getInPrice: number
  weekend: boolean
}

export interface Franchise {
  championships: number[]
  titleCount: number
  abaChampionships: number[]
  lastTitle: number | null
  titleDrought: number | null
  founded: number | null
  arena: string | null
  notes: Record<string, string>
}

export interface ShootingSplits {
  fgm: number; fga: number; fgPct: number
  fg2m: number; fg2a: number; fg2Pct: number
  fg3m: number; fg3a: number; fg3Pct: number
  ftm: number; fta: number; ftPct: number
  efgPct: number; tsPct: number; threeRate: number; ftRate: number
  pointsFrom: { two: number; three: number; free: number }
}

export interface AdvancedStats {
  per: number; ws: number; ws48: number
  bpm: number; obpm: number; dbpm: number; vorp: number
  ortg: number; drtg: number; netRtg: number
  usgPct: number; gameScore: number
  derived: boolean
}

export interface PlayerBio {
  heightIn: number; heightCm: number; heightLabel: string
  weightLb: number; weightKg: number
  country: string
  draftYear: number | null; draftRound: number | null; draftPick: number | null
  draftLabel: string
  /** College or prior club — only carried for the current draft class. */
  origin?: string | null
  measurementsEstimated: boolean
}

export interface Honour {
  label: string
  count: number
  years: number[]
  icon: string
}

export interface Stint {
  team: string
  from: number
  to: number | null
  seasons: number
}

export interface Player {
  playerId: number
  name: string
  firstName: string
  lastName: string
  slug: string
  team: string
  teamId: number
  position: string
  age: number
  season: string
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fg3m: number
  ts: number
  usg: number
  // reconstructed shooting line, flattened for convenience
  fga: number; fgm: number; fgPct: number
  fg3a: number; fg3Pct: number; efgPct: number
  fta: number; ftm: number
  // advanced, flattened
  per: number; bpm: number; vorp: number; ws: number; gameScore: number
  salary: number
  estimatedValue: number
  marketPrice: number
  valueIndex: number
  surplus: number
  leagueMax: number
  headshot: string
  teamLogo: string
  shooting: ShootingSplits
  rebounding: { oreb: number; dreb: number }
  advanced: AdvancedStats
  per36: Record<string, number>
  percentiles: Record<string, number>
  bio: PlayerBio
  honours: Honour[]
  rings: number
  stints: Stint[]
  experience: number
  isRookie: boolean
}

export interface GameLog {
  gameId: string
  date: string
  opponent: string
  opponentId: number
  isHome: boolean
  restDays: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fg3m: number
  min: number
  ts: number
  plusMinus: number
}

export interface SeasonRow {
  season: string
  seasonStart: number
  age: number
  team: string
  gp: number
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fg3m: number
  ts: number
  per: number
  ws: number
  bpm: number
  vorp: number
}

export interface Distribution {
  mean: number
  median: number
  low: number
  high: number
  p10: number
  p90: number
  quantiles: Record<string, number>
  line?: number
  probOver?: number
  probUnder?: number
}

export interface Driver {
  label: string
  detail: string
  impact: number
}

export interface PlayerPrediction {
  player: Player
  opponent: Team
  context: {
    venue: 'home' | 'away'
    restDays: number
    seasonType: 'regular' | 'playoffs'
    formIndex: number
    matchupDefVsPosition: number
  }
  projections: Record<string, Distribution>
  drivers: Driver[]
  source: 'model' | 'mock'
}

export interface TeamPrediction {
  home: Team
  away: Team
  seasonType: 'regular' | 'playoffs'
  projection: {
    homePts: Distribution
    awayPts: Distribution
    margin: Distribution
    total: Distribution
    homeWinProb: number
    awayWinProb: number
    possessions: number
    spread: number
  }
  contributions: Array<{
    playerId: number; name: string; team: string; headshot: string
    pts: number; reb: number; ast: number; min: number
  }>
  series?: { homeWinsSeries: number; gameHomeProb: number; gameAwayProb: number; format: string }
  source: 'model' | 'mock'
}

export interface H2HGame {
  season: string
  date: string
  isHome: boolean
  pts: number
  reb: number
  ast: number
  min: number
}

export interface BoxRow {
  playerId: number; name: string; team: string; min: number
  pts: number; reb: number; ast: number; stl: number; blk: number; tov: number
  fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number
  isFiller?: boolean
}

/** Shot flavour, kept as a token so the caption can be written in any language. */
export type ShotKind = 'three' | 'rim' | 'mid'

/**
 * A play, described rather than narrated.
 *
 * The simulator runs inside a Web Worker, where there is no store and no
 * dictionary — and a cached result would freeze whatever language it was
 * generated in. So the engine emits *what happened* and the broadcast writes
 * the sentence at render time, which is why switching to Spanish re-narrates a
 * game you have already watched instead of leaving English in the log.
 */
export type PlayDescriptor =
  | { t: 'turnover'; actor: string; stealer: string }
  | { t: 'blocked'; actor: string; kind: ShotKind; blocker: string }
  | { t: 'made'; actor: string; kind: ShotKind; assist?: string; andOne: boolean }
  | { t: 'ft'; actor: string; made: number; shots: number }
  | { t: 'miss'; actor: string; kind: ShotKind }
  | { t: 'rebound'; name: string; offensive: boolean }
  | { t: 'secondChance'; actor: string }
  | { t: 'putbackMiss'; actor: string }
  | { t: 'period'; label: string }

export interface SimEvent {
  clockSeconds: number
  period: number
  periodClock: string
  team: string
  kind: 'shot_made' | 'shot_miss' | 'turnover' | 'rebound' | 'ft' | 'period'
  /** English caption — the fallback, and what a copied play-by-play contains. */
  text: string
  /** The same play as data. Preferred by the UI; `text` is used if absent. */
  play?: PlayDescriptor
  homeScore: number
  awayScore: number
  playerId: number | null
  /** Secondary actors, so a live box score can be rebuilt exactly from the
   *  event stream instead of being guessed from the play text. */
  assistPlayerId?: number | null
  defenderPlayerId?: number | null
  points: number
  highlight: boolean
}

export interface SimResult {
  final: { home: number; away: number; periods: number; overtime: number }
  home: { teamId: number | string; name: string; abbr: string; score: number; box: BoxRow[]; logo?: string; color?: string }
  away: { teamId: number | string; name: string; abbr: string; score: number; box: BoxRow[]; logo?: string; color?: string }
  events: SimEvent[]
  durationSeconds: number
  userSide: 'home' | 'away'
  seed: number
  isPlayoffs: boolean
  distribution?: {
    runs: number; homeWinProb: number; marginMean: number; marginStd: number
    marginP10: number; marginP90: number; totalMean: number
  }
}

export interface PricedPlayer extends Player {
  cost: number
  costPct: number
  efficiency: number
}
