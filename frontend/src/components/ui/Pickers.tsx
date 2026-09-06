import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import * as engine from '@/lib/engine'
import { useI18n } from '@/i18n'
import type { Player, Team } from '@/types'
import { PlayerAvatar, TeamLogo } from './Media'

/** Type-ahead player picker. Keyboard-first: arrows move, Enter selects,
 *  Escape closes — a search box you have to reach for the mouse to use is a
 *  search box people stop using. */
export function PlayerPicker({
  value, onChange, placeholder, exclude = [],
}: {
  value: Player | null
  onChange: (p: Player | null) => void
  placeholder?: string
  exclude?: number[]
}) {
  const { t, f } = useI18n()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const results = useMemo(
    () => engine.searchPlayers(query, 8).filter((p) => !exclude.includes(p.playerId)),
    [query, exclude],
  )

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const commit = (p: Player) => { onChange(p); setQuery(''); setOpen(false) }

  return (
    <div ref={boxRef} className="relative">
      {value ? (
        <button
          onClick={() => { onChange(null); setOpen(true) }}
          className="glass glass-hover flex w-full items-center gap-3 rounded-xl p-2.5 text-left"
        >
          <PlayerAvatar playerId={value.playerId} name={value.name}
            color={engine.getTeam(value.teamId)?.primaryColor} size={52} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-bold leading-tight">{value.name}</span>
            <span className="block text-xs" style={{ color: 'var(--text-2)' }}>
              {value.team} · {value.position} · {f.dec(value.pts)} {t.abbr.ppg}
            </span>
          </span>
          <span className="shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>{t.pickers.change}</span>
        </button>
      ) : (
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); setCursor(0) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)) }
            if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)) }
            if (e.key === 'Enter' && results[cursor]) commit(results[cursor])
            if (e.key === 'Escape') setOpen(false)
          }}
          placeholder={placeholder ?? t.pickers.searchPlayer}
          className="glass w-full rounded-xl px-4 py-3.5 text-sm outline-none
                     placeholder:text-[var(--text-muted)] focus:ring-2 focus:ring-[#3B82F6]/50"
        />
      )}

      <AnimatePresence>
        {open && !value && results.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="glass absolute z-40 mt-2 max-h-80 w-full overflow-auto rounded-xl p-1.5"
          >
            {results.map((p, i) => (
              <li key={p.playerId}>
                <button
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => commit(p)}
                  className={clsx('flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors',
                    i === cursor ? 'bg-[#3B82F6]/18' : 'hover-layer-1')}
                >
                  <PlayerAvatar playerId={p.playerId} name={p.name}
                    color={engine.getTeam(p.teamId)?.primaryColor} size={36} ring={false} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{p.name}</span>
                    <span className="block text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {p.team} · {p.position}
                    </span>
                  </span>
                  <span className="num text-xs font-bold">{f.dec(p.pts)}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

export function TeamPicker({
  value, onChange, label,
}: { value: Team | null; onChange: (t: Team) => void; label?: string }) {
  const { t } = useI18n()
  const teams = useMemo(() => [...engine.TEAMS].sort((a, b) => a.abbr.localeCompare(b.abbr)), [])
  return (
    <label className="block">
      {label && <span className="eyebrow mb-2 block">{label}</span>}
      <div className="glass flex items-center gap-2 rounded-xl px-3 py-2.5">
        {value && <TeamLogo teamId={value.teamId} abbr={value.abbr} size={28} />}
        <select
          value={value?.abbr ?? ''}
          onChange={(e) => onChange(engine.getTeam(e.target.value)!)}
          className="w-full cursor-pointer bg-transparent text-sm font-semibold outline-none"
        >
          <option value="" disabled>{t.pickers.pickTeam}</option>
          {teams.map((t) => (
            <option key={t.abbr} value={t.abbr} className="bg-[#0B1120]">
              {t.abbr} — {t.fullName}
            </option>
          ))}
        </select>
      </div>
    </label>
  )
}
