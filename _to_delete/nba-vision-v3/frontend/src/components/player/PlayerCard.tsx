import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import * as engine from '@/lib/engine'
import { dec, money } from '@/lib/format'
import type { Player } from '@/types'

/** The trading-card. Team colour drives the whole tile, so a wall of cards
 *  reads as a league rather than a spreadsheet. */
export function PlayerCard({ player, to }: { player: Player; to?: string }) {
  const team = engine.getTeam(player.teamId)!
  const href = to ?? `/players/${player.playerId}`
  return (
    <motion.div layout>
      <Link to={href} className="group block">
        <article
          className="glass glass-hover sheen relative overflow-hidden rounded-2xl p-4"
          style={{ background: `linear-gradient(155deg, ${team.primaryColor}22, var(--surface-glass) 55%)` }}
        >
          <span aria-hidden className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-25 blur-2xl"
            style={{ background: team.primaryColor }} />
          <div className="relative flex items-start gap-3">
            <PlayerAvatar playerId={player.playerId} name={player.name}
              color={team.primaryColor} size={72} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-2)' }}>
                <TeamLogo teamId={team.teamId} abbr={team.abbr} size={16} />
                {team.abbr} · {player.position} · {player.age}
              </p>
              <h3 className="font-display text-2xl font-bold uppercase leading-none tracking-tight
                             transition-colors group-hover:text-[var(--brand-lit)]">
                {player.name}
              </h3>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                {money(player.marketPrice)} market value
              </p>
            </div>
          </div>

          <dl className="relative mt-4 grid grid-cols-4 gap-1.5">
            {([['PTS', player.pts], ['REB', player.reb], ['AST', player.ast],
               ['TS%', player.ts * 100]] as const).map(([k, v]) => (
              <div key={k} className="rounded-lg px-2 py-1.5 text-center"
                style={{ background: 'color-mix(in srgb, var(--bg) 55%, transparent)' }}>
                <dt className="text-[9px] font-bold uppercase tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>{k}</dt>
                <dd className="num text-base font-bold leading-tight">
                  {k === 'TS%' ? dec(v) : dec(v)}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      </Link>
    </motion.div>
  )
}
