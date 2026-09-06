import { motion } from 'framer-motion'
import { TeamLogo } from '@/components/ui/Media'

/**
 * Pre-game loader.
 *
 * It reports the worker's real progress rather than animating a fake bar: the
 * simulation genuinely runs a few hundred possessions plus a Monte Carlo sweep,
 * and naming the stage is what turns a wait into a countdown. The work happens
 * off the main thread (see `lib/sim.worker.ts`), so this stays at 60fps.
 */
export function GameLoader({
  homeAbbr, homeId, awayAbbr, awayId, stage, pct, isPlayoffs,
}: {
  homeAbbr: string
  homeId?: number
  awayAbbr: string
  awayId?: number
  stage: string
  pct: number
  isPlayoffs?: boolean
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl px-6 py-16 text-center">
      <span aria-hidden className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(59,130,246,.35), transparent 65%)',
        }} />

      <div className="relative">
        <p className="eyebrow">{isPlayoffs ? 'Playoff game' : 'Regular season'}</p>

        <div className="mt-4 flex items-center justify-center gap-6 sm:gap-12">
          <SideBadge abbr={awayAbbr} teamId={awayId} label="Away" />
          <div className="relative">
            <motion.span
              className="block h-12 w-12 rounded-full bg-gradient-to-br from-[#E5484D] to-[#8A2418]
                         shadow-[0_0_28px_6px_rgba(229,72,77,.35)]"
              animate={{ y: [0, -22, 0], scaleY: [1, 0.9, 1], rotate: [0, 180, 360] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut' }}
            />
            <span aria-hidden className="mx-auto mt-2 block h-1 w-10 rounded-full opacity-40"
              style={{ background: 'var(--text-muted)' }} />
          </div>
          <SideBadge abbr={homeAbbr} teamId={homeId} label="Home" />
        </div>

        <p className="headline mt-8 text-3xl">Tip-off</p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{stage}…</p>

        <div className="mx-auto mt-6 h-1.5 w-72 max-w-full overflow-hidden rounded-full"
          style={{ background: 'var(--layer-2)' }}>
          <motion.div className="h-full rounded-full bg-gradient-to-r from-[#3B82F6] to-[#C8102E]"
            animate={{ width: `${Math.max(4, pct)}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }} />
        </div>
        <p className="num mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>{Math.round(pct)}%</p>
      </div>
    </div>
  )
}

function SideBadge({ abbr, teamId, label }: { abbr: string; teamId?: number; label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center gap-1.5"
    >
      {teamId
        ? <TeamLogo teamId={teamId} abbr={abbr} size={64} />
        : <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#3B82F6]/20 font-display text-lg font-bold">
            {abbr}
          </span>}
      <span className="headline text-lg">{abbr}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest"
        style={{ color: 'var(--text-muted)' }}>{label}</span>
    </motion.div>
  )
}
