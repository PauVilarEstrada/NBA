import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { SectionTitle, Segmented } from '@/components/ui/Bits'
import { RankChip } from '@/components/ui/Numbers'
import { CardGridSkeleton } from '@/components/ui/Loading'
import { TeamLogo } from '@/components/ui/Media'
import { api, SEASON_LABEL } from '@/lib/api'
import * as engine from '@/lib/engine'
import { CAP } from '@/lib/cap'
import { dec, money, signed } from '@/lib/format'
import type { Team } from '@/types'

const SORTS = [
  { value: 'netRating', label: 'Net' },
  { value: 'offRating', label: 'Offence' },
  { value: 'defRating', label: 'Defence' },
  { value: 'pace', label: 'Pace' },
  { value: 'winPct', label: 'Record' },
] as const

export default function Teams() {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [conference, setConference] = useState<'all' | 'East' | 'West'>('all')
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('netRating')

  useEffect(() => { api.teams().then(setTeams) }, [])

  const rows = useMemo(() => {
    if (!teams) return []
    return teams
      .filter((t) => conference === 'all' || t.conference === conference)
      .sort((a, b) => (sort === 'defRating' ? a[sort] - b[sort] : b[sort] - a[sort]))
  }, [teams, conference, sort])

  const finals = engine.RECENT_FINALS ?? []

  return (
    <PageTransition>
      <SectionTitle title="Teams"
        sub={`Ratings, pace, payroll and banners · ${SEASON_LABEL} season`} />

      {/* Champions strip: the league's own headline, right at the top. */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {finals.slice(0, 6).map((f) => {
          const champ = engine.getTeam(f.champion)
          if (!champ) return null
          return (
            <Link key={f.year} to={`/teams/${champ.abbr}`}
              className="glass glass-hover flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: `linear-gradient(120deg, ${champ.primaryColor}2E, var(--surface-glass) 70%)` }}>
              <TeamLogo teamId={champ.teamId} abbr={champ.abbr} size={30} />
              <span>
                <span className="num block text-[10px] font-bold tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>{f.year} CHAMPIONS</span>
                <span className="block text-sm font-semibold leading-tight">{champ.fullName}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Segmented value={conference} onChange={setConference}
          options={[{ value: 'all', label: 'League' }, { value: 'East', label: 'East' }, { value: 'West', label: 'West' }]} />
        <Segmented value={sort} onChange={setSort} options={SORTS.map((s) => ({ ...s }))} />
      </div>

      {!teams ? (
        <CardGridSkeleton count={9} />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((t) => {
            const roster = engine.roster(t.teamId)
            const committed = roster.reduce((s, p) => s + p.salary, 0)
            const titles = t.franchise.titleCount
            return (
              <motion.div key={t.abbr} variants={riseItem} layout>
                <Link to={`/teams/${t.abbr}`}>
                  <GlassCard hover sheen padded={false} className="overflow-hidden"
                    style={{ background: `linear-gradient(150deg, ${t.primaryColor}30, var(--surface-glass) 62%)` }}>
                    <div className="flex items-center gap-3 p-4">
                      <TeamLogo teamId={t.teamId} abbr={t.abbr} size={54} />
                      <div className="min-w-0 flex-1">
                        <p className="headline truncate text-xl leading-none">{t.fullName}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
                          style={{ color: 'var(--text-2)' }}>
                          {t.conference} · {t.division} · {t.wins}-{t.losses}
                          {titles > 0 && (
                            <span className="num rounded px-1 py-0.5"
                              style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}
                              title={`${titles} NBA championships`}>
                              {titles}◎
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="num shrink-0 rounded-lg px-2 py-1 text-sm font-bold"
                        style={{
                          background: t.netRating >= 0 ? 'rgba(12,163,12,.16)' : 'rgba(208,59,59,.16)',
                          color: t.netRating >= 0 ? 'var(--good)' : 'var(--bad)',
                        }}>
                        {signed(t.netRating)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                      <RankChip rank={t.offRatingRank} label="OFF" />
                      <RankChip rank={t.defRatingRank} label="DEF" />
                      <RankChip rank={t.paceRank} label="PACE" />
                    </div>

                    <dl className="grid grid-cols-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                      {([['SCORED', dec(t.pointsPerGame)], ['ALLOWED', dec(t.pointsAllowed)],
                         ['PACE', dec(t.pace)], ['SPACE', money(CAP - committed)]] as const).map(([k, v]) => (
                        <div key={k} className="border-r px-1 py-2 last:border-0"
                          style={{ borderColor: 'var(--border)' }}>
                          <dt className="text-[9px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-muted)' }}>{k}</dt>
                          <dd className="num text-sm font-bold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </GlassCard>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {teams && (
        <GlassCard className="mt-5">
          <SectionTitle title="League table" sub="Every team, every column" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                  {['#', 'Team', 'Conf', 'W-L', 'Win%', 'OFF', 'DEF', 'NET', 'PACE',
                    'Scored', 'Allowed', 'Payroll', 'Titles'].map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t, i) => (
                  <tr key={t.abbr} className="border-b last:border-0 hover-layer-1"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <Link to={`/teams/${t.abbr}`}
                        className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                        <TeamLogo teamId={t.teamId} abbr={t.abbr} size={18} />
                        {t.fullName}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{t.conference}</td>
                    <td className="num px-2 py-2">{t.wins}-{t.losses}</td>
                    <td className="num px-2 py-2">{(t.winPct * 100).toFixed(1)}</td>
                    <td className="num px-2 py-2">{dec(t.offRating)}</td>
                    <td className="num px-2 py-2">{dec(t.defRating)}</td>
                    <td className="num px-2 py-2 font-bold"
                      style={{ color: t.netRating >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                      {signed(t.netRating)}
                    </td>
                    <td className="num px-2 py-2">{dec(t.pace)}</td>
                    <td className="num px-2 py-2">{dec(t.pointsPerGame)}</td>
                    <td className="num px-2 py-2">{dec(t.pointsAllowed)}</td>
                    <td className="num px-2 py-2">{money(t.payroll)}</td>
                    <td className="num px-2 py-2">{t.franchise.titleCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </PageTransition>
  )
}
