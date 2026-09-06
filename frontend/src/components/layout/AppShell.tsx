import { useEffect, useRef, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import clsx from 'clsx'
import { useTheme } from '@/store/theme'
import { SEASON_LABEL } from '@/lib/api'
import * as engine from '@/lib/engine'
import { TeamLogo } from '@/components/ui/Media'
import { useI18n, LOCALES, type Dict } from '@/i18n'

/** Nav order is fixed; the label is looked up per render so it follows the
 *  language without the routes moving around. */
const NAV: Array<{ to: string; key: keyof Dict['nav']; end?: boolean; group: string }> = [
  { to: '/', key: 'home', end: true, group: 'main' },
  { to: '/players', key: 'players', group: 'main' },
  { to: '/rookies', key: 'rookies', group: 'main' },
  { to: '/teams', key: 'teams', group: 'main' },
  { to: '/season', key: 'season', group: 'main' },
  { to: '/compare', key: 'compare', group: 'lab' },
  { to: '/head-to-head', key: 'h2h', group: 'lab' },
  { to: '/predict/player', key: 'projection', group: 'lab' },
  { to: '/predict/team', key: 'forecast', group: 'lab' },
  { to: '/simulate', key: 'gameSim', group: 'lab' },
  { to: '/builder', key: 'builder', group: 'lab' },
  { to: '/league', key: 'leagueSim', group: 'lab' },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme()
  const { t } = useI18n()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setMenuOpen(false); window.scrollTo({ top: 0 }) }, [location.pathname])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-50">
        {/* The team-colour rail: a thin strip of all 30 primary colours, the
            way a broadcast bug carries league identity. */}
        <div aria-hidden className="flex h-[3px] w-full">
          {engine.TEAMS.map((t) => (
            <span key={t.abbr} className="flex-1" style={{ background: t.primaryColor }} />
          ))}
        </div>

        <div
          className={clsx('transition-all duration-300',
            scrolled ? 'backdrop-blur-xl' : '')}
          style={{
            // Opaque once scrolled: a translucent bar over a dense table makes
            // both unreadable, which is worse than losing the glass effect.
            background: scrolled
              ? 'color-mix(in srgb, var(--bg) 97%, transparent)'
              : 'color-mix(in srgb, var(--bg) 35%, transparent)',
            borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
            boxShadow: scrolled ? '0 12px 30px -18px rgba(0,0,0,.9)' : 'none',
          }}
        >
          <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2.5 sm:px-6 lg:px-8">
            <Wordmark />

            <nav className="ml-1 hidden flex-1 items-center gap-0 xl:flex">
              {NAV.map((item, i) => (
                <span key={item.to} className="flex items-center">
                  {i > 0 && NAV[i - 1].group !== item.group && (
                    <span aria-hidden className="mx-1.5 h-4 w-px"
                      style={{ background: 'var(--border-strong)' }} />
                  )}
                  <NavLink to={item.to} end={item.end}
                    className={({ isActive }) => clsx(
                      'relative whitespace-nowrap rounded-lg px-2 py-2 text-[12px] font-semibold uppercase tracking-tight transition-colors',
                      isActive ? 'text-[var(--text)]' : 'text-[var(--text-2)] hover:text-[var(--text)]')}
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span layoutId="nav-pill"
                            className="absolute inset-0 rounded-lg"
                            style={{
                              background: 'linear-gradient(180deg, color-mix(in srgb, var(--brand-lit) 26%, transparent), transparent)',
                              boxShadow: 'inset 0 -2px 0 0 var(--brand-lit)',
                            }}
                            transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
                        )}
                        <span className="relative z-10">{t.nav[item.key]}</span>
                      </>
                    )}
                  </NavLink>
                </span>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <SeasonChip />
              <LanguageSwitch />
              <button
                onClick={toggle}
                aria-label={theme === 'dark' ? t.shell.themeToLight : t.shell.themeToDark}
                className="glass grid h-9 w-9 place-items-center rounded-lg transition-colors hover-layer-2"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={theme}
                    initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
                    transition={{ duration: 0.22 }}
                  >
                    {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                  </motion.span>
                </AnimatePresence>
              </button>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={t.nav.menu} aria-expanded={menuOpen}
                className="glass grid h-9 w-9 place-items-center rounded-lg xl:hidden"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={menuOpen ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
                </svg>
              </button>
            </div>
          </div>

          <StandingsTicker />
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-b backdrop-blur-xl xl:hidden"
              style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--bg) 94%, transparent)' }}
            >
              <ul className="mx-auto grid max-w-[1600px] grid-cols-2 gap-1 px-4 py-3 sm:px-6">
                {NAV.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.end}
                      className={({ isActive }) => clsx(
                        'block rounded-lg px-3 py-2.5 text-sm font-semibold',
                        isActive ? 'layer-2 text-[var(--text)]' : 'text-[var(--text-2)]')}>
                      {t.nav[item.key]}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {children}

      <Footer />
    </div>
  )
}

function Wordmark() {
  const navigate = useNavigate()
  return (
    <button onClick={() => navigate('/')} className="group flex shrink-0 items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center">
        <span className="absolute inset-0 rounded-full border-2 border-[var(--brand-lit)]/45
                         transition-transform duration-500 group-hover:rotate-180" />
        <span className="absolute inset-[5px] rounded-full border border-[var(--accent-lit)]/60" />
        <span className="h-2 w-2 rounded-full bg-gradient-to-br from-[#3B82F6] to-[#C8102E]
                         shadow-[0_0_14px_3px_rgba(59,130,246,.55)]" />
      </span>
      <span className="headline text-xl leading-none tracking-tight">
        NBA<span className="text-[var(--accent-lit)]">·</span>VISION
      </span>
    </button>
  )
}

/** The season the whole site is describing. Every stat, projection and price on
 *  the site is for this season — saying so once, in the chrome, means no page
 *  has to caveat itself. */
function SeasonChip() {
  const { t } = useI18n()
  return (
    <span className="hidden items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 ring-1 lg:inline-flex"
      style={{ background: 'var(--layer-1)', borderColor: 'var(--border)',
               boxShadow: 'inset 0 0 0 1px var(--border)' }}>
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-lit)] animate-pulseGlow" />
      <span className="num text-[11px] font-bold tracking-wider">{SEASON_LABEL}</span>
      <span className="hidden text-[10px] font-semibold uppercase tracking-widest 2xl:inline"
        style={{ color: 'var(--text-muted)' }}>{t.shell.seasonWord}</span>
    </span>
  )
}

/** A slow marquee of the league table. Pure chrome, but it is the thing that
 *  makes the page feel like a sports product rather than a dashboard. */
function StandingsTicker() {
  const { f } = useI18n()
  const ref = useRef<HTMLDivElement>(null)
  const teams = [...engine.TEAMS].sort((a, b) => b.winPct - a.winPct)
  const row = [...teams, ...teams]   // duplicated so the loop is seamless
  return (
    <div className="relative hidden overflow-hidden border-t md:block"
      style={{ borderColor: 'var(--border)' }}>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16"
        style={{ background: 'linear-gradient(90deg, var(--bg), transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16"
        style={{ background: 'linear-gradient(270deg, var(--bg), transparent)' }} />
      <div ref={ref} className="flex w-max animate-marquee gap-6 py-1.5">
        {row.map((t, i) => (
          <NavLink key={`${t.abbr}-${i}`} to={`/teams/${t.abbr}`}
            className="flex shrink-0 items-center gap-1.5 text-[11px] transition-opacity hover:opacity-100"
            style={{ opacity: 0.72 }}>
            <TeamLogo teamId={t.teamId} abbr={t.abbr} size={14} />
            <span className="num font-bold">{t.abbr}</span>
            <span className="num" style={{ color: 'var(--text-muted)' }}>{t.wins}-{t.losses}</span>
            <span className="num font-semibold"
              style={{ color: t.netRating >= 0 ? 'var(--good)' : 'var(--bad)' }}>
              {f.signed(t.netRating)}
            </span>
          </NavLink>
        ))}
      </div>
    </div>
  )
}

function Footer() {
  const { t, f } = useI18n()
  const champs = engine.RECENT_FINALS?.[0]
  return (
    <footer className="mt-16 border-t py-8" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl text-xs" style={{ color: 'var(--text-muted)' }}>
            <p className="mb-1">
              <b className="text-[var(--text-2)]">{t.shell.footerTitle}</b> {t.shell.footerTagline}
            </p>
            <p>{t.shell.footerBody(SEASON_LABEL)}</p>
          </div>
          {champs && (
            <div className="text-right text-xs">
              <p className="eyebrow mb-1">{t.shell.reigningChampions}</p>
              <p className="flex items-center justify-end gap-2">
                <TeamLogo teamId={engine.getTeam(champs.champion)?.teamId ?? 0} abbr={champs.champion} size={22} />
                <span className="headline text-lg">{engine.getTeam(champs.champion)?.fullName}</span>
              </p>
              <p style={{ color: 'var(--text-muted)' }}>
                {champs.year} · {t.shell.finalsMvpShort(champs.finalsMvp)}
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 num text-[10px]" style={{ color: 'var(--text-muted)' }}>
          {t.shell.leagueAverage(f.dec(113.5), f.dec(99.2))}
        </p>
      </div>
    </footer>
  )
}

/**
 * EN / ES.
 *
 * A two-state segmented control rather than a dropdown: with exactly two
 * languages, a menu costs a click to show what a pair of chips already says,
 * and the label of the language you are *not* in is the useful affordance.
 */
function LanguageSwitch() {
  const { locale, setLocale, t } = useI18n()
  return (
    <div role="group" aria-label={t.shell.languageLabel}
      className="glass relative flex h-9 items-center rounded-lg p-0.5">
      {LOCALES.map((l) => {
        const active = l.code === locale
        return (
          <button key={l.code} onClick={() => setLocale(l.code)}
            aria-pressed={active}
            aria-label={l.code === 'es' ? t.shell.switchToSpanish : t.shell.switchToEnglish}
            title={l.native}
            className={clsx(
              'relative z-10 h-8 rounded-md px-1.5 text-[11px] font-bold uppercase tracking-wider transition-colors',
              active ? 'text-white' : 'text-[var(--text-2)] hover:text-[var(--text)]')}
          >
            {active && (
              <motion.span layoutId="lang-pill" aria-hidden
                className="absolute inset-0 rounded-md"
                style={{ background: 'linear-gradient(135deg, var(--brand), var(--brand-lit))',
                         boxShadow: '0 4px 14px -6px var(--brand-lit)' }}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative z-10">{l.flag}</span>
          </button>
        )
      })}
    </div>
  )
}

const SunIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
  </svg>
)
