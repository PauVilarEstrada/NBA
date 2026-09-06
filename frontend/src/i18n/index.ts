/**
 * The locale layer.
 *
 * One store holds the active language; `useI18n()` hands a component the right
 * dictionary and the `Intl` formatters that go with it. Formatting is part of
 * translating — a Spanish page that still prints `20,052` and `$1.2M` in the
 * American shape is only half translated — so the number and date helpers live
 * here rather than in `lib/format.ts`, and read the same locale as the copy.
 */
import { create } from 'zustand'
import { en } from './en'
import { es } from './es'
import { INTL_TAG, LOCALES, type Locale } from './types'

export { LOCALES, INTL_TAG }
export type { Locale }
export type Dict = typeof en

const DICTS: Record<Locale, Dict> = { en, es: es as Dict }

const KEY = 'nba-vision-locale'

function initial(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = window.localStorage.getItem(KEY)
    if (saved === 'en' || saved === 'es') return saved
  } catch { /* private mode, blocked storage — fall through */ }
  // First visit: follow the browser, then remember whatever they choose.
  const nav = typeof navigator !== 'undefined' ? navigator.language : 'en'
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en'
}

function apply(locale: Locale) {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale)
  }
  try { window.localStorage.setItem(KEY, locale) } catch { /* ignore */ }
}

interface LocaleState {
  locale: Locale
  setLocale: (l: Locale) => void
  toggle: () => void
}

export const useLocale = create<LocaleState>((set, get) => ({
  locale: initial(),
  setLocale: (locale) => { apply(locale); set({ locale }) },
  toggle: () => get().setLocale(get().locale === 'en' ? 'es' : 'en'),
}))

if (typeof window !== 'undefined') apply(useLocale.getState().locale)

/** Read the active dictionary outside React — engines, workers, sort helpers. */
export const dict = (): Dict => DICTS[useLocale.getState().locale]
export const tag = (): string => INTL_TAG[useLocale.getState().locale]

// --------------------------------------------------------------- formatters

/** Locale-aware number helpers. Built per locale and memoised, because
 *  constructing `Intl.NumberFormat` on every table cell is measurable. */
const cache = new Map<string, Intl.NumberFormat>()
function nf(locale: Locale, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = locale + JSON.stringify(opts)
  let f = cache.get(key)
  if (!f) { f = new Intl.NumberFormat(INTL_TAG[locale], opts); cache.set(key, f) }
  return f
}

export interface Formatters {
  /** Currency. Compact by default ("$1.2M" / "1,2 M$"). */
  money: (v: number, compact?: boolean) => string
  /** Fixed-decimal number with the locale's decimal separator.
   *  `group` defaults to off, so a stat line reads 1234.5 rather than 1,234.5;
   *  pass `true` where the figure is large enough to need separators. */
  dec: (v: number, digits?: number, group?: boolean) => string
  /** Same, with an explicit sign on positives — for deltas. */
  signed: (v: number, digits?: number) => string
  /** A ratio rendered as a percentage. */
  pct: (v: number, digits?: number) => string
  /** Grouped integer ("20,052" / "20.052"). */
  int: (v: number) => string
  /** Short date, as used in game logs. */
  shortDate: (iso: string) => string
  /** "Jan 26" / "ene 26" from a `YYYY-MM` key — month axes, not dates. */
  monthLabel: (yearMonth: string) => string
  /** Ordinal suffix for a rank — English has four, Spanish has one ("º"). */
  ordinal: (n: number) => string
  locale: Locale
  intlTag: string
}

export function formattersFor(locale: Locale): Formatters {
  return {
    money: (v, compact = true) =>
      nf(locale, {
        style: 'currency', currency: 'USD',
        // narrowSymbol keeps it "$" everywhere; the default Spanish rendering
        // is "US$", which turns a compact figure into "55,2 MUS$".
        currencyDisplay: 'narrowSymbol',
        notation: compact ? 'compact' : 'standard',
        maximumFractionDigits: compact ? 1 : 0,
      }).format(v),
    dec: (v, digits = 1, group = false) =>
      nf(locale, {
        minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: group,
      }).format(v),
    signed: (v, digits = 1) =>
      (v > 0 ? '+' : '') +
      nf(locale, {
        minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
      }).format(v),
    pct: (v, digits = 0) =>
      nf(locale, {
        minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
      }).format(v * 100) + '%',
    int: (v) => nf(locale, { maximumFractionDigits: 0 }).format(v),
    shortDate: (iso) =>
      new Date(iso).toLocaleDateString(INTL_TAG[locale], { month: 'short', day: 'numeric' }),
    monthLabel: (yearMonth) =>
      new Date(`${yearMonth}-01T00:00:00Z`).toLocaleDateString(INTL_TAG[locale], {
        month: 'short', year: '2-digit', timeZone: 'UTC',
      }),
    // Spanish uses the masculine ordinal for every number ("3.º"); English
    // needs the st/nd/rd/th table, with the 11-13 exception.
    ordinal: (n) => {
      if (locale === 'es') return 'º'
      const r10 = n % 10
      const r100 = n % 100
      if (r10 === 1 && r100 !== 11) return 'st'
      if (r10 === 2 && r100 !== 12) return 'nd'
      if (r10 === 3 && r100 !== 13) return 'rd'
      return 'th'
    },
    locale,
    intlTag: INTL_TAG[locale],
  }
}

const FORMATTERS: Record<Locale, Formatters> = {
  en: formattersFor('en'),
  es: formattersFor('es'),
}

/** Formatters outside React, for the same reason as `dict()`. */
export const fmt = (): Formatters => FORMATTERS[useLocale.getState().locale]

/**
 * The hook every component uses.
 *
 * `t` is the dictionary itself, not a lookup function: `t.player.tabs.career`
 * is checked at compile time, so a typo is a build error rather than a
 * `player.tabs.carer` rendered on the page.
 */
export function useI18n() {
  const locale = useLocale((s) => s.locale)
  const setLocale = useLocale((s) => s.setLocale)
  const toggle = useLocale((s) => s.toggle)
  return { t: DICTS[locale], f: FORMATTERS[locale], locale, setLocale, toggle }
}
