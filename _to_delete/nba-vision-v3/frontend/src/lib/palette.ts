/**
 * Chart palette.
 *
 * Both columns are *selected*, not generated: each was run through the
 * categorical-palette validator against the surface it actually renders on
 * (dark `#101A33`, light `#FFFFFF`) and checked for lightness band, chroma
 * floor, colour-vision-deficiency separation on adjacent pairs, normal-vision
 * separation, and contrast. Do not add a seventh slot by picking a hue that
 * looks nice — re-run the validator (see docs/design.md).
 *
 * NBA navy and NBA red are the *brand*; they drive chrome, glows and calls to
 * action. Series 1 and 2 are their chart-safe siblings, stepped for contrast.
 */
import { useTheme } from '@/store/theme'

export const SERIES_DARK = ['#3B82F6', '#E5484D', '#12A594', '#BC8000', '#8B7BE8', '#E255A1']
export const SERIES_LIGHT = ['#2A78D6', '#C8102E', '#1BAF7A', '#8A6100', '#4A3AA7', '#D55181']

export const BRAND = { navy: '#1D428A', red: '#C8102E', navyLit: '#3B82F6', redLit: '#E5484D' }

export interface ChartTokens {
  series: string[]
  grid: string
  axis: string
  tick: string
  surface: string
  good: string
  bad: string
}

const DARK: ChartTokens = {
  series: SERIES_DARK,
  grid: 'rgba(255,255,255,.07)',
  axis: 'rgba(255,255,255,.14)',
  tick: '#6B7C99',
  surface: '#101A33',
  good: '#0CA30C',
  bad: '#D03B3B',
}

const LIGHT: ChartTokens = {
  series: SERIES_LIGHT,
  grid: 'rgba(9,20,44,.10)',
  axis: 'rgba(9,20,44,.20)',
  tick: '#6B7C99',
  surface: '#FFFFFF',
  good: '#006300',
  bad: '#C0272D',
}

export function useChartTokens(): ChartTokens {
  return useTheme((s) => s.theme) === 'light' ? LIGHT : DARK
}

export const tokensFor = (theme: 'dark' | 'light'): ChartTokens => (theme === 'light' ? LIGHT : DARK)
