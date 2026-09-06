/**
 * Working out what was asked, and about whom.
 *
 * Two passes, in this order:
 *
 *  1. **Who is this about?** If the question names a different player, or a
 *     different team in a way that is not a matchup question, the assistant
 *     refuses and points at that page. This runs first because scope beats
 *     topic: "how many points does LeBron score" is out of scope on Jokić's
 *     page even though the scoring rule matches perfectly.
 *  2. **What was asked?** A keyword-scored intent, in either language at once —
 *     no language detection, because people mix ("cuantos points" happens) and
 *     the two vocabularies barely collide.
 *
 * There is no model here and no network call. It is a few hundred phrases and
 * an index over the 124 players and 30 teams the site already carries, which is
 * why it answers instantly and works with the machine offline.
 */
import * as engine from '@/lib/engine'
import { countPhrases, editDistance, hasPhrase, normalize, tokens } from './normalize'
import type { Subject } from './types'

// --------------------------------------------------------------- entity index

interface EntityHit {
  kind: 'player' | 'team'
  id: number
  abbr: string
  name: string
}

/** Words that are somebody's surname but also ordinary language. Matching them
 *  as entities would make half the Spanish questions "out of scope". */
const STOP_NAMES = new Set([
  'young', 'white', 'green', 'brown', 'love', 'king', 'wood', 'bell', 'rose',
  'banchero', 'jazz', 'heat', 'sun', 'suns', 'net', 'nets', 'bucks', 'magic',
  'kings', 'bulls', 'hawks',
])

/** Built once. Maps a normalised token → the entity it identifies. */
function buildIndex() {
  const byToken = new Map<string, EntityHit>()
  const add = (key: string, hit: EntityHit) => {
    const k = normalize(key)
    if (!k || k.length < 3 || STOP_NAMES.has(k)) return
    // First writer wins, so a surname shared by two players resolves to whoever
    // the seed lists first rather than flapping.
    if (!byToken.has(k)) byToken.set(k, hit)
  }

  for (const p of engine.PLAYERS) {
    const hit: EntityHit = { kind: 'player', id: p.playerId, abbr: p.team, name: p.name }
    add(p.name, hit)
    add(p.lastName, hit)
    add(`${p.firstName} ${p.lastName}`, hit)
  }
  for (const t of engine.TEAMS) {
    const hit: EntityHit = { kind: 'team', id: t.teamId, abbr: t.abbr, name: t.fullName }
    add(t.abbr, hit)
    add(t.fullName, hit)
    add(t.name, hit)
    add(t.city, hit)
  }
  return byToken
}

let INDEX: Map<string, EntityHit> | null = null
const index = () => (INDEX ??= buildIndex())

/**
 * Every entity named in the question.
 *
 * Multi-word names are checked as phrases first ("golden state warriors"), then
 * single tokens, then a one-edit fuzzy pass over tokens long enough for a typo
 * to be unambiguous. Short tokens are never fuzzed — "ast" is one edit from
 * "asc" and from a dozen surnames.
 */
export function findEntities(question: string): EntityHit[] {
  const norm = normalize(question)
  const found = new Map<string, EntityHit>()
  const keyOf = (h: EntityHit) => `${h.kind}:${h.kind === 'player' ? h.id : h.abbr}`

  for (const [key, hit] of index()) {
    if (key.includes(' ') && hasPhrase(norm, key)) found.set(keyOf(hit), hit)
  }
  for (const w of tokens(norm)) {
    const exact = index().get(w)
    if (exact) { found.set(keyOf(exact), exact); continue }
    if (w.length < 6) continue
    for (const [key, hit] of index()) {
      if (key.includes(' ') || Math.abs(key.length - w.length) > 1) continue
      if (editDistance(w, key, 1) <= 1) { found.set(keyOf(hit), hit); break }
    }
  }
  return [...found.values()]
}

// ------------------------------------------------------------------- intents

export type IntentKey =
  // shared
  | 'greeting' | 'thanks' | 'help'
  // player
  | 'playerOverview' | 'playerHowGood' | 'playerScoring' | 'playerRebounding'
  | 'playerPlaymaking' | 'playerDefence' | 'playerShooting' | 'playerTurnovers'
  | 'playerRole' | 'playerAdvanced' | 'playerStrength' | 'playerWeakness'
  | 'playerContract' | 'playerComparison' | 'playerForm' | 'playerHomeAway'
  | 'playerHonours' | 'playerBio' | 'playerCareer' | 'playerRank' | 'playerVsTeam'
  // team
  | 'teamOverview' | 'teamHowGood' | 'teamRecord' | 'teamOffence' | 'teamDefence'
  | 'teamPace' | 'teamStrength' | 'teamWeakness' | 'teamBest' | 'teamRoster'
  | 'teamPayroll' | 'teamArena' | 'teamHistory' | 'teamVsTeam'

interface Rule {
  intent: IntentKey
  /** Any of these fires the rule. Written normalised — no accents, lower case. */
  any: readonly string[]
  /** Weight, for when two rules match. Specific beats general. */
  weight?: number
  scope?: 'player' | 'team'
}

/** "against / versus" markers. Their presence turns a mention of another team
 *  from an out-of-scope question into a matchup question about the subject. */
const VERSUS = [
  'vs', 'versus', 'against', 'contra', 'frente', 'ante', 'enfrenta', 'enfrentan',
  'enfrentarse', 'cara', 'duelo', 'matchup', 'juega contra', 'facing',
] as const

export const isVersusQuestion = (question: string): boolean =>
  countPhrases(normalize(question), VERSUS) > 0

/**
 * The rule table.
 *
 * Both languages live in one list on purpose: a bilingual reader switches
 * mid-conversation, and a question like "cuantos points" would fail a language
 * detector and match here without complaint.
 */
const RULES: Rule[] = [
  { intent: 'greeting', any: ['hola', 'buenas', 'hey', 'hello', 'hi', 'que tal', 'buenos dias'], weight: 0.5 },
  { intent: 'thanks', any: ['gracias', 'thanks', 'thank you', 'genial', 'perfecto'], weight: 0.5 },
  { intent: 'help', any: ['ayuda', 'help', 'que puedes hacer', 'what can you do', 'que sabes', 'opciones'], weight: 2 },

  // ------------------------------------------------------------------ player
  { scope: 'player', intent: 'playerHowGood', weight: 2.2, any: [
    'es bueno', 'es malo', 'que te parece', 'que opinas', 'opinion', 'vale la pena',
    'como es', 'que tal es', 'is he good', 'is he any good', 'how good', 'what do you think',
    'thoughts', 'valoracion', 'valoralo', 'evaluate', 'assessment', 'es top', 'es una estrella',
    'is he a star', 'elite', 'de elite', 'es elite'] },
  { scope: 'player', intent: 'playerOverview', weight: 1.4, any: [
    'quien es', 'who is', 'resumen', 'overview', 'hablame', 'tell me about', 'cuentame',
    'describelo', 'perfil', 'profile', 'como juega', 'how does he play', 'que tipo de jugador',
    'what kind of player', 'arquetipo', 'archetype'] },
  { scope: 'player', intent: 'playerScoring', weight: 2, any: [
    'puntos', 'punto', 'anota', 'anotador', 'anotacion', 'points', 'point', 'score', 'scoring',
    'scorer', 'ppg', 'ppp', 'canastas', 'buckets', 'cuanto mete', 'cuanto anota'] },
  { scope: 'player', intent: 'playerRebounding', weight: 2, any: [
    'rebote', 'rebotes', 'rebotea', 'reboteador', 'rebound', 'rebounds', 'rebounding',
    'rpg', 'rpp', 'glass', 'tablero'] },
  { scope: 'player', intent: 'playerPlaymaking', weight: 2, any: [
    'asistencia', 'asistencias', 'asiste', 'pasa', 'pase', 'pases', 'creacion', 'creador',
    'assist', 'assists', 'passing', 'playmaking', 'playmaker', 'apg', 'app', 'reparte'] },
  { scope: 'player', intent: 'playerDefence', weight: 2, any: [
    'defensa', 'defiende', 'defensivo', 'defensivamente', 'defensor', 'robos', 'robo',
    'tapones', 'tapon', 'defence', 'defense', 'defend', 'defends', 'defending',
    'defensive', 'defender', 'steals', 'blocks', 'stocks', 'como defiende'] },
  { scope: 'player', intent: 'playerShooting', weight: 2, any: [
    'tiro', 'tira', 'tirador', 'triples', 'triple', 'porcentaje', 'porcentajes', 'acierto',
    'shooting', 'shoot', 'shooter', 'shot', 'threes', 'three point', 'from three',
    'fg', 'ts', 'true shooting', 'efg', 'eficiencia', 'efficiency', 'tiro real'] },
  { scope: 'player', intent: 'playerTurnovers', weight: 2.4, any: [
    'perdidas', 'perdida', 'pierde balones', 'pierde el balon', 'turnover', 'turnovers',
    'balones perdidos', 'cuida el balon', 'ball security'] },
  { scope: 'player', intent: 'playerRole', weight: 2, any: [
    'minutos', 'minuto', 'rol', 'papel', 'uso', 'usage', 'minutes', 'role', 'workload',
    'carga', 'protagonismo', 'titular', 'starter'] },
  { scope: 'player', intent: 'playerAdvanced', weight: 2.4, any: [
    'per', 'bpm', 'vorp', 'win shares', 'ws', 'avanzadas', 'advanced', 'metricas',
    'metrics', 'impacto', 'impact', 'game score'] },
  { scope: 'player', intent: 'playerStrength', weight: 2.4, any: [
    'fuerte', 'fortaleza', 'fortalezas', 'mejor virtud', 'virtudes', 'que hace bien',
    'strength', 'strengths', 'best skill', 'what is he good at', 'good at', 'destaca'] },
  { scope: 'player', intent: 'playerWeakness', weight: 2.6, any: [
    'debil', 'debilidad', 'debilidades', 'punto debil', 'defecto', 'defectos', 'falla',
    'flojea', 'peor', 'weakness', 'weaknesses', 'flaw', 'flaws', 'concern', 'concerns',
    'problema', 'problemas', 'mejorar', 'improve', 'que hace mal'] },
  { scope: 'player', intent: 'playerContract', weight: 2.4, any: [
    'contrato', 'sueldo', 'salario', 'cobra', 'gana', 'dinero', 'precio', 'valor',
    'sobrepagado', 'infrapagado', 'chollo', 'caro', 'barato', 'vale lo que cuesta',
    'contract', 'salary', 'paid', 'overpaid', 'underpaid', 'worth', 'value', 'money',
    'cap hit', 'bargain'] },
  { scope: 'player', intent: 'playerComparison', weight: 2.6, any: [
    'se parece', 'parecido', 'parecidos', 'similar', 'similares', 'comparable',
    'a quien se parece', 'compares', 'comparison', 'like who', 'similar players',
    'estilo de', 'recuerda a'] },
  { scope: 'player', intent: 'playerForm', weight: 2.4, any: [
    'forma', 'racha', 'ultimos partidos', 'ultimamente', 'momento', 'esta caliente',
    'form', 'recent', 'lately', 'last games', 'streak', 'hot', 'cold', 'como va',
    'como esta jugando', 'tendencia', 'trend'] },
  { scope: 'player', intent: 'playerHomeAway', weight: 2.6, any: [
    'casa', 'local', 'fuera', 'visitante', 'home', 'away', 'road', 'split', 'splits',
    'descanso', 'rest', 'back to back'] },
  { scope: 'player', intent: 'playerHonours', weight: 2.4, any: [
    'titulos', 'titulo', 'anillos', 'anillo', 'premios', 'premio', 'mvp', 'campeon',
    'palmares', 'trofeos', 'ganado', 'gano', 'rings', 'ring', 'titles', 'title', 'awards',
    'championship', 'championships', 'accolades', 'all star', 'won', 'ha ganado',
    'has he won', 'have they won', 'trophies'] },
  { scope: 'player', intent: 'playerBio', weight: 2.2, any: [
    'edad', 'anos', 'altura', 'mide', 'peso', 'pesa', 'pais', 'nacionalidad', 'draft',
    'age', 'old', 'height', 'tall', 'weight', 'weighs', 'country', 'from', 'drafted',
    'nacido', 'born', 'ficha tecnica'] },
  { scope: 'player', intent: 'playerCareer', weight: 2.4, any: [
    'carrera', 'trayectoria', 'equipos', 'donde ha jugado', 'ha jugado en', 'historial',
    'career', 'played for', 'teams he', 'where has he played', 'experiencia', 'veterano'] },
  { scope: 'player', intent: 'playerRank', weight: 2.6, any: [
    'ranking', 'puesto', 'percentil', 'percentiles', 'lugar', 'posicion en la liga',
    'rank', 'ranks', 'ranking in', 'percentile', 'compared to the league', 'liga'] },

  // -------------------------------------------------------------------- team
  { scope: 'team', intent: 'teamHowGood', weight: 2.2, any: [
    'es bueno', 'son buenos', 'que te parece', 'que opinas', 'opinion', 'candidato',
    'candidatos', 'aspiran', 'contender', 'contenders', 'is this team good', 'how good',
    'what do you think', 'thoughts', 'title', 'anillo', 'ganar el anillo', 'valoracion'] },
  { scope: 'team', intent: 'teamOverview', weight: 1.4, any: [
    'quienes son', 'who are', 'resumen', 'overview', 'hablame', 'tell me about',
    'cuentame', 'como juegan', 'how do they play', 'perfil', 'profile', 'identidad'] },
  { scope: 'team', intent: 'teamRecord', weight: 2.4, any: [
    'balance', 'record', 'victorias', 'derrotas', 'wins', 'losses', 'clasificacion',
    'standings', 'puesto', 'seed', 'playoffs', 'play in', 'van', 'como van', 'temporada',
    'season', 'conferencia', 'conference'] },
  { scope: 'team', intent: 'teamOffence', weight: 2.4, any: [
    'ataque', 'atacan', 'ofensivo', 'ofensiva', 'anotan', 'anota', 'anotacion', 'puntos',
    'offence', 'offense', 'offensive', 'attack', 'scoring', 'score', 'points', 'ppg',
    'points per game', 'ortg', 'rating ofensivo'] },
  { scope: 'team', intent: 'teamDefence', weight: 2.4, any: [
    'defensa', 'defienden', 'defiende', 'defensivo', 'defensiva', 'defence', 'defense',
    'defensive', 'defend', 'defends', 'defending', 'drtg', 'rating defensivo', 'reciben',
    'conceden', 'concede', 'allow', 'allowed', 'stops'] },
  { scope: 'team', intent: 'teamPace', weight: 2.6, any: [
    'ritmo', 'pace', 'rapido', 'lento', 'fast', 'slow', 'posesiones', 'possessions',
    'corren', 'run'] },
  { scope: 'team', intent: 'teamStrength', weight: 2.4, any: [
    'fuerte', 'fortaleza', 'fortalezas', 'que hacen bien', 'virtud', 'virtudes',
    'strength', 'strengths', 'good at', 'best thing'] },
  { scope: 'team', intent: 'teamWeakness', weight: 2.6, any: [
    'debil', 'debilidad', 'debilidades', 'punto debil', 'problema', 'problemas',
    'falla', 'flojean', 'weakness', 'weaknesses', 'flaw', 'concern', 'issue',
    'que hacen mal', 'mejorar'] },
  { scope: 'team', intent: 'teamBest', weight: 3, any: [
    'mejor jugador', 'estrella', 'franquicia', 'lider', 'lideres', 'maximo anotador',
    'quien anota', 'quien rebotea', 'quien asiste', 'quien es el mejor', 'best player',
    'star', 'leader', 'leaders', 'top scorer', 'who scores', 'who rebounds', 'who leads',
    'mvp del equipo', 'best on'] },
  { scope: 'team', intent: 'teamRoster', weight: 2.4, any: [
    'plantilla', 'roster', 'jugadores', 'players', 'squad', 'quien juega', 'quienes juegan',
    'edad media', 'average age', 'profundidad', 'depth'] },
  { scope: 'team', intent: 'teamPayroll', weight: 2.4, any: [
    'nomina', 'payroll', 'salarios', 'salary', 'salaries', 'presupuesto', 'gastan',
    'gasta', 'gasto', 'tope salarial', 'cap', 'impuesto', 'tax', 'contratos', 'contracts',
    'dinero', 'money', 'spend', 'spending', 'cost', 'pagan', 'cuanto pagan', 'wages',
    'expensive', 'caro'] },
  { scope: 'team', intent: 'teamArena', weight: 2.6, any: [
    'pabellon', 'estadio', 'cancha', 'pista', 'publico', 'aforo', 'asistencia',
    'entradas', 'entrada', 'precio', 'precios', 'arena', 'stadium', 'attendance',
    'crowd', 'tickets', 'ticket', 'capacity', 'sellout', 'llenos'] },
  { scope: 'team', intent: 'teamHistory', weight: 2.4, any: [
    'historia', 'titulos', 'titulo', 'anillos', 'anillo', 'campeon', 'campeones',
    'campeonatos', 'palmares', 'fundado', 'fundacion', 'ganado', 'han ganado', 'ganaron',
    'history', 'titles', 'title', 'rings', 'ring', 'championships', 'championship',
    'champion', 'champions', 'won', 'have they won', 'founded', 'trophies', 'banderines',
    'banners'] },
]

export interface MatchResult {
  intent: IntentKey | null
  /** Entities named that are NOT the subject. */
  foreign: EntityHit[]
  versus: boolean
}

/** Score every rule in scope and take the best. Ties go to the heavier rule. */
export function classify(question: string, subject: Subject): MatchResult {
  const norm = normalize(question)
  const scope = subject.kind

  let best: { intent: IntentKey; score: number } | null = null
  for (const rule of RULES) {
    if (rule.scope && rule.scope !== scope) continue
    const hits = countPhrases(norm, rule.any)
    if (!hits) continue
    const score = hits * (rule.weight ?? 1)
    if (!best || score > best.score) best = { intent: rule.intent, score }
  }

  const subjectAbbr = subject.kind === 'player' ? subject.teamAbbr : subject.abbr
  const foreign = findEntities(question).filter((e) =>
    subject.kind === 'player'
      ? !(e.kind === 'player' && e.id === subject.id) &&
        !(e.kind === 'team' && e.abbr === subjectAbbr)
      : !(e.kind === 'team' && e.abbr === subject.abbr))

  return { intent: best?.intent ?? null, foreign, versus: isVersusQuestion(question) }
}
