import { create } from 'zustand'

export type Theme = 'dark' | 'light'

const KEY = 'nba-vision-theme'

function initial(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const saved = window.localStorage.getItem(KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* private mode, blocked storage — fall through */ }
  // Dark is the product's default look, not a mirror of the OS setting.
  return 'dark'
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
  try { window.localStorage.setItem(KEY, theme) } catch { /* ignore */ }
}

interface ThemeState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggle: () => void
}

export const useTheme = create<ThemeState>((set, get) => ({
  theme: initial(),
  setTheme: (theme) => { apply(theme); set({ theme }) },
  toggle: () => get().setTheme(get().theme === 'dark' ? 'light' : 'dark'),
}))

if (typeof window !== 'undefined') apply(useTheme.getState().theme)
