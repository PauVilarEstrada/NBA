/**
 * The assistant's vocabulary, as types.
 *
 * The rule engine never produces a sentence. It produces a `Say` — a key plus
 * the values that key needs — and the panel writes the sentence in whichever
 * language is active. Same reason the play-by-play works that way: an answer
 * given in English must become Spanish when the reader flips the switch, not
 * sit there frozen in the language it was generated in.
 */
import type { Dict } from '@/i18n'
import type { ArchetypeKey, ReportNote } from '@/lib/season'

/** What the open page is about. The assistant will not talk about anything else. */
export type Subject =
  | { kind: 'player'; id: number; name: string; teamAbbr: string }
  | { kind: 'team'; abbr: string; name: string }

/** The `assistant.say` block of the dictionary: every leaf takes one object. */
type SayDict = Dict['assistant']['say']

/**
 * One rendered sentence: a dictionary key paired with exactly the arguments
 * that key declares. Building `{ k: 'playerScoring', a: { … } }` with the wrong
 * fields is a compile error, which is the whole point of deriving this from the
 * dictionary rather than writing a parallel list by hand.
 */
export type Say = {
  [K in keyof SayDict]: SayDict[K] extends (a: infer A) => string
    ? { k: K; a: A }
    : never
}[keyof SayDict]

/** A numeric callout rendered under the text — label, value, optional percentile. */
export interface Chip {
  label: string
  value: string
  /** 0-100. Drives the little bar; omitted where a percentile is meaningless. */
  percentile?: number
  tone?: 'good' | 'bad' | 'neutral'
}

/** Where to send somebody whose question is about a different page. */
export interface ReplyLink {
  to: string
  label: string
}

export interface Reply {
  /** The message body, in order. */
  lines: Say[]
  /**
   * Bulleted observations, reusing the scouting report's already-translated
   * threshold sentences rather than restating them in a second vocabulary.
   */
  notes?: ReportNote[]
  /**
   * Rendered as a badge above the text, reusing the archetype labels the
   * scouting panel already carries in both languages.
   */
  archetype?: ArchetypeKey
  chips?: Chip[]
  link?: ReplyLink
  /** Clickable follow-ups, as intent keys — labelled from the dictionary. */
  followUps?: SuggestionKey[]
  /** Marks the "I only talk about X" replies, which get a distinct style. */
  refusal?: boolean
}

/** Suggestion chips offered above the input and after an answer. */
export type SuggestionKey =
  // player
  | 'howGood' | 'scoring' | 'defence' | 'shooting' | 'strength' | 'weakness'
  | 'contract' | 'form' | 'comparison' | 'honours' | 'homeAway' | 'advanced'
  | 'rank' | 'career'
  // team
  | 'teamHowGood' | 'teamOffence' | 'teamDefence' | 'teamBest' | 'teamStrength'
  | 'teamWeakness' | 'teamPayroll' | 'teamArena' | 'teamHistory' | 'teamPace'
  | 'teamRecord' | 'teamRoster'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  /** Present on user turns — shown verbatim, never re-translated. */
  text?: string
  /** Present on assistant turns — rendered in the active language. */
  reply?: Reply
}
