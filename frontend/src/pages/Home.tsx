import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, StatTile } from '@/components/ui/Bits'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import * as engine from '@/lib/engine'
import { useI18n } from '@/i18n'

/** Route and tint only — the title and copy of each card live in the
 *  dictionary under `home.features`, keyed by the same name. */
const FEATURES = [
  { key: 'players', to: '/players', tint: '#3B82F6' },
  { key: 'season', to: '/season', tint: '#E5484D' },
  { key: 'rookies', to: '/rookies', tint: '#8B7BE8' },
  { key: 'compare', to: '/compare', tint: '#12A594' },
  { key: 'teams', to: '/teams', tint: '#BC8000' },
  { key: 'h2h', to: '/head-to-head', tint: '#8B7BE8' },
  { key: 'predictPlayer', to: '/predict/player', tint: '#E255A1' },
  { key: 'predictTeam', to: '/predict/team', tint: '#3B82F6' },
  { key: 'simulate', to: '/simulate', tint: '#E5484D' },
  { key: 'builder', to: '/builder', tint: '#12A594' },
  { key: 'league', to: '/league', tint: '#BC8000' },
] as const

export default function Home() {
  const { t, f } = useI18n()
  const teams = engine.TEAMS
  const scorers = [...engine.PLAYERS].sort((a, b) => b.pts - a.pts).slice(0, 5)
  const best = teams[0]
  const matchup = engine.predictTeam(teams[0].abbr, teams[1].abbr, {})

  return (
    <PageTransition>
      {/* ------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden rounded-3xl">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-[#1D428A] opacity-40 blur-[110px]" />
          <div className="absolute -right-16 top-10 h-72 w-72 rounded-full bg-[#C8102E] opacity-25 blur-[110px]" />
        </div>

        <motion.div variants={stagger} initial="hidden" animate="show"
          className="px-2 py-14 sm:px-6 sm:py-20">
          <motion.div variants={riseItem}>
            <Badge tone="accent">{t.home.eyebrow}</Badge>
          </motion.div>
          <motion.h1 variants={riseItem}
            className="headline mt-4 text-[clamp(2.75rem,8vw,6.5rem)] tracking-tight">
            {t.home.titleTop}
            <br />
            {/* The middle stop is a token: white reads on the dark ground and
                would vanish on the light one. */}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage:
                'linear-gradient(90deg, var(--brand-lit), var(--hero-mid), var(--accent-lit))' }}>
              {t.home.titleBottom}
            </span>
          </motion.h1>
          <motion.p variants={riseItem}
            className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-2)' }}>
            {t.home.lede(engine.SEASON_LABEL)}
          </motion.p>
          <motion.div variants={riseItem} className="mt-8 flex flex-wrap gap-3">
            <Link to="/builder"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A]
                         px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white
                         shadow-glow transition-transform hover:-translate-y-0.5">
              <span className="relative z-10">{t.home.ctaBuild}</span>
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-streak
                                           transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link to="/predict/player"
              className="glass glass-hover rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider">
              {t.home.ctaProject}
            </Link>
          </motion.div>

          <motion.div variants={riseItem}
            className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label={t.home.tileSeason} value={engine.SEASON_LABEL} tone="brand" />
            <StatTile label={t.home.tilePlayers} value={f.int(engine.PLAYERS.length)} />
            <StatTile label={t.home.tileBestNet} value={`${best.abbr} ${f.dec(best.netRating)}`} tone="accent" />
            <StatTile label={t.home.tileChampions}
              value={engine.RECENT_FINALS?.[0]?.champion ?? '—'}
              hint={`${engine.RECENT_FINALS?.[0]?.year ?? ''} · ${engine.RECENT_FINALS?.[0]?.finalsMvp ?? ''}`} />
          </motion.div>
        </motion.div>
      </section>

      {/* --------------------------------------------------------- features */}
      <section className="mt-8">
        <SectionTitle title={t.home.insideTitle}
          sub={t.home.insideSub(engine.SEASON_LABEL)} />
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <motion.div key={feature.to} variants={riseItem}>
              <Link to={feature.to} className="block h-full">
                <GlassCard hover sheen accent={feature.tint} className="h-full">
                  <div className="flex h-full flex-col">
                    <span aria-hidden className="mb-3 inline-block h-8 w-8 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${feature.tint}, transparent)` }} />
                    <h3 className="font-display text-xl font-bold uppercase tracking-wide">
                      {t.home.features[feature.key].title}
                    </h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {t.home.features[feature.key].copy}
                    </p>
                    <span className="mt-4 text-xs font-bold uppercase tracking-widest"
                      style={{ color: feature.tint }}>{t.home.open}</span>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ----------------------------------------------------------- boards */}
      <section className="mt-10 grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-2">
          <SectionTitle title={t.home.scoringLeaders} sub={t.home.scoringLeadersSub} />
          <ul className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {scorers.map((p, i) => {
              const team = engine.getTeam(p.teamId)!
              return (
                <li key={p.playerId}>
                  <Link to={`/players/${p.playerId}`}
                    className="group flex items-center gap-3 py-2.5 transition-colors hover-layer-1">
                    <span className="num w-5 text-center text-sm font-bold"
                      style={{ color: 'var(--text-muted)' }}>{i + 1}</span>
                    <PlayerAvatar playerId={p.playerId} name={p.name} color={team.primaryColor} size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg font-bold leading-tight
                                       transition-colors group-hover:text-[var(--brand-lit)]">
                        {p.name}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <TeamLogo teamId={team.teamId} abbr={team.abbr} size={14} />
                        {team.abbr} · {p.position}
                      </span>
                    </span>
                    <span className="num text-right">
                      <span className="block text-lg font-bold leading-none">{f.dec(p.pts)}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t.abbr.ppg}</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </GlassCard>

        <GlassCard accent="#E5484D">
          <SectionTitle title={t.home.topMatchup} sub={t.home.topMatchupSub} />
          <div className="flex items-center justify-between gap-2 py-2">
            <TeamBlock abbr={matchup.home.abbr} teamId={matchup.home.teamId}
              pts={matchup.projection.homePts.mean} />
            <span className="headline text-2xl" style={{ color: 'var(--text-muted)' }}>{t.common.vs}</span>
            <TeamBlock abbr={matchup.away.abbr} teamId={matchup.away.teamId}
              pts={matchup.projection.awayPts.mean} />
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k={t.home.homeWinProbability} v={f.pct(matchup.projection.homeWinProb, 1)} />
            <Row k={t.home.spread} v={f.dec(matchup.projection.spread)} />
            <Row k={t.home.total} v={f.dec(matchup.projection.total.mean)} />
            <Row k={t.home.possessions} v={f.dec(matchup.projection.possessions)} />
          </dl>
          <Link to="/predict/team"
            className="mt-4 block rounded-xl layer-1 py-2.5 text-center text-xs font-bold
                       uppercase tracking-widest transition-colors hover-layer-2">
            {t.home.runYourOwn}
          </Link>
        </GlassCard>
      </section>
    </PageTransition>
  )
}

function TeamBlock({ abbr, teamId, pts }: { abbr: string; teamId: number; pts: number }) {
  const { f } = useI18n()
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <TeamLogo teamId={teamId} abbr={abbr} size={46} />
      <span className="headline text-lg">{abbr}</span>
      <span className="num text-3xl font-bold">{f.int(pts)}</span>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between">
      <dt style={{ color: 'var(--text-2)' }}>{k}</dt>
      <dd className="num font-bold">{v}</dd>
    </div>
  )
}
