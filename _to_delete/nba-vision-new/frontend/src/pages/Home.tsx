import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PageTransition, riseItem, stagger } from '@/components/ui/PageTransition'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle, StatTile } from '@/components/ui/Bits'
import { PlayerAvatar, TeamLogo } from '@/components/ui/Media'
import * as engine from '@/lib/engine'
import { dec } from '@/lib/format'

const FEATURES = [
  { to: '/players', title: 'Player index', copy: 'Measurements, shooting splits, advanced metrics with league percentiles, splits, career and honours.', tint: '#3B82F6' },
  { to: '/rookies', title: 'Rookie class', copy: 'The whole draft board, where each pick came from, and a scored Rookie of the Year race.', tint: '#E5484D' },
  { to: '/compare', title: 'Compare players', copy: 'Two to four side by side, scored category by category, with percentile bars on every line.', tint: '#12A594' },
  { to: '/teams', title: 'Teams & cap sheet', copy: 'Ratings and ranks, roster, payroll against the tax line, and the championship banners.', tint: '#BC8000' },
  { to: '/head-to-head', title: 'Head-to-head', copy: 'Every meeting with one opponent, split home and away, plotted game by game.', tint: '#8B7BE8' },
  { to: '/predict/player', title: 'Player projection', copy: 'Points, rebounds and assists against a chosen defence — with an interval and an over/under.', tint: '#E255A1' },
  { to: '/predict/team', title: 'Game forecast', copy: 'Score, spread and win probability. Playoffs run on their own model, not a flag.', tint: '#3B82F6' },
  { to: '/simulate', title: 'Simulate a game', copy: 'Two real teams, possession by possession. Rule players out for injury and watch what changes.', tint: '#E5484D' },
  { to: '/builder', title: 'Build a team', copy: 'A budget, a priced league, and your lineup against the real thing — replayed live.', tint: '#12A594' },
]

export default function Home() {
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
            <Badge tone="accent">Analytics · Projection · Simulation</Badge>
          </motion.div>
          <motion.h1 variants={riseItem}
            className="headline mt-4 text-[clamp(2.75rem,8vw,6.5rem)] tracking-tight">
            Every number
            <br />
            {/* The middle stop is a token: white reads on the dark ground and
                would vanish on the light one. */}
            <span className="bg-clip-text text-transparent"
              style={{ backgroundImage:
                'linear-gradient(90deg, var(--brand-lit), var(--hero-mid), var(--accent-lit))' }}>
              before the tip-off
            </span>
          </motion.h1>
          <motion.p variants={riseItem}
            className="mt-5 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-2)' }}>
            A full-stack NBA lab for the {engine.SEASON_LABEL} season: official stats, advanced
            metrics and contract values, head-to-head history, and models that project a player
            against a defence, forecast a game, simulate one possession by possession, and play a
            roster you build yourself against the real league.
          </motion.p>
          <motion.div variants={riseItem} className="mt-8 flex flex-wrap gap-3">
            <Link to="/builder"
              className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#1D428A]
                         px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white
                         shadow-glow transition-transform hover:-translate-y-0.5">
              <span className="relative z-10">Build your team</span>
              <span aria-hidden className="absolute inset-0 -translate-x-full bg-streak
                                           transition-transform duration-700 group-hover:translate-x-full" />
            </Link>
            <Link to="/predict/player"
              className="glass glass-hover rounded-xl px-6 py-3.5 text-sm font-bold uppercase tracking-wider">
              Project a player
            </Link>
          </motion.div>

          <motion.div variants={riseItem}
            className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Season" value={engine.SEASON_LABEL} tone="brand" />
            <StatTile label="Players indexed" value={engine.PLAYERS.length} />
            <StatTile label="Best net rating" value={`${best.abbr} ${dec(best.netRating)}`} tone="accent" />
            <StatTile label="Reigning champions"
              value={engine.RECENT_FINALS?.[0]?.champion ?? '—'}
              hint={`${engine.RECENT_FINALS?.[0]?.year ?? ''} · ${engine.RECENT_FINALS?.[0]?.finalsMvp ?? ''}`} />
          </motion.div>
        </motion.div>
      </section>

      {/* --------------------------------------------------------- features */}
      <section className="mt-8">
        <SectionTitle title="What's inside"
          sub={`Nine tools, one data layer — every number on the site describes the ${engine.SEASON_LABEL} season.`} />
        <motion.div variants={stagger} initial="hidden" animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <motion.div key={f.to} variants={riseItem}>
              <Link to={f.to} className="block h-full">
                <GlassCard hover sheen accent={f.tint} className="h-full">
                  <div className="flex h-full flex-col">
                    <span aria-hidden className="mb-3 inline-block h-8 w-8 rounded-lg"
                      style={{ background: `linear-gradient(135deg, ${f.tint}, transparent)` }} />
                    <h3 className="font-display text-xl font-bold uppercase tracking-wide">{f.title}</h3>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>
                      {f.copy}
                    </p>
                    <span className="mt-4 text-xs font-bold uppercase tracking-widest"
                      style={{ color: f.tint }}>Open →</span>
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
          <SectionTitle title="Scoring leaders" sub="Points per game, current season" />
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
                      <span className="block text-lg font-bold leading-none">{dec(p.pts)}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>PPG</span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </GlassCard>

        <GlassCard accent="#E5484D">
          <SectionTitle title="Top matchup" sub="Model output, neutral rest" />
          <div className="flex items-center justify-between gap-2 py-2">
            <TeamBlock abbr={matchup.home.abbr} teamId={matchup.home.teamId}
              pts={matchup.projection.homePts.mean} />
            <span className="headline text-2xl" style={{ color: 'var(--text-muted)' }}>vs</span>
            <TeamBlock abbr={matchup.away.abbr} teamId={matchup.away.teamId}
              pts={matchup.projection.awayPts.mean} />
          </div>
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row k="Home win probability" v={`${(matchup.projection.homeWinProb * 100).toFixed(1)}%`} />
            <Row k="Spread" v={dec(matchup.projection.spread)} />
            <Row k="Total" v={dec(matchup.projection.total.mean)} />
            <Row k="Possessions" v={dec(matchup.projection.possessions)} />
          </dl>
          <Link to="/predict/team"
            className="mt-4 block rounded-xl layer-1 py-2.5 text-center text-xs font-bold
                       uppercase tracking-widest transition-colors hover-layer-2">
            Run your own
          </Link>
        </GlassCard>
      </section>
    </PageTransition>
  )
}

function TeamBlock({ abbr, teamId, pts }: { abbr: string; teamId: number; pts: number }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1">
      <TeamLogo teamId={teamId} abbr={abbr} size={46} />
      <span className="headline text-lg">{abbr}</span>
      <span className="num text-3xl font-bold">{pts.toFixed(0)}</span>
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
