/**
 * Simulation worker.
 *
 * A full game is ~200 possessions and the confidence band behind it re-runs the
 * whole engine another 200 times. On the main thread that is hundreds of
 * milliseconds to several seconds of *synchronous* work, which means React
 * never gets to paint the loading screen — the page simply freezes on the click
 * and then jumps to the result. That is the bug this file exists to fix.
 *
 * Here the work happens off-thread, the UI stays at 60fps, and progress
 * messages let the loader report what is actually happening instead of guessing.
 */
import * as engine from './engine'
import type { Player, SimResult } from '@/types'

export interface SimRequest {
  type: 'simulate'
  requestId: number
  playerIds: number[]
  opponent: string | number
  seed: number
  isPlayoffs: boolean
  userIsHome: boolean
  monteCarloRuns: number
}

export interface RealGameRequest {
  type: 'simulateReal'
  requestId: number
  home: string
  away: string
  excluded: number[]
  seed: number
  isPlayoffs: boolean
  monteCarloRuns: number
}

export type SimWorkerRequest = SimRequest | RealGameRequest

export type SimWorkerResponse =
  | { type: 'progress'; requestId: number; stage: string; pct: number }
  | { type: 'done'; requestId: number; result: SimResult }
  | { type: 'error'; requestId: number; message: string }

const post = (msg: SimWorkerResponse) => (self as unknown as Worker).postMessage(msg)

self.onmessage = (e: MessageEvent<SimWorkerRequest>) => {
  const req = e.data
  try {
    if (req.type === 'simulate') {
      post({ type: 'progress', requestId: req.requestId, stage: 'Locking rosters', pct: 10 })
      const picks = req.playerIds
        .map((id) => engine.getPlayer(id))
        .filter(Boolean) as Player[]

      post({ type: 'progress', requestId: req.requestId, stage: 'Allocating minutes by usage', pct: 30 })
      const result = engine.runSimulation(picks, req.opponent, {
        seed: req.seed,
        isPlayoffs: req.isPlayoffs,
        userIsHome: req.userIsHome,
        monteCarloRuns: 0,
      })

      post({ type: 'progress', requestId: req.requestId, stage: 'Running the possession model', pct: 55 })
      if (req.monteCarloRuns > 0) {
        result.distribution = engine.monteCarloFor(picks, req.opponent, {
          seed: req.seed,
          isPlayoffs: req.isPlayoffs,
          userIsHome: req.userIsHome,
          runs: req.monteCarloRuns,
          onProgress: (done, total) =>
            post({
              type: 'progress',
              requestId: req.requestId,
              stage: `Replaying the game ${total} times`,
              pct: 55 + Math.round((done / total) * 40),
            }),
        })
      }
      post({ type: 'progress', requestId: req.requestId, stage: 'Warming up', pct: 100 })
      post({ type: 'done', requestId: req.requestId, result })
      return
    }

    if (req.type === 'simulateReal') {
      post({ type: 'progress', requestId: req.requestId, stage: 'Checking the injury report', pct: 12 })
      const result = engine.runRealGame(req.home, req.away, {
        excluded: new Set(req.excluded),
        seed: req.seed,
        isPlayoffs: req.isPlayoffs,
        monteCarloRuns: 0,
      })
      post({ type: 'progress', requestId: req.requestId, stage: 'Running the possession model', pct: 45 })
      if (req.monteCarloRuns > 0) {
        result.distribution = engine.monteCarloReal(req.home, req.away, {
          excluded: new Set(req.excluded),
          seed: req.seed,
          isPlayoffs: req.isPlayoffs,
          runs: req.monteCarloRuns,
          onProgress: (done, total) =>
            post({
              type: 'progress',
              requestId: req.requestId,
              stage: `Replaying the game ${total} times`,
              pct: 45 + Math.round((done / total) * 50),
            }),
        })
      }
      post({ type: 'progress', requestId: req.requestId, stage: 'Warming up', pct: 100 })
      post({ type: 'done', requestId: req.requestId, result })
      return
    }
  } catch (err) {
    post({
      type: 'error',
      requestId: (req as { requestId: number }).requestId,
      message: err instanceof Error ? err.message : String(err),
    })
  }
}
