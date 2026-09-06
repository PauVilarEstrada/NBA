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
import { useI18n } from '@/i18n'
import type { Team } from '@/types'

/** Sort keys only — the labels are looked up from the dictionary at render. */
const SORTS = ['netRating', 'offRating', 'defRating', 'pace', 'winPct'] as const
type SortKey = (typeof SORTS)[number]

export default function Teams() {
  const { t, f } = useI18n()
  /** The data layer stores 'East'/'West'; the page shows them in the reader's
   *  language. Division names stay as they are — they are proper nouns. */
  const conf = (c: string) => (c === 'East' ? t.common.east : t.common.west)
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [conference, setConference] = useState<'all' | 'East' | 'West'>('all')
  const [sort, setSort] = useState<SortKey>('netRating')

  useEffect(() => { api.teams().then(setTeams) }, [])

  const rows = useMemo(() => {
    if (!teams) return []
    return teams
      .filter((team) => conference === 'all' || team.conference === conference)
      .sort((a, b) => (sort === 'defRating' ? a[sort] - b[sort] : b[sort] - a[sort]))
  }, [teams, conference, sort])

  const finals = engine.RECENT_FINALS ?? []

  const sortLabels: Record<SortKey, string> = {
    netRating: t.teams.sortNet,
    offRating: t.teams.sortOffence,
    defRating: t.teams.sortDefence,
    pace: t.teams.sortPace,
    winPct: t.teams.sortRecord,
  }

  return (
    <PageTransition>
      <SectionTitle title={t.teams.title} sub={t.teams.sub(SEASON_LABEL)} />

      {/* Champions strip: the league's own headline, right at the top. */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {finals.slice(0, 6).map((series) => {
          const champ = engine.getTeam(series.champion)
          if (!champ) return null
          return (
            <Link key={series.year} to={`/teams/${champ.abbr}`}
              className="glass glass-hover flex shrink-0 items-center gap-2.5 rounded-xl px-3 py-2"
              style={{ background: `linear-gradient(120deg, ${champ.primaryColor}2E, var(--surface-glass) 70%)` }}>
              <TeamLogo teamId={champ.teamId} abbr={champ.abbr} size={30} />
              <span>
                <span className="num block text-[10px] font-bold tracking-widest"
                  style={{ color: 'var(--text-muted)' }}>{t.teams.championsOf(series.year)}</span>
                <span className="block text-sm font-semibold leading-tight">{champ.fullName}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <Segmented value={conference} onChange={setConference}
          options={[{ value: 'all', label: t.common.league }, { value: 'East', label: t.common.east }, { value: 'West', label: t.common.west }]} />
        <Segmented value={sort} onChange={setSort}
          options={SORTS.map((s) => ({ value: s, label: sortLabels[s] }))} />
      </div>

      {!teams ? (
        <CardGridSkeleton count={9} />
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((team) => {
            const roster = engine.roster(team.teamId)
            const committed = roster.reduce((s, p) => s + p.salary, 0)
            const titles = team.franchise.titleCount
            return (
              <motion.div key={team.abbr} variants={riseItem} layout>
                <Link to={`/teams/${team.abbr}`}>
                  <GlassCard hover sheen padded={false} className="overflow-hidden"
                    style={{ background: `linear-gradient(150deg, ${team.primaryColor}30, var(--surface-glass) 62%)` }}>
                    <div className="flex items-center gap-3 p-4">
                      <TeamLogo teamId={team.teamId} abbr={team.abbr} size={54} />
                      <div className="min-w-0 flex-1">
                        <p className="headline truncate text-xl leading-none">{team.fullName}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest"
                          style={{ color: 'var(--text-2)' }}>
                          {conf(team.conference)} · {team.division} · {team.wins}-{team.losses}
                          {titles > 0 && (
                            <span className="num rounded px-1 py-0.5"
                              style={{ background: 'rgba(212,175,55,.16)', color: '#D4AF37' }}
                              title={t.team.championBadge(titles)}>
                              {titles}◎
                            </span>
                          )}
                        </p>
                      </div>
                      <span className="num shrink-0 rounded-lg px-2 py-1 text-sm font-bold"
                        style={{
                          background: team.netRating >= 0 ? 'rgba(12,163,12,.16)' : 'rgba(208,59,59,.16)',
                          color: team.netRating >= 0 ? 'var(--good)' : 'var(--bad)',
                        }}>
                        {f.signed(team.netRating)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                      <RankChip rank={team.offRatingRank} label={t.abbr.off} />
                      <RankChip rank={team.defRatingRank} label={t.abbr.def} />
                      <RankChip rank={team.paceRank} label={t.abbr.pace} />
                    </div>

                    <dl className="grid grid-cols-4 border-t text-center" style={{ borderColor: 'var(--border)' }}>
                      {([[t.abbr.scored, f.dec(team.pointsPerGame)], [t.abbr.allowed, f.dec(team.pointsAllowed)],
                         [t.abbr.pace, f.dec(team.pace)], [t.abbr.space, f.money(CAP - committed)]] as const).map(([k, v]) => (
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
          <SectionTitle title={t.teams.leagueTable} sub={t.teams.leagueTableSub} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left" style={{ borderColor: 'var(--border)' }}>
                  {['#', t.abbr.team, t.abbr.conf, `${t.abbr.w}-${t.abbr.l}`, t.abbr.pct,
                    t.abbr.off, t.abbr.def, t.abbr.net, t.abbr.pace, t.team.scored, t.team.allowed,
                    t.stat.payroll, t.stat.titles].map((h) => (
                    <th key={h} className="px-2 py-2 text-[11px] font-bold uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((team, i) => (
                  <tr key={team.abbr} className="border-b last:border-0 hover-layer-1"
                    style={{ borderColor: 'var(--border)' }}>
                    <td className="num px-2 py-2" style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <Link to={`/teams/${team.abbr}`}
                        className="flex items-center gap-2 font-semibold hover:text-[var(--brand-lit)]">
                        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={18} />
                        {team.fullName}
                      </Link>
                    </td>
                    <td className="px-2 py-2">{conf(team.conference)}</td>
                    <td className="num px-2 py-2">{team.wins}-{team.losses}</td>
                    <td className="num px-2 py-2">{f.dec(team.winPct * 100)}</td>
                    <td className="num px-2 py-2">{f.dec(team.offRating)}</td>
                    <td className="num px-2 py-2">{f.dec(team.defRating)}</td>
                    <td className="num px-2 py-2 font-bold"
                      style={{ color: team.netRating >= 0 ? 'var(--good)' : 'var(--bad)' }}>
                      {f.signed(team.netRating)}
                    </td>
                    <td className="num px-2 py-2">{f.dec(team.pace)}</td>
                    <td className="num px-2 py-2">{f.dec(team.pointsPerGame)}</td>
                    <td className="num px-2 py-2">{f.dec(team.pointsAllowed)}</td>
                    <td className="num px-2 py-2">{f.money(team.payroll)}</td>
                    <td className="num px-2 py-2">{team.franchise.titleCount}</td>
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
