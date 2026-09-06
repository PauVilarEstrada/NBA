import { create } from 'zustand'
import type { PricedPlayer } from '@/types'

const BUDGET_KEY = 'nba-vision-budget'

interface BuilderState {
  budget: number
  roster: PricedPlayer[]
  opponent: string
  seed: number
  isPlayoffs: boolean
  userIsHome: boolean
  setBudget: (b: number) => void
  add: (p: PricedPlayer) => void
  remove: (id: number) => void
  clear: () => void
  setOpponent: (abbr: string) => void
  setSeed: (s: number) => void
  setPlayoffs: (v: boolean) => void
  setUserIsHome: (v: boolean) => void
  spent: () => number
  remaining: () => number
  has: (id: number) => boolean
}

const DEFAULT_BUDGET = 120_000_000

const savedBudget = () => {
  try {
    const saved = Number(localStorage.getItem(BUDGET_KEY))
    // Budgets used to be on a rescaled 10-100M scale; anything that small now
    // buys nobody, so an old stored value is discarded rather than stranding
    // the user on an unusable budget.
    return saved >= 40_000_000 ? saved : DEFAULT_BUDGET
  } catch { return DEFAULT_BUDGET }
}

export const ROSTER_MIN = 5
export const ROSTER_MAX = 10

export const useBuilder = create<BuilderState>((set, get) => ({
  budget: savedBudget(),
  roster: [],
  opponent: 'BOS',
  seed: 7,
  isPlayoffs: false,
  userIsHome: false,

  setBudget: (budget) => {
    try { localStorage.setItem(BUDGET_KEY, String(budget)) } catch { /* ignore */ }
    // Prices are fixed market values, so the budget can change without touching
    // the roster. Raising it keeps the team you built; lowering it can leave you
    // over budget, which the UI shows rather than silently dropping players.
    set({ budget })
  },
  add: (p) => {
    const { roster, budget } = get()
    if (roster.length >= ROSTER_MAX) return
    if (roster.some((r) => r.playerId === p.playerId)) return
    if (roster.reduce((s, r) => s + r.cost, 0) + p.cost > budget) return
    set({ roster: [...roster, p] })
  },
  remove: (id) => set({ roster: get().roster.filter((p) => p.playerId !== id) }),
  clear: () => set({ roster: [] }),
  setOpponent: (opponent) => set({ opponent }),
  setSeed: (seed) => set({ seed }),
  setPlayoffs: (isPlayoffs) => set({ isPlayoffs }),
  setUserIsHome: (userIsHome) => set({ userIsHome }),

  spent: () => get().roster.reduce((s, p) => s + p.cost, 0),
  remaining: () => get().budget - get().roster.reduce((s, p) => s + p.cost, 0),
  has: (id) => get().roster.some((p) => p.playerId === id),
}))
