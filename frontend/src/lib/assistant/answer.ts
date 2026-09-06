/**
 * Turning an intent into an answer.
 *
 * Everything here reads the same objects the pages render, so the assistant can
 * never contradict the charts above it — if the profile says 28.4 points, so
 * does the answer, because both read `player.pts`.
 *
 * Nothing returns a sentence. Each builder returns `Say` values — a dictionary
 * key plus its arguments — and picks between *different keys* where English and
 * Spanish would want different wording ("elite" vs "de rol" is a key choice,
 * not a word passed in). That keeps the whole file language-free, which is what
 * lets an answer given in English re-render in Spanish when the reader flips
 * the switch.
 */
import * as engine from '@/lib/engine'
import * as season from '@/lib/season'
import { fmt } from '@/i18n'
import { CAP, LUXURY_TAX } from '@/lib/cap'
import type { Player, Team } from '@/types'
import type { IntentKey } from './match'
import { classify } from './match'
import type { Chip, Reply, Say, Subject, SuggestionKey } from './types'

/** Percentile → tone for a chip. Turnovers arrive already inverted. */
const tone = (p: number): Chip['tone'] => (p >= 70 ? 'good' : p <= 30 ? 'bad' : 'neutral')

const PLAYER_SUGGESTIONS: SuggestionKey[] = [
  'howGood', 'scoring', 'defence', 'shooting', 'strength', 'weakness',
  'contract', 'form', 'comparison', 'advanced', 'homeAway', 'honours',
  'rank', 'career',
]
const TEAM_SUGGESTIONS: SuggestionKey[] = [
  'teamHowGood', 'teamOffence', 'teamDefence', 'teamBest', 'teamStrength',
  'teamWeakness', 'teamRecord', 'teamRoster', 'teamPayroll', 'teamArena',
  'teamHistory', 'teamPace',
]

export const suggestionsFor = (subject: Subject): SuggestionKey[] =>
  subject.kind === 'player' ? PLAYER_SUGGESTIONS : TEAM_SUGGESTIONS

/** Pick a few follow-ups that are not the question just answered. */
function followUps(subject: Subject, exclude: SuggestionKey[]): SuggestionKey[] {
  const pool = suggestionsFor(subject).filter((s) => !exclude.includes(s))
  return pool.slice(0, 3)
}

// ------------------------------------------------------------------ greeting

export function greet(subject: Subject): Reply {
  return subject.kind === 'player'
    ? { lines: [{ k: 'greetingPlayer', a: { name: subject.name } }],
        followUps: ['howGood', 'weakness', 'contract'] }
    : { lines: [{ k: 'greetingTeam', a: { name: subject.name } }],
        followUps: ['teamHowGood', 'teamBest', 'teamWeakness'] }
}

// -------------------------------------------------------------------- player

function playerReply(p: Player, intent: IntentKey, versusAbbr: string | null): Reply {
  const f = fmt()
  const q = p.percentiles
  const team = engine.getTeam(p.teamId)
  const d = (v: number, n = 1) => f.dec(v, n)
  const pc = (v: number) => f.dec(v * 100, 1)

  switch (intent) {
    case 'playerHowGood': {
      const report = season.scoutingReport(p)
      const verdict: Say = q.per >= 90
        ? { k: 'verdictElite', a: { name: p.name, perPct: q.per, vorpPct: q.vorp } }
        : q.per >= 70
          ? { k: 'verdictStrong', a: { name: p.name, perPct: q.per, vorpPct: q.vorp } }
          : q.per >= 45
            ? { k: 'verdictSolid', a: { name: p.name, perPct: q.per, vorpPct: q.vorp } }
            : { k: 'verdictRole', a: { name: p.name, perPct: q.per, vorpPct: q.vorp } }
      return {
        archetype: report.archetype,
        lines: [
          verdict,
          { k: 'statLine', a: { pts: d(p.pts), reb: d(p.reb), ast: d(p.ast), min: d(p.min), ts: pc(p.ts) } },
        ],
        chips: [
          { label: 'per', value: d(p.per), percentile: q.per, tone: tone(q.per) },
          { label: 'vorp', value: d(p.vorp), percentile: q.vorp, tone: tone(q.vorp) },
          { label: 'ts', value: `${pc(p.ts)}%`, percentile: q.ts, tone: tone(q.ts) },
        ],
        followUps: followUps({ kind: 'player', id: p.playerId, name: p.name, teamAbbr: p.team }, ['howGood']),
      }
    }

    case 'playerOverview': {
      const report = season.scoutingReport(p)
      return {
        archetype: report.archetype,
        lines: [
          { k: 'overviewContext', a: {
            pos: p.position, team: team?.fullName ?? p.team, age: p.age,
            wins: team?.wins ?? 0, losses: team?.losses ?? 0 } },
          { k: 'statLine', a: { pts: d(p.pts), reb: d(p.reb), ast: d(p.ast), min: d(p.min), ts: pc(p.ts) } },
        ],
        followUps: followUps({ kind: 'player', id: p.playerId, name: p.name, teamAbbr: p.team }, []),
      }
    }

    case 'playerScoring':
      return {
        lines: [
          { k: 'scoring', a: { name: p.name, pts: d(p.pts), pctile: q.pts, ts: pc(p.ts), tsPct: q.ts } },
          { k: 'scoringMix', a: {
            fg3m: d(p.fg3m), fg3Pct: pc(p.shooting.fg3Pct), ftm: d(p.shooting.ftm),
            fga: d(p.shooting.fga) } },
        ],
        chips: [
          { label: 'pts', value: d(p.pts), percentile: q.pts, tone: tone(q.pts) },
          { label: 'ts', value: `${pc(p.ts)}%`, percentile: q.ts, tone: tone(q.ts) },
          { label: 'usg', value: `${pc(p.usg)}%`, percentile: q.usg, tone: tone(q.usg) },
        ],
        followUps: ['shooting', 'howGood', 'rank'],
      }

    case 'playerRebounding':
      return {
        lines: [{ k: 'rebounding', a: {
          name: p.name, reb: d(p.reb), pctile: q.reb,
          oreb: d(p.rebounding.oreb), dreb: d(p.rebounding.dreb), pos: p.position } }],
        chips: [{ label: 'reb', value: d(p.reb), percentile: q.reb, tone: tone(q.reb) }],
        followUps: ['defence', 'howGood', 'rank'],
      }

    case 'playerPlaymaking': {
      const ratio = p.tov > 0 ? p.ast / p.tov : p.ast
      return {
        lines: [{ k: 'playmaking', a: {
          name: p.name, ast: d(p.ast), pctile: q.ast, tov: d(p.tov), ratio: d(ratio, 1) } }],
        chips: [
          { label: 'ast', value: d(p.ast), percentile: q.ast, tone: tone(q.ast) },
          { label: 'tov', value: d(p.tov), percentile: q.tov, tone: tone(q.tov) },
        ],
        followUps: ['scoring', 'weakness', 'advanced'],
      }
    }

    case 'playerDefence':
      return {
        lines: [
          { k: 'defence', a: {
            name: p.name, stl: d(p.stl), blk: d(p.blk), stlPct: q.stl, blkPct: q.blk } },
          { k: 'defenceContext', a: { dbpm: f.signed(p.advanced.dbpm), drtg: d(p.advanced.drtg) } },
        ],
        chips: [
          { label: 'stl', value: d(p.stl), percentile: q.stl, tone: tone(q.stl) },
          { label: 'blk', value: d(p.blk), percentile: q.blk, tone: tone(q.blk) },
        ],
        followUps: ['howGood', 'weakness', 'advanced'],
      }

    case 'playerShooting':
      return {
        lines: [
          { k: 'shooting', a: {
            name: p.name, fgPct: pc(p.shooting.fgPct), fg3Pct: pc(p.shooting.fg3Pct),
            fg3a: d(p.shooting.fg3a), ts: pc(p.ts), efg: pc(p.shooting.efgPct) } },
          { k: 'shootingVerdict', a: { name: p.name, tsPct: q.ts, threePct: q.fg3Pct } },
        ],
        chips: [
          { label: 'ts', value: `${pc(p.ts)}%`, percentile: q.ts, tone: tone(q.ts) },
          { label: 'fg3Pct', value: `${pc(p.shooting.fg3Pct)}%`, percentile: q.fg3Pct, tone: tone(q.fg3Pct) },
          { label: 'efgPct', value: `${pc(p.shooting.efgPct)}%` },
        ],
        followUps: ['scoring', 'howGood', 'rank'],
      }

    case 'playerTurnovers':
      return {
        lines: [{ k: 'turnovers', a: {
          name: p.name, tov: d(p.tov), pctile: q.tov, usg: pc(p.usg) } }],
        chips: [{ label: 'tov', value: d(p.tov), percentile: q.tov, tone: tone(q.tov) }],
        followUps: ['contract', 'weakness', 'howGood'],
      }

    case 'playerRole':
      return {
        lines: [{ k: 'role', a: {
          name: p.name, min: d(p.min), minPct: q.min, usg: pc(p.usg), usgPct: q.usg } }],
        chips: [
          { label: 'min', value: d(p.min), percentile: q.min, tone: tone(q.min) },
          { label: 'usg', value: `${pc(p.usg)}%`, percentile: q.usg, tone: tone(q.usg) },
        ],
        followUps: ['howGood', 'scoring', 'form'],
      }

    case 'playerAdvanced':
      return {
        lines: [
          { k: 'advanced', a: {
            name: p.name, per: d(p.per), bpm: f.signed(p.bpm), vorp: d(p.vorp), ws: d(p.ws) } },
          { k: 'advancedContext', a: { perPct: q.per, vorpPct: q.vorp, bpmPct: q.bpm } },
          { k: 'advancedDerived', a: { name: p.name } },
        ],
        chips: [
          { label: 'per', value: d(p.per), percentile: q.per, tone: tone(q.per) },
          { label: 'bpm', value: f.signed(p.bpm), percentile: q.bpm, tone: tone(q.bpm) },
          { label: 'vorp', value: d(p.vorp), percentile: q.vorp, tone: tone(q.vorp) },
          { label: 'ws', value: d(p.ws), percentile: q.ws, tone: tone(q.ws) },
        ],
        followUps: ['howGood', 'weakness', 'rank'],
      }

    case 'playerStrength': {
      const report = season.scoutingReport(p)
      return {
        lines: [{ k: 'strengthsIntro', a: { name: p.name } }],
        notes: report.strengths,
        followUps: ['weakness', 'howGood', 'comparison'],
      }
    }

    case 'playerWeakness': {
      const report = season.scoutingReport(p)
      return {
        lines: [{ k: 'concernsIntro', a: { name: p.name } }],
        notes: report.concerns,
        followUps: ['howGood', 'contract', 'form'],
      }
    }

    case 'playerContract': {
      const diff = Math.abs(p.surplus)
      const line: Say = p.surplus > 2e6
        ? { k: 'contractBargain', a: {
            name: p.name, salary: f.money(p.salary), value: f.money(p.marketPrice), diff: f.money(diff) } }
        : p.surplus < -2e6
          ? { k: 'contractOverpaid', a: {
              name: p.name, salary: f.money(p.salary), value: f.money(p.marketPrice), diff: f.money(diff) } }
          : { k: 'contractFair', a: {
              name: p.name, salary: f.money(p.salary), value: f.money(p.marketPrice) } }
      return {
        lines: [line, { k: 'contractCap', a: {
          pct: f.dec((p.salary / CAP) * 100, 1), cap: f.money(CAP), age: p.age } }],
        chips: [
          { label: 'salary', value: f.money(p.salary) },
          { label: 'marketValue', value: f.money(p.marketPrice) },
        ],
        followUps: ['howGood', 'weakness', 'advanced'],
      }
    }

    case 'playerComparison': {
      const sims = season.similarPlayers(p, 3)
      if (!sims.length) return notUnderstood({ kind: 'player', id: p.playerId, name: p.name, teamAbbr: p.team })
      return {
        lines: [
          { k: 'comparison', a: {
            name: p.name, first: sims[0].player.name,
            similarity: f.dec(sims[0].similarity, 0),
            rest: sims.slice(1).map((s) => s.player.name).join(', ') } },
          { k: 'comparisonMethod', a: { name: p.name } },
        ],
        followUps: ['howGood', 'strength', 'rank'],
      }
    }

    case 'playerForm': {
      const logs = engine.gameLogs(p)
      const last5 = logs.slice(0, 5)
      const avg = last5.reduce((s, l) => s + l.pts, 0) / Math.max(last5.length, 1)
      const delta = avg - p.pts
      const line: Say = delta > 2.5
        ? { k: 'formHot', a: { name: p.name, last5: d(avg), season: d(p.pts), diff: f.signed(delta) } }
        : delta < -2.5
          ? { k: 'formCold', a: { name: p.name, last5: d(avg), season: d(p.pts), diff: f.signed(delta) } }
          : { k: 'formSteady', a: { name: p.name, last5: d(avg), season: d(p.pts) } }
      return {
        lines: [line, { k: 'formHigh', a: {
          high: Math.max(...logs.map((l) => l.pts)), games: logs.length } }],
        followUps: ['homeAway', 'howGood', 'scoring'],
      }
    }

    case 'playerHomeAway': {
      const s = engine.splits(engine.gameLogs(p))
      return {
        lines: [
          { k: 'homeAway', a: {
            name: p.name, homePts: d(s.home.pts), awayPts: d(s.away.pts),
            homeGp: s.home.gp, awayGp: s.away.gp, diff: f.signed(s.home.pts - s.away.pts) } },
          { k: 'restSplit', a: {
            rested: d(s.rested.pts), b2b: d(s.backToBack.pts),
            diff: f.signed(s.rested.pts - s.backToBack.pts) } },
        ],
        followUps: ['form', 'howGood', 'rank'],
      }
    }

    case 'playerHonours': {
      if (!p.honours.length && !p.rings) {
        return { lines: [{ k: 'honoursNone', a: { name: p.name, experience: p.experience } }],
                 followUps: ['howGood', 'career', 'comparison'] }
      }
      return {
        lines: [
          { k: 'honours', a: {
            name: p.name, rings: p.rings,
            list: p.honours.map((h) => `${h.count}× ${h.label}`).join(' · ') } },
        ],
        followUps: ['howGood', 'comparison', 'contract'],
      }
    }

    case 'playerBio':
      return {
        lines: [
          { k: 'bio', a: {
            name: p.name, age: p.age, height: p.bio.heightLabel, cm: p.bio.heightCm,
            weight: p.bio.weightLb, kg: p.bio.weightKg, country: p.bio.country } },
          p.bio.draftYear && p.bio.draftRound && p.bio.draftPick
            ? { k: 'bioDraft', a: {
                name: p.name, year: p.bio.draftYear, round: p.bio.draftRound,
                pick: p.bio.draftPick, experience: p.experience } }
            : { k: 'bioUndrafted', a: { name: p.name, experience: p.experience } },
        ],
        followUps: ['howGood', 'contract', 'honours'],
      }

    case 'playerCareer': {
      const stints = p.stints.length
        ? p.stints.map((s) => s.team).filter((v, i, a) => a.indexOf(v) === i)
        : [p.team]
      return {
        lines: [{ k: 'career', a: {
          name: p.name, teams: stints.join(' → '), count: stints.length,
          seasons: p.experience, current: team?.fullName ?? p.team } }],
        followUps: ['honours', 'howGood', 'contract'],
      }
    }

    case 'playerRank': {
      const tracked: Array<[string, number]> = [
        ['pts', q.pts], ['reb', q.reb], ['ast', q.ast], ['stl', q.stl],
        ['blk', q.blk], ['ts', q.ts], ['per', q.per], ['vorp', q.vorp],
      ]
      const sorted = [...tracked].sort((a, b) => b[1] - a[1])
      const bestPct = sorted[0][1]
      const worstPct = sorted[sorted.length - 1][1]
      return {
        lines: [{ k: 'rank', a: {
          name: p.name, bestPct, worstPct, total: engine.PLAYERS.length } }],
        chips: sorted.slice(0, 4).map(([k, v]) => ({
          label: k, value: `${v}`, percentile: v, tone: tone(v) })),
        followUps: ['howGood', 'weakness', 'comparison'],
      }
    }

    case 'playerVsTeam': {
      const opp = versusAbbr ? engine.getTeam(versusAbbr) : null
      if (!opp) return notUnderstood({ kind: 'player', id: p.playerId, name: p.name, teamAbbr: p.team })
      const games = engine.headToHead(p, opp.abbr)
      if (!games.length) {
        return { lines: [{ k: 'vsTeamNone', a: { name: p.name, opp: opp.fullName } }] }
      }
      const mean = (key: 'pts' | 'reb' | 'ast') =>
        d(games.reduce((s, g) => s + g[key], 0) / games.length)
      return {
        lines: [
          { k: 'vsTeam', a: {
            name: p.name, opp: opp.fullName, gp: games.length,
            pts: mean('pts'), reb: mean('reb'), ast: mean('ast'), season: d(p.pts) } },
          { k: 'vsTeamDefence', a: {
            opp: opp.abbr, drtg: d(opp.defRating), rank: opp.defRatingRank } },
        ],
        followUps: ['form', 'howGood', 'homeAway'],
      }
    }

    default:
      return notUnderstood({ kind: 'player', id: p.playerId, name: p.name, teamAbbr: p.team })
  }
}

// ---------------------------------------------------------------------- team

/** Rank → the area keys used for "what are they good/bad at". */
function teamAreas(t: Team): Array<{ key: 'offence' | 'defence' | 'pace' | 'shooting'; rank: number }> {
  return [
    { key: 'offence', rank: t.offRatingRank },
    { key: 'defence', rank: t.defRatingRank },
    { key: 'shooting', rank: Math.max(1, Math.round(31 - t.tsPct * 55)) },
    { key: 'pace', rank: t.paceRank },
  ]
}

function teamReply(t: Team, intent: IntentKey, versusAbbr: string | null): Reply {
  const f = fmt()
  const d = (v: number, n = 1) => f.dec(v, n)
  const standings = season.realStandings()[t.conference]
  const seed = standings.findIndex((x) => x.abbr === t.abbr) + 1
  // The conference travels as a flag, not as the word "East": each language
  // writes its own noun, and Spanish needs "del Este" rather than "de East".
  const east = t.conference === 'East'
  const leaders = engine.teamLeaders(t.abbr)

  switch (intent) {
    case 'teamHowGood': {
      const line: Say = t.netRating >= 4
        ? { k: 'teamVerdictContender', a: { name: t.name, net: f.signed(t.netRating), rank: t.netRatingRank } }
        : t.netRating >= 0
          ? { k: 'teamVerdictPlayoff', a: { name: t.name, net: f.signed(t.netRating), rank: t.netRatingRank } }
          : t.netRating >= -4
            ? { k: 'teamVerdictMiddling', a: { name: t.name, net: f.signed(t.netRating), rank: t.netRatingRank } }
            : { k: 'teamVerdictRebuilding', a: { name: t.name, net: f.signed(t.netRating), rank: t.netRatingRank } }
      return {
        lines: [
          line,
          { k: 'teamRatings', a: {
            ortg: d(t.offRating), ortgRank: t.offRatingRank,
            drtg: d(t.defRating), drtgRank: t.defRatingRank } },
          { k: 'teamSeed', a: {
            name: t.name, wins: t.wins, losses: t.losses, seed, east } },
        ],
        chips: [
          { label: 'netRating', value: f.signed(t.netRating), tone: t.netRating >= 0 ? 'good' : 'bad' },
          { label: 'offRating', value: d(t.offRating) },
          { label: 'defRating', value: d(t.defRating) },
        ],
        followUps: ['teamBest', 'teamWeakness', 'teamRecord'],
      }
    }

    case 'teamOverview':
      return {
        lines: [
          { k: 'teamOverview', a: {
            name: t.fullName, east, division: t.division,
            wins: t.wins, losses: t.losses, seed } },
          { k: 'teamRatings', a: {
            ortg: d(t.offRating), ortgRank: t.offRatingRank,
            drtg: d(t.defRating), drtgRank: t.defRatingRank } },
          { k: 'teamBestPlayer', a: {
            scorer: leaders.pts?.name ?? '', pts: d(leaders.pts?.value ?? 0) } },
        ],
        followUps: ['teamHowGood', 'teamBest', 'teamArena'],
      }

    case 'teamRecord': {
      const status: Say = seed <= 6
        ? { k: 'teamStatusClinched', a: { name: t.name, seed, east } }
        : seed <= 10
          ? { k: 'teamStatusPlayin', a: { name: t.name, seed, east } }
          : { k: 'teamStatusOut', a: { name: t.name, seed, east } }
      return {
        lines: [
          { k: 'teamRecord', a: {
            name: t.name, wins: t.wins, losses: t.losses,
            pct: d(t.winPct * 100, 1), scored: d(t.pointsPerGame), allowed: d(t.pointsAllowed),
            diff: f.signed(t.pointDiff) } },
          status,
        ],
        chips: [
          { label: 'record', value: `${t.wins}-${t.losses}` },
          { label: 'netRating', value: f.signed(t.netRating), tone: t.netRating >= 0 ? 'good' : 'bad' },
        ],
        followUps: ['teamHowGood', 'teamOffence', 'teamDefence'],
      }
    }

    case 'teamOffence':
      return {
        lines: [
          { k: 'teamOffence', a: {
            name: t.name, ortg: d(t.offRating), rank: t.offRatingRank,
            ppg: d(t.pointsPerGame), ts: d(t.tsPct * 100, 1), threeRate: d(t.threeRate * 100, 1) } },
          leaders.pts?.name && leaders.pts.name === leaders.ast?.name
            ? { k: 'teamOffenceLeaderOne', a: {
                name: leaders.pts.name, pts: d(leaders.pts.value),
                ast: d(leaders.ast?.value ?? 0) } }
            : { k: 'teamOffenceLeader', a: {
                scorer: leaders.pts?.name ?? '', pts: d(leaders.pts?.value ?? 0),
                passer: leaders.ast?.name ?? '', ast: d(leaders.ast?.value ?? 0) } },
        ],
        chips: [
          { label: 'offRating', value: d(t.offRating) },
          { label: 'pace', value: d(t.pace) },
          { label: 'ts', value: `${d(t.tsPct * 100, 1)}%` },
        ],
        followUps: ['teamDefence', 'teamBest', 'teamPace'],
      }

    case 'teamDefence':
      return {
        lines: [
          { k: 'teamDefence', a: {
            name: t.name, drtg: d(t.defRating), rank: t.defRatingRank,
            allowed: d(t.pointsAllowed) } },
          leaders.blk?.name && leaders.blk.name === leaders.stl?.name
            ? { k: 'teamDefenceLeaderOne', a: {
                name: leaders.blk.name, blk: d(leaders.blk.value),
                stl: d(leaders.stl?.value ?? 0) } }
            : { k: 'teamDefenceLeader', a: {
                blocker: leaders.blk?.name ?? '', blk: d(leaders.blk?.value ?? 0),
                stealer: leaders.stl?.name ?? '', stl: d(leaders.stl?.value ?? 0) } },
        ],
        chips: [
          { label: 'defRating', value: d(t.defRating) },
          { label: 'pa', value: d(t.pointsAllowed) },
        ],
        followUps: ['teamOffence', 'teamHowGood', 'teamBest'],
      }

    case 'teamPace':
      return {
        lines: [{ k: 'teamPace', a: {
          name: t.name, pace: d(t.pace), rank: t.paceRank,
          threeRate: d(t.threeRate * 100, 1) } }],
        chips: [{ label: 'pace', value: d(t.pace) }],
        followUps: ['teamOffence', 'teamDefence', 'teamHowGood'],
      }

    case 'teamStrength': {
      const best = teamAreas(t).sort((a, b) => a.rank - b.rank)[0]
      const key = (
        { offence: 'teamStrengthOffence', defence: 'teamStrengthDefence',
          pace: 'teamStrengthPace', shooting: 'teamStrengthShooting' } as const)[best.key]
      return {
        lines: [
          { k: key, a: { name: t.name, rank: best.rank } },
          { k: 'teamBestPlayer', a: {
            scorer: leaders.per?.name ?? '', pts: d(leaders.per?.value ?? 0) } },
        ],
        followUps: ['teamWeakness', 'teamHowGood', 'teamBest'],
      }
    }

    case 'teamWeakness': {
      const worst = teamAreas(t).sort((a, b) => b.rank - a.rank)[0]
      const soft = Object.entries(t.defVsPosition)
        .sort((a, b) => b[1] - a[1])[0]
      const key = (
        { offence: 'teamWeaknessOffence', defence: 'teamWeaknessDefence',
          pace: 'teamWeaknessPace', shooting: 'teamWeaknessShooting' } as const)[worst.key]
      return {
        lines: [
          { k: key, a: { name: t.name, rank: worst.rank } },
          { k: 'teamSoftSpot', a: {
            name: t.name, pos: (soft?.[0] ?? '').toUpperCase(), value: f.signed(soft?.[1] ?? 0) } },
        ],
        followUps: ['teamStrength', 'teamHowGood', 'teamPayroll'],
      }
    }

    case 'teamBest': {
      const roster = engine.roster(t.abbr)
      const bestPer = roster.reduce((a, b) => (b.per > a.per ? b : a), roster[0])
      // One man leading all three categories is a sentence about him, not a
      // list of three identical names — and if he is also the PER leader, the
      // line adds nothing the sentence above it has not already said.
      const sweep = Boolean(
        leaders.pts?.name && leaders.pts.name === leaders.reb?.name &&
        leaders.pts.name === leaders.ast?.name)
      const lines: Say[] = [
        { k: 'teamBest', a: {
          name: t.name, best: bestPer?.name ?? '', per: d(bestPer?.per ?? 0),
          pts: d(bestPer?.pts ?? 0), reb: d(bestPer?.reb ?? 0), ast: d(bestPer?.ast ?? 0) } },
      ]
      if (!(sweep && leaders.pts?.name === bestPer?.name)) {
        lines.push(sweep && leaders.pts
          ? { k: 'teamLeadersSweep', a: {
              name: leaders.pts.name, pts: d(leaders.pts.value),
              reb: d(leaders.reb?.value ?? 0), ast: d(leaders.ast?.value ?? 0) } }
          : { k: 'teamLeaders', a: {
              scorer: leaders.pts?.name ?? '', pts: d(leaders.pts?.value ?? 0),
              rebounder: leaders.reb?.name ?? '', reb: d(leaders.reb?.value ?? 0),
              passer: leaders.ast?.name ?? '', ast: d(leaders.ast?.value ?? 0) } })
      }
      return {
        lines,
        followUps: ['teamHowGood', 'teamPayroll', 'teamWeakness'],
      }
    }

    case 'teamRoster': {
      const roster = engine.roster(t.abbr)
      return {
        lines: [{ k: 'teamRoster', a: {
          name: t.name, count: roster.length, age: d(t.avgAge),
          payroll: f.money(t.payroll),
          names: roster.slice(0, 5).map((p) => p.name).join(', ') } }],
        followUps: ['teamBest', 'teamPayroll', 'teamHowGood'],
      }
    }

    case 'teamPayroll': {
      const line: Say = t.payroll > LUXURY_TAX
        ? { k: 'teamPayrollTax', a: {
            name: t.name, payroll: f.money(t.payroll), tax: f.money(LUXURY_TAX),
            over: f.money(t.payroll - LUXURY_TAX) } }
        : t.payroll > CAP
          ? { k: 'teamPayrollOverCap', a: {
              name: t.name, payroll: f.money(t.payroll), cap: f.money(CAP),
              over: f.money(t.payroll - CAP) } }
          : { k: 'teamPayrollUnderCap', a: {
              name: t.name, payroll: f.money(t.payroll), cap: f.money(CAP),
              room: f.money(CAP - t.payroll) } }
      return {
        lines: [line, { k: 'teamPayrollNote', a: { name: t.name } }],
        chips: [
          { label: 'payroll', value: f.money(t.payroll) },
          { label: 'salaryCap', value: f.money(CAP) },
        ],
        followUps: ['teamBest', 'teamHowGood', 'teamRoster'],
      }
    }

    case 'teamArena':
      return {
        lines: [
          { k: 'teamArena', a: {
            name: t.name, arena: t.venue.arena, city: t.venue.city,
            capacity: f.int(t.venue.capacity), opened: t.venue.opened } },
          { k: 'teamGate', a: {
            attendance: f.int(Math.round(t.venue.averageAttendance)),
            fill: d(t.venue.fillRate * 100, 1), rank: t.attendanceRank,
            sellouts: t.venue.sellouts, games: t.venue.homeGames } },
          { k: 'teamTickets', a: {
            average: f.money(t.tickets.averagePrice, false), getIn: f.money(t.tickets.getInPrice, false),
            rank: t.ticketPriceRank } },
          { k: 'teamGateModelled', a: { name: t.name } },
        ],
        chips: [
          { label: 'attendance', value: f.int(Math.round(t.venue.averageAttendance)) },
          { label: 'averageTicket', value: f.money(t.tickets.averagePrice, false) },
        ],
        followUps: ['teamHowGood', 'teamHistory', 'teamRecord'],
      }

    case 'teamHistory': {
      const fr = t.franchise
      const line: Say = fr.titleCount
        ? { k: 'teamHistory', a: {
            name: t.name, titles: fr.titleCount, last: fr.lastTitle ?? 0,
            founded: fr.founded ?? 0 } }
        : { k: 'teamHistoryNone', a: { name: t.name, founded: fr.founded ?? 0 } }
      return {
        lines: [line, { k: 'teamArenaShort', a: { arena: t.venue.arena, opened: t.venue.opened } }],
        chips: [{ label: 'titles', value: `${fr.titleCount}` }],
        followUps: ['teamHowGood', 'teamArena', 'teamBest'],
      }
    }

    case 'teamVsTeam': {
      const opp = versusAbbr ? engine.getTeam(versusAbbr) : null
      if (!opp) return notUnderstood({ kind: 'team', abbr: t.abbr, name: t.name })
      const home = engine.predictTeam(t.abbr, opp.abbr, engine.defaultCtx())
      return {
        lines: [
          { k: 'teamVs', a: {
            name: t.name, opp: opp.fullName,
            homePts: d(home.projection.homePts.mean),
            awayPts: d(home.projection.awayPts.mean),
            prob: d(home.projection.homeWinProb * 100, 0) } },
          { k: 'teamVsRatings', a: {
            name: t.abbr, net: f.signed(t.netRating),
            opp: opp.abbr, oppNet: f.signed(opp.netRating) } },
        ],
        followUps: ['teamHowGood', 'teamDefence', 'teamBest'],
      }
    }

    default:
      return notUnderstood({ kind: 'team', abbr: t.abbr, name: t.name })
  }
}

// ------------------------------------------------------------------ fallbacks

function notUnderstood(subject: Subject): Reply {
  return {
    lines: [{
      k: subject.kind === 'player' ? 'notUnderstoodPlayer' : 'notUnderstoodTeam',
      a: { name: subject.name } }],
    followUps: suggestionsFor(subject).slice(0, 4),
  }
}

// ------------------------------------------------------------------ entrypoint

/**
 * Answer one question about one subject.
 *
 * Scope is checked before topic, deliberately: a question that names another
 * player is refused even when it would have matched a rule perfectly, because
 * the assistant's promise is that it only speaks about the page you are on.
 */
export function answer(question: string, subject: Subject): Reply {
  const { intent, foreign, versus } = classify(question, subject)

  // --- scope ---------------------------------------------------------------
  const otherPlayer = foreign.find((e) => e.kind === 'player')
  if (otherPlayer) {
    // Four wordings rather than one: "I only answer about Jokić" and "I only
    // answer about the Nuggets" need different articles, and so does the thing
    // being refused. Grammar is not something a template variable can carry.
    return {
      lines: [{
        k: subject.kind === 'player' ? 'refusePlayerFromPlayer' : 'refusePlayerFromTeam',
        a: { subject: subject.name, other: otherPlayer.name },
      }],
      link: { to: `/players/${otherPlayer.id}`, label: otherPlayer.name },
      refusal: true,
      followUps: suggestionsFor(subject).slice(0, 3),
    }
  }

  const otherTeam = foreign.find((e) => e.kind === 'team')
  if (otherTeam && !versus) {
    return {
      lines: [{
        k: subject.kind === 'player' ? 'refuseTeamFromPlayer' : 'refuseTeamFromTeam',
        a: { subject: subject.name, other: otherTeam.name },
      }],
      link: { to: `/teams/${otherTeam.abbr}`, label: otherTeam.name },
      refusal: true,
      followUps: suggestionsFor(subject).slice(0, 3),
    }
  }

  // --- small talk ----------------------------------------------------------
  if (intent === 'greeting') return greet(subject)
  if (intent === 'thanks') {
    return { lines: [{ k: 'thanks', a: { name: subject.name } }],
             followUps: suggestionsFor(subject).slice(0, 3) }
  }
  if (intent === 'help' || (!intent && !otherTeam)) {
    if (intent === 'help') {
      return { lines: [{
        k: subject.kind === 'player' ? 'helpPlayer' : 'helpTeam',
        a: { name: subject.name } }],
               followUps: suggestionsFor(subject).slice(0, 4) }
    }
  }

  // --- the answer ----------------------------------------------------------
  if (subject.kind === 'player') {
    const p = engine.getPlayer(subject.id)
    if (!p) return notUnderstood(subject)
    // A named opponent plus a "vs" marker is a matchup question, which is in
    // scope: it is still a question about this player.
    const effective: IntentKey = otherTeam && versus ? 'playerVsTeam' : (intent ?? 'playerHowGood')
    if (!intent && !otherTeam) return notUnderstood(subject)
    return playerReply(p, effective, otherTeam?.abbr ?? null)
  }

  const t = engine.getTeam(subject.abbr)
  if (!t) return notUnderstood(subject)
  const effective: IntentKey = otherTeam && versus ? 'teamVsTeam' : (intent ?? 'teamHowGood')
  if (!intent && !otherTeam) return notUnderstood(subject)
  return teamReply(t, effective, otherTeam?.abbr ?? null)
}

/** The canned question behind each suggestion chip, so clicking one behaves
 *  exactly as if it had been typed. */
export const SUGGESTION_INTENT: Record<SuggestionKey, IntentKey> = {
  howGood: 'playerHowGood', scoring: 'playerScoring', defence: 'playerDefence',
  shooting: 'playerShooting', weakness: 'playerWeakness', contract: 'playerContract',
  strength: 'playerStrength', form: 'playerForm', comparison: 'playerComparison',
  honours: 'playerHonours', homeAway: 'playerHomeAway', advanced: 'playerAdvanced',
  rank: 'playerRank', career: 'playerCareer',
  teamHowGood: 'teamHowGood', teamOffence: 'teamOffence', teamDefence: 'teamDefence',
  teamBest: 'teamBest', teamStrength: 'teamStrength', teamWeakness: 'teamWeakness',
  teamRoster: 'teamRoster', teamPayroll: 'teamPayroll', teamArena: 'teamArena',
  teamHistory: 'teamHistory', teamPace: 'teamPace', teamRecord: 'teamRecord',
}

/** Answer a suggestion chip directly — no parsing, the intent is already known. */
export function answerIntent(intent: IntentKey, subject: Subject): Reply {
  if (subject.kind === 'player') {
    const p = engine.getPlayer(subject.id)
    return p ? playerReply(p, intent, null) : notUnderstood(subject)
  }
  const t = engine.getTeam(subject.abbr)
  return t ? teamReply(t, intent, null) : notUnderstood(subject)
}
