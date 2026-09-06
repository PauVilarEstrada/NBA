import { useState } from 'react'
import clsx from 'clsx'
import { initialsDataUrl } from '@/lib/format'

/** Official NBA headshot with a graceful fallback.
 *  cdn.nba.com has no image for every id (two-way deals, mid-season signings),
 *  and a broken-image glyph on a player card looks like a bug. */
export function PlayerAvatar({
  playerId, name, color = '#1D428A', size = 64, className, ring = true,
}: {
  playerId: number; name: string; color?: string; size?: number
  className?: string; ring?: boolean
}) {
  const [failed, setFailed] = useState(false)
  const src = playerId > 0 && !failed
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
    : initialsDataUrl(name, color)
  return (
    <span
      className={clsx('relative inline-block shrink-0 overflow-hidden rounded-xl', className)}
      style={{ width: size, height: size * 0.76, background: `${color}22` }}
    >
      <img
        src={src} alt={name} loading="lazy" onError={() => setFailed(true)}
        className="h-full w-full object-cover object-top"
      />
      {ring && <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-inset ring-[var(--border)]" />}
    </span>
  )
}

export function TeamLogo({
  teamId, abbr, size = 28, className,
}: { teamId: number; abbr: string; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false)
  if (failed || teamId <= 0) {
    return (
      <span className={clsx('num inline-flex items-center justify-center rounded-md layer-2 font-bold', className)}
        style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {abbr}
      </span>
    )
  }
  return (
    <img
      src={`https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`}
      alt={abbr} width={size} height={size} loading="lazy"
      onError={() => setFailed(true)}
      className={clsx('object-contain', className)}
      style={{ width: size, height: size }}
    />
  )
}
