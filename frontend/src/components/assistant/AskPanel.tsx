/**
 * The in-page assistant.
 *
 * A floating button on player and team pages only, opening a panel that answers
 * questions about *that* subject and nothing else. There is no model and no
 * network call: the answers come from `lib/assistant`, which reads the same
 * objects the page renders, so the panel can never contradict the charts above
 * it. That is also why it is instant and works offline.
 *
 * Assistant turns are stored as `Reply` objects rather than as text, so
 * switching the language re-renders the whole conversation — including answers
 * given before the switch — instead of leaving English sitting in the log.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useI18n, type Dict } from '@/i18n'
import { answer, answerIntent, greet, suggestionsFor, SUGGESTION_INTENT } from '@/lib/assistant/answer'
import type { ChatMessage, Chip, Reply, Say, Subject } from '@/lib/assistant/types'
import type { ReportNote } from '@/lib/season'

/** Writes one line in the active language. The pairing of key and arguments is
 *  guaranteed by the `Say` union, so the cast only erases the per-key overload
 *  the compiler cannot express at the call site. */
function sentence(line: Say, t: Dict): string {
  const fn = t.assistant.say[line.k] as (a: unknown) => string
  return fn(line.a)
}

/** Reuses the scouting report's translated threshold sentences. */
function note(n: ReportNote, t: Dict): string {
  const r = t.scouting.report
  switch (n.k) {
    case 'scoring': return r.scoring(n.top, n.ppg)
    case 'efficiency': return r.efficiency(n.ts, n.usg)
    case 'creation': return r.creation(n.pctile, n.ast)
    case 'rebounding': return r.rebounding(n.reb, n.pctile)
    case 'defence': return r.defence(n.stl, n.blk)
    case 'spacing': return r.spacing(n.pct)
    case 'noStrength': return r.noStrength
    case 'lowEfficiency': return r.lowEfficiency(n.ts)
    case 'turnovers': return r.turnovers(n.tov)
    case 'coldShooting': return r.coldShooting(n.fg3a, n.pct)
    case 'lowRebounding': return r.lowRebounding
    case 'age': return r.age(n.age)
    case 'overpaid': return r.overpaid(n.m)
    case 'noConcerns': return r.noConcerns
  }
}

/** Chip labels come from the stat vocabulary the rest of the site already uses. */
function chipLabel(key: string, t: Dict): string {
  const stat = t.stat as Record<string, string>
  const team = t.team as unknown as Record<string, string>
  const arena = t.arena as unknown as Record<string, string>
  return stat[key] ?? team[key] ?? arena[key] ?? key.toUpperCase()
}

export function AskPanel({ subject, color }: { subject: Subject; color: string }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const nextId = useRef(1)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const subjectKey = subject.kind === 'player' ? `p${subject.id}` : `t${subject.abbr}`

  // A new page is a new conversation. Keeping the old one would leave answers
  // about a different player sitting above the greeting for this one.
  useEffect(() => {
    setMessages([{ id: 0, role: 'assistant', reply: greet(subject) }])
    nextId.current = 1
    setInput('')
    setOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectKey])

  useEffect(() => {
    if (!open) return
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, open, thinking])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const push = (msg: Omit<ChatMessage, 'id'>) =>
    setMessages((m) => [...m, { ...msg, id: nextId.current++ }])

  /** A short pause before the reply. The rules answer in under a millisecond,
   *  and a reply that appears in the same frame as the question reads as a
   *  glitch rather than as an answer. */
  const reply = (produce: () => Reply) => {
    setThinking(true)
    window.setTimeout(() => {
      push({ role: 'assistant', reply: produce() })
      setThinking(false)
    }, 320)
  }

  const send = (text: string) => {
    const q = text.trim()
    if (!q || thinking) return
    push({ role: 'user', text: q })
    setInput('')
    reply(() => answer(q, subject))
  }

  const ask = (key: keyof Dict['assistant']['suggest']) => {
    if (thinking) return
    push({ role: 'user', text: t.assistant.suggest[key] })
    reply(() => answerIntent(SUGGESTION_INTENT[key], subject))
  }

  const title = subject.kind === 'player'
    ? t.assistant.titlePlayer(subject.name)
    : t.assistant.titleTeam(subject.name)
  const scope = subject.kind === 'player'
    ? t.assistant.scopePlayer(subject.name)
    : t.assistant.scopeTeam(subject.name)

  const starters = useMemo(() => suggestionsFor(subject).slice(0, 4), [subject])

  return (
    <>
      {/* ------------------------------------------------------------- fab */}
      <motion.button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t.assistant.close : t.assistant.open}
        aria-expanded={open}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 0.35 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-5 right-5 z-[60] grid h-14 w-14 place-items-center rounded-full text-white shadow-2xl"
        style={{
          background: `linear-gradient(140deg, ${color}, var(--brand))`,
          boxShadow: `0 14px 40px -12px ${color}, 0 0 0 1px rgba(255,255,255,.14) inset`,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span key={open ? 'x' : 'chat'}
            initial={{ opacity: 0, rotate: -40, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 40, scale: 0.6 }}
            transition={{ duration: 0.18 }}>
            {open ? <CloseIcon /> : <ChatIcon />}
          </motion.span>
        </AnimatePresence>
      </motion.button>

      {/* ----------------------------------------------------------- panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog" aria-label={title}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-24 right-5 z-[60] flex max-h-[min(680px,calc(100vh-8rem))]
                       w-[min(26rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl
                       border backdrop-blur-2xl"
            style={{
              borderColor: 'var(--border)',
              background: 'color-mix(in srgb, var(--bg) 94%, transparent)',
              boxShadow: '0 32px 80px -32px rgba(0,0,0,.85)',
            }}
          >
            <header className="shrink-0 border-b px-4 py-3"
              style={{
                borderColor: 'var(--border)',
                background: `linear-gradient(140deg, ${color}2E, transparent 78%)`,
              }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="headline truncate text-base leading-tight">{title}</p>
                  <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {scope}
                  </p>
                </div>
                <span className="shrink-0 rounded-md px-1.5 py-1 text-[9px] font-bold uppercase tracking-wider"
                  style={{ background: 'var(--layer-2)', color: 'var(--text-muted)' }}>
                  {t.assistant.localBadge}
                </span>
              </div>
            </header>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
              aria-live="polite">
              {messages.map((m) => (
                <Bubble key={m.id} message={m} t={t} color={color} onAsk={ask} />
              ))}

              {thinking && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-[11px]"
                  style={{ color: 'var(--text-muted)' }}>
                  <Dots color={color} />
                  {t.assistant.thinking}
                </motion.p>
              )}

              {messages.length <= 1 && !thinking && (
                <div className="pt-1">
                  <p className="eyebrow mb-2">{t.assistant.suggestionsTitle}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {starters.map((s) => (
                      <SuggestChip key={s} label={t.assistant.suggest[s]} onClick={() => ask(s)} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className="shrink-0 border-t p-3" style={{ borderColor: 'var(--border)' }}>
              <form
                onSubmit={(e) => { e.preventDefault(); send(input) }}
                className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={t.assistant.placeholder}
                  aria-label={t.assistant.placeholder}
                  className="min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm outline-none ring-1 transition-shadow
                             focus:ring-2"
                  style={{
                    background: 'var(--layer-1)',
                    boxShadow: 'inset 0 0 0 1px var(--border)',
                    color: 'var(--text)',
                  }}
                />
                <button type="submit" disabled={!input.trim() || thinking}
                  aria-label={t.assistant.send}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition-transform
                             disabled:cursor-not-allowed disabled:opacity-40 enabled:hover:-translate-y-0.5"
                  style={{ background: `linear-gradient(140deg, ${color}, var(--brand))` }}>
                  <SendIcon />
                </button>
              </form>
              <p className="mt-2 text-[10px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {t.assistant.localNote}
              </p>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

// ----------------------------------------------------------------- pieces

function Bubble({ message, t, color, onAsk }: {
  message: ChatMessage
  t: Dict
  color: string
  onAsk: (k: keyof Dict['assistant']['suggest']) => void
}) {
  if (message.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-sm text-white"
          style={{ background: `linear-gradient(140deg, ${color}, var(--brand))` }}>
          {message.text}
        </p>
      </motion.div>
    )
  }

  const r = message.reply
  if (!r) return null

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="max-w-[94%] space-y-2 rounded-2xl rounded-bl-sm px-3 py-2.5"
      style={{
        background: r.refusal
          ? 'color-mix(in srgb, var(--bad) 12%, var(--layer-1))'
          : 'var(--layer-1)',
        boxShadow: 'inset 0 0 0 1px var(--border)',
      }}>

      {r.archetype && (
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `color-mix(in srgb, ${color} 22%, transparent)`, color: 'var(--text)' }}>
            {t.scouting.archetypes[r.archetype]}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {t.scouting.archetypes[`${r.archetype}Detail` as keyof typeof t.scouting.archetypes]}
          </span>
        </p>
      )}

      {r.lines.map((line, i) => (
        <p key={i} className="text-[13px] leading-relaxed" style={{ color: 'var(--text-2)' }}>
          {sentence(line, t)}
        </p>
      ))}

      {r.notes?.length ? (
        <ul className="space-y-1 pt-0.5">
          {r.notes.map((n, i) => (
            <li key={i} className="flex gap-2 text-[13px] leading-relaxed"
              style={{ color: 'var(--text-2)' }}>
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: color }} />
              {note(n, t)}
            </li>
          ))}
        </ul>
      ) : null}

      {r.chips?.length ? (
        <div className="grid gap-1.5 pt-1 sm:grid-cols-2">
          {r.chips.map((c) => <StatChip key={c.label} chip={c} t={t} />)}
        </div>
      ) : null}

      {r.link && (
        <Link to={r.link.to}
          className="mt-1 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition-colors"
          style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, color: 'var(--text)' }}>
          {t.assistant.goToPage(r.link.label)}
        </Link>
      )}

      {r.followUps?.length ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {r.followUps.map((s) => (
            <SuggestChip key={s} label={t.assistant.suggest[s]} onClick={() => onAsk(s)} />
          ))}
        </div>
      ) : null}
    </motion.div>
  )
}

function StatChip({ chip, t }: { chip: Chip; t: Dict }) {
  const tone = chip.tone === 'good' ? 'var(--good)'
    : chip.tone === 'bad' ? 'var(--bad)' : 'var(--brand-lit)'
  return (
    <div className="rounded-lg px-2 py-1.5" style={{ background: 'var(--layer-2)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}>
          {chipLabel(chip.label, t)}
        </span>
        <span className="num text-sm font-bold">{chip.value}</span>
      </div>
      {chip.percentile !== undefined && (
        <div className="mt-1 h-1 overflow-hidden rounded-full" style={{ background: 'var(--layer-3)' }}>
          <motion.span className="block h-full rounded-full"
            initial={{ width: 0 }} animate={{ width: `${Math.max(3, chip.percentile)}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            style={{ background: tone }} />
        </div>
      )}
    </div>
  )
}

function SuggestChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors hover-layer-2"
      style={{ background: 'var(--layer-2)', color: 'var(--text-2)' }}>
      {label}
    </button>
  )
}

function Dots({ color }: { color: string }) {
  return (
    <span className="flex gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="h-1.5 w-1.5 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [0.25, 1, 0.25] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  )
}

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.9"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9.5 9.5 0 0 1-3.6-.7L3 21l1.9-5A8.2 8.2 0 0 1 4 11.5 8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z" />
    <path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01" />
  </svg>
)
const CloseIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)
const SendIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h13M13 6l6 6-6 6" />
  </svg>
)
