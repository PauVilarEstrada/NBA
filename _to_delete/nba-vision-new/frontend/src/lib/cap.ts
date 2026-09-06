/** Salary-cap constants. Kept next to the UI because the cap sheet, the
 *  fantasy budget scale and the value model all quote the same number. */
export const CAP_BY_SEASON: Record<number, number> = {
  2023: 136_021_000,
  2024: 140_588_000,
  2025: 154_647_000,
  2026: 165_872_000, // projected
}

export const SEASON = 2025
export const CAP = CAP_BY_SEASON[SEASON]
export const LUXURY_TAX = Math.round(CAP * 1.2158)
export const APRON_1 = Math.round(CAP * 1.2861)
