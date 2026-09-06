/**
 * Single data-access layer.
 *
 * `VITE_API_URL` unset  -> the offline engine in `lib/engine.ts` (demo mode).
 * `VITE_API_URL` set    -> the FastAPI backend, which proxies stats.nba.com,
 *                          reads Postgres and serves the trained models.
 *
 * Both paths return the same shapes, so no component knows or cares which is
 * live. Simulations always go through a Web Worker: they are the only genuinely
 * expensive call, and running them on the main thread freezes the page.
 */
import * as engine from './engine'
import type {
  GameLog, H2HGame, Player, PlayerPrediction, PricedPlayer, SeasonRow,
  SimResult, Team, TeamPrediction,
} from '@/types'
import type { SimWorkerRequest, SimWorkerResponse } from './sim.worker'

const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')
export const isLive = Boolean(BASE)
export const dataMode: 'live' | 'demo' = isLive ? 'live' : 'demo'
export const SEASON_LABEL = engine.SEASON_LABEL

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

/** A tiny artificial delay in demo mode. Not decoration: it keeps loading
 *  states on the real code path so they are exercised, not dead code. */
const settle = <T,>(value: T, ms = 90): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms))

// ------------------------------------------------------------ sim worker
/**
 * Simulations run off the main thread, but never at the cost of the feature
 * working at all. A worker can fail to start (module workers blocked, a bundler
 * quirk, a browser that refuses `type: 'module'`), and when it does the old code
 * simply waited forever — the loading screen with no way out, which is what a
 * user experiences as "it hangs".
 *
 * So the contract here is: try the worker, and if it errors, never answers, or
 * cannot even be constructed, fall back to running the same engine on the main
 * thread. Slower for a second, but it always finishes.
 */
let worker: Worker | null = null
let workerBroken = false
let nextRequestId = 1

const WORKER_TIMEOUT_MS = 45_000

function simWorker(): Worker | null {
  if (workerBroken) return null
  if (!worker) {
    try {
      worker = new Worker(new URL('./sim.worker.ts', import.meta.url), { type: 'module' })
      worker.addEventListener('error', (e) => {
        console.warn('[NBA Vision] simulation worker failed, using the main thread', e.message)
        workerBroken = true
      })
    } catch (err) {
      console.warn('[NBA Vision] simulation worker unavailable, using the main thread', err)
      workerBroken = true
      return null
    }
  }
  return worker
}

export interface SimProgress { stage: string; pct: number }

type WorkerPayload =
  | Omit<Extract<SimWorkerRequest, { type: 'simulate' }>, 'requestId'>
  | Omit<Extract<SimWorkerRequest, { type: 'simulateReal' }>, 'requestId'>

/** Same work, on the main thread. Yields one frame first so React can paint the
 *  loading screen before the blocking section starts. */
async function runOnMainThread(request: WorkerPayload): Promise<SimResult> {
  await new Promise((r) => setTimeout(r, 30))
  if (request.type === 'simulate') {
    const picks = request.playerIds.map((id) => engine.getPlayer(id)).filter(Boolean) as Player[]
    return engine.runSimulation(picks, request.opponent, {
      seed: request.seed,
      isPlayoffs: request.isPlayoffs,
      userIsHome: request.userIsHome,
      monteCarloRuns: Math.min(request.monteCarloRuns, 120),
    })
  }
  return engine.runRealGame(request.home, request.away, {
    excluded: new Set(request.excluded),
    seed: request.seed,
    isPlayoffs: request.isPlayoffs,
    monteCarloRuns: Math.min(request.monteCarloRuns, 120),
  })
}

function runOnWorker(
  request: WorkerPayload,
  onProgress?: (p: SimProgress) => void,
): Promise<SimResult> {
  const w = simWorker()
  if (!w) return runOnMainThread(request)

  return new Promise<SimResult>((resolve, reject) => {
    const requestId = nextRequestId++
    let settled = false

    const cleanup = () => {
      w.removeEventListener('message', handle)
      w.removeEventListener('error', onError)
      clearTimeout(timer)
    }
    const finish = (fn: () => void) => { if (!settled) { settled = true; cleanup(); fn() } }

    const handle = (e: MessageEvent<SimWorkerResponse>) => {
      const msg = e.data
      if (!msg || msg.requestId !== requestId) return
      if (msg.type === 'progress') { onProgress?.({ stage: msg.stage, pct: msg.pct }); return }
      if (msg.type === 'done') finish(() => resolve(msg.result))
      else finish(() => reject(new Error(msg.message)))
    }
    const onError = (e: ErrorEvent) => {
      workerBroken = true
      finish(() => reject(new Error(e.message || 'worker error')))
    }
    // A worker that never answers is the failure that looks like a hang.
    const timer = setTimeout(() => {
      workerBroken = true
      finish(() => reject(new Error('simulation timed out')))
    }, WORKER_TIMEOUT_MS)

    w.addEventListener('message', handle)
    w.addEventListener('error', onError)
    try {
      w.postMessage({ ...request, requestId } as SimWorkerRequest)
    } catch (err) {
      onError(new ErrorEvent('error', { message: String(err) }))
    }
  }).catch((err) => {
    // Whatever went wrong with the worker, the user still gets their game.
    console.warn('[NBA Vision] worker path failed, retrying on the main thread:', err)
    onProgress?.({ stage: 'Running the possession model', pct: 55 })
    return runOnMainThread(request)
  })
}

export const api = {
  teams: (): Promise<Team[]> =>
    isLive ? get<{ teams: Team[] }>('/teams').then((r) => r.teams) : settle(engine.TEAMS),

  team: (key: string | number): Promise<{
    team: Team; roster: Player[]; leaders: ReturnType<typeof engine.teamLeaders>
  }> =>
    isLive
      ? get(`/teams/${key}`)
      : settle({
          team: engine.getTeam(key)!,
          roster: engine.roster(key),
          leaders: engine.teamLeaders(key),
        }),

  searchPlayers: (q: string, limit = 24): Promise<Player[]> =>
    isLive
      ? get<{ results: Player[] }>(`/players?q=${encodeURIComponent(q)}&limit=${limit}`)
          .then((r) => r.results)
      : settle(engine.searchPlayers(q, limit), 40),

  rookies: (): Promise<Player[]> =>
    isLive ? get<{ players: Player[] }>('/players/rookies').then((r) => r.players)
           : settle(engine.rookies()),

  player: (id: number): Promise<{
    player: Player; team: Team; career: SeasonRow[]; gameLogs: GameLog[]
    radar: Array<{ axis: string; value: number; raw: number }>
    splits: ReturnType<typeof engine.splits>
    monthly: ReturnType<typeof engine.monthlySplits>
  }> => {
    if (isLive) return get(`/players/${id}`)
    const player = engine.getPlayer(id)!
    const logs = engine.gameLogs(player)
    return settle({
      player,
      team: engine.getTeam(player.teamId)!,
      career: engine.careerSeasons(player),
      gameLogs: logs,
      radar: engine.radar(player),
      splits: engine.splits(logs),
      monthly: engine.monthlySplits(logs),
    })
  },

  headToHead: (playerId: number, opponent: string): Promise<{
    player: Player; opponent: Team; games: H2HGame[]
  }> => {
    if (isLive) return get(`/h2h/${playerId}/${opponent}`)
    const player = engine.getPlayer(playerId)!
    return settle({
      player, opponent: engine.getTeam(opponent)!,
      games: engine.headToHead(player, String(opponent).toUpperCase()),
    })
  },

  predictPlayer: (body: {
    playerId: number; opponent: string | number; isHome: boolean
    restDays: number; isPlayoffs: boolean
  }): Promise<PlayerPrediction> =>
    isLive
      ? post('/predict/player', body)
      : settle(engine.predictPlayer(body.playerId, body.opponent, body), 180),

  predictTeam: (body: {
    home: string | number; away: string | number; isPlayoffs: boolean
    homeRest: number; awayRest: number; series: boolean
  }): Promise<TeamPrediction> =>
    isLive
      ? post('/predict/team', body)
      : settle(engine.predictTeam(body.home, body.away, body), 180),

  fantasyPool: (budget: number): Promise<PricedPlayer[]> =>
    isLive
      ? get<{ players: PricedPlayer[] }>(`/fantasy/pool?budget=${budget}`).then((r) => r.players)
      : settle(engine.pricePool(budget)),

  /** Simulate a user-built lineup against a real team. Always off-thread. */
  simulate: (
    body: {
      budget: number; roster: Array<{ playerId: number; cost: number }>
      opponent: string | number; seed: number; isPlayoffs: boolean
      userIsHome: boolean; monteCarloRuns: number
    },
    onProgress?: (p: SimProgress) => void,
  ): Promise<SimResult> => {
    if (isLive) return post('/fantasy/simulate', body)
    return runOnWorker({
      type: 'simulate',
      playerIds: body.roster.map((r) => r.playerId),
      opponent: body.opponent,
      seed: body.seed,
      isPlayoffs: body.isPlayoffs,
      userIsHome: body.userIsHome,
      monteCarloRuns: body.monteCarloRuns,
    }, onProgress)
  },

  /** Simulate a real matchup, with players ruled out for injury. */
  simulateReal: (
    body: {
      home: string; away: string; excluded: number[]
      seed: number; isPlayoffs: boolean; monteCarloRuns: number
    },
    onProgress?: (p: SimProgress) => void,
  ): Promise<SimResult> => {
    if (isLive) return post('/simulate/game', body)
    return runOnWorker({ type: 'simulateReal', ...body }, onProgress)
  },
}
