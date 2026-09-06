/**
 * The shape contract for a translation file.
 *
 * `en.ts` is the source of truth. `DictOf<typeof en>` walks it and produces a
 * type where every leaf is a plain `string` (or a function returning one), with
 * exactly the same keys. `es.ts` is annotated with that type, so:
 *
 *   - a **missing** key is a compile error,
 *   - a **misspelt** key is a compile error (excess property check),
 *   - an interpolation function with the **wrong arguments** is a compile error.
 *
 * That is the whole reason for doing it this way rather than with runtime
 * lookups: "fully bilingual" becomes something the build enforces, not
 * something you hope somebody remembered.
 */
export type DictOf<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : T[K] extends string
      ? string
      : T[K] extends readonly string[]
        ? readonly string[]
        : DictOf<T[K]>
}

export type Locale = 'en' | 'es'

export const LOCALES: Array<{ code: Locale; label: string; native: string; flag: string }> = [
  { code: 'en', label: 'English', native: 'English', flag: 'EN' },
  { code: 'es', label: 'Spanish', native: 'Castellano', flag: 'ES' },
]

/** BCP-47 tags for `Intl` — the same locale drives copy *and* number formats,
 *  so a Spanish page shows 20.052 rather than 20,052. */
export const INTL_TAG: Record<Locale, string> = { en: 'en-US', es: 'es-ES' }
