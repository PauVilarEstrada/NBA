/**
 * Turning what somebody typed into something matchable.
 *
 * Everything downstream compares against a normalised form: lower case, no
 * diacritics, no punctuation, single spaces. That is what lets "¿Cómo defiende?"
 * and "como defiende" hit the same rule, and why the Spanish keyword lists can
 * be written without accents.
 */

/** Lower case, strip diacritics, drop punctuation, collapse whitespace. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    // combining marks: á → a, ñ → n. `ñ` and `n` collapsing is deliberate —
    // people type "anos" for "años" constantly.
    .replace(/[̀-ͯ]/g, '')
    .replace(/[¿?¡!.,;:()"'`´]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Normalised word list, with one-letter noise dropped. */
export function tokens(input: string): string[] {
  return normalize(input).split(' ').filter((w) => w.length > 1)
}

/**
 * Does the text contain this phrase as whole words?
 *
 * Substring matching would fire "per" inside "perdidas" and "ast" inside
 * "bastante", which is exactly the class of bug that makes a rule-based
 * matcher feel broken. Word boundaries are cheap insurance.
 */
export function hasPhrase(normalised: string, phrase: string): boolean {
  const padded = ` ${normalised} `
  return padded.includes(` ${phrase} `)
}

/** How many of these phrases appear. Used as the intent score. */
export function countPhrases(normalised: string, phrases: readonly string[]): number {
  let n = 0
  for (const p of phrases) if (hasPhrase(normalised, p)) n++
  return n
}

/** Levenshtein distance, capped — used only for short entity tokens, so the
 *  quadratic cost is bounded and a typo like "jokick" still finds Jokic. */
export function editDistance(a: string, b: string, cap = 2): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + cost)
      row.push(v)
      if (v < best) best = v
    }
    if (best > cap) return cap + 1
    prev = row
  }
  return prev[b.length]
}
