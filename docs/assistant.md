# The in-page assistant

A floating button on player and team pages opens a panel that answers questions
about **that** player or **that** team, in English or Castellano. Ask it about
anybody else and it says so and hands you a link to the right page.

It is not a chatbot in the usual sense. There is no language model, no API key,
and no network call: it runs entirely in the browser, from the same season data
the page is already rendering.

## Why rules rather than a model

Three reasons, in order of how much they mattered:

1. **It cannot contradict the page.** Every answer reads the same `Player` and
   `Team` objects the charts above it read. If the profile says 28.4 points, so
   does the answer, because both are `player.pts`. A model summarising the same
   page can drift; this cannot.
2. **It is local, and stays local.** Nothing leaves the machine. The site works
   offline and so does the assistant.
3. **It is instant and deterministic.** The same question gives the same answer,
   which is what makes it useful to demo.

The cost is honest: it understands the questions it was taught, and says so
plainly when it does not. That is a better failure than a confident invention.

## Shape

```
src/lib/assistant/
  normalize.ts   text → matchable form (lower case, no accents, no punctuation)
  match.ts       entity index + intent rules + the classifier
  answer.ts      intent → Reply, built from engine/season data
  types.ts       Subject, Reply, Say, Chip
src/components/assistant/AskPanel.tsx    the floating panel
```

## Scope is checked before topic

This is the ordering that makes the promise hold:

```ts
const { intent, foreign, versus } = classify(question, subject)
if (foreign.some(e => e.kind === 'player')) return refusal   // before anything else
```

"How many points does LeBron score?" on Jokić's page matches the scoring rule
perfectly — and is still refused, because the assistant's promise is about
*whose* page you are on, not about which rule fired. The refusal carries a link
straight to that player's profile.

The one exception is a **matchup**: a question that names another team *and*
carries a versus marker (`against`, `vs`, `contra`, `frente a`) is still a
question about the subject, so "how does he do against the Lakers?" is answered
from the head-to-head history, and "how would they do against the Nuggets?" from
the game-forecast model.

### Entity detection

An index is built once over the 124 players and 30 teams the seed carries —
full names, surnames, team abbreviations, cities and nicknames. Matching is
phrase-first, then whole-token, then a one-edit fuzzy pass on tokens of six
characters or more (so `jokick` finds Jokić, but `ast` never gets fuzzed into a
surname).

`STOP_NAMES` holds the surnames that are also ordinary words — *young, white,
green, love, king, heat, magic*. Without it, half the Spanish questions would be
"out of scope".

## Intent matching

One rule table, both languages at once. No language detection, deliberately: a
bilingual reader switches mid-conversation and types "cuantos points" without
thinking about it, which any detector would get wrong and this does not. The two
vocabularies barely collide.

Each rule is a set of normalised phrases and a weight; the best-scoring rule in
scope wins. Phrases are matched on **word boundaries**, so `per` does not fire
inside `perdidas` and `ast` does not fire inside `bastante` — the class of bug
that makes a rule matcher feel broken.

Roughly 35 intents: production, efficiency, role, advanced metrics, strengths,
concerns, contract, comparison, form, splits, honours, bio, career and league
rank for players; ratings, record, offence, defence, pace, best player, roster,
payroll, arena and gate, history and matchups for teams.

## Bilingual by construction

`answer.ts` never returns a sentence. It returns `Say` values — a dictionary key
plus exactly the arguments that key declares:

```ts
{ k: 'verdictElite', a: { name: 'Nikola Jokic', perPct: 100, vorpPct: 67 } }
```

The `Say` type is *derived* from the dictionary:

```ts
export type Say = {
  [K in keyof SayDict]: SayDict[K] extends (a: infer A) => string
    ? { k: K; a: A } : never
}[keyof SayDict]
```

so building one with the wrong fields is a compile error, and `es.ts` must
provide every key `en.ts` does. Assistant turns are stored as `Reply` objects,
not as text, which means **flipping the language re-renders the whole
conversation** — including answers given before the switch.

Where the two languages want genuinely different wording, the builder picks a
different *key* rather than passing a word:

- `verdictElite` / `verdictStrong` / `verdictSolid` / `verdictRole`
- `contractBargain` / `contractOverpaid` / `contractFair`
- `teamStrengthOffence` / `…Defence` / `…Pace` / `…Shooting`
- `refusePlayerFromPlayer` / `refuseTeamFromPlayer` / `refusePlayerFromTeam` /
  `refuseTeamFromTeam` — four wordings, because "I only answer about Jokić" and
  "I only answer about **the** Nuggets" need different articles on both sides of
  the sentence, and an article is not something a template variable can carry.

The conference travels as `east: boolean`, not as the string `'East'`, so
Spanish can write *del Este* instead of *de East*. Numbers are formatted through
the locale-aware `fmt()` before they enter an argument, so a Spanish answer says
`28,4 puntos` and `55,2 M$`.

Two blocks of already-translated copy are reused rather than restated: the
scouting report's threshold sentences (`Reply.notes`) and the archetype labels
(`Reply.archetype`).

## The panel

- Floating button, tinted with the team's primary colour, on `/players/:id` and
  `/teams/:abbr` only.
- Suggestion chips before the first question and after every answer, so it is
  usable without typing and without guessing what it understands.
- A ~320 ms pause before replying. The rules answer in well under a
  millisecond, and a reply that lands in the same frame as the question reads as
  a glitch rather than as an answer.
- Numeric chips under the text carry a percentile bar, so a number is never
  shown without a reference — the same rule the rest of the site follows.
- A new page starts a new conversation; `Esc` closes; the input takes focus on
  open; the message list is an `aria-live` region.

## Adding an intent

1. Add the trigger phrases to `RULES` in `match.ts`, in both languages, with a
   `scope` of `player` or `team`.
2. Add the case to `playerReply` or `teamReply` in `answer.ts`, returning `Say`
   keys.
3. Add those keys to `assistant.say` in `en.ts` **and** `es.ts`. The build fails
   until both exist.
4. If it deserves a chip, add it to `SuggestionKey`, to the suggestion list, and
   to `SUGGESTION_INTENT`.
