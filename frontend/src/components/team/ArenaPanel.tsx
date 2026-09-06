import { motion } from 'framer-motion'
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge, SectionTitle } from '@/components/ui/Bits'
import { CountUp, RankChip } from '@/components/ui/Numbers'
import { ChartFrame, TooltipBox } from '@/components/charts/ChartFrame'
import { useChartTokens } from '@/lib/palette'
import { useI18n } from '@/i18n'
import * as engine from '@/lib/engine'
import type { Team } from '@/types'

/**
 * The building.
 *
 * A team page that stops at ratings misses the part a fan actually experiences:
 * where the games are played, how full it gets, and what a seat costs. The
 * arena, its capacity and its opening year are facts. Attendance and pricing
 * are **modelled** from capacity, winning, market size and the visiting team's
 * draw, anchored to the league averages that are public — and every panel here
 * says so, because a modelled number presented as a measurement is a lie.
 */
export function ArenaPanel({ team }: { team: Team }) {
  const tokens = useChartTokens()
  const { t, f } = useI18n()
  const v = team.venue
  // `t` is the dictionary, so the ticket block travels under `tk`.
  const tk = team.tickets
  const games = team.recentHomeGames ?? []
  const priceSeriesLabel = `${t.arena.averagePrice} ($)`

  const fillPct = Math.round(v.fillRate * 1000) / 10
  const leagueTeams = engine.TEAMS
  const leagueAvgAttendance =
    leagueTeams.reduce((s, x) => s + x.venue.averageAttendance, 0) / leagueTeams.length
  const leagueAvgPrice =
    leagueTeams.reduce((s, x) => s + x.tickets.averagePrice, 0) / leagueTeams.length

  return (
    <div className="space-y-4">
      {/* ---------------------------------------------------- the building */}
      <GlassCard padded={false} className="overflow-hidden">
        <div className="relative p-6 sm:p-8"
          style={{
            background: `linear-gradient(150deg, ${team.primaryColor}44, ${team.secondaryColor}18 45%, transparent 78%)`,
          }}>
          {/* A stylised bowl behind the header — the arena, drawn rather than
              photographed, so it works in both themes and needs no asset. */}
          <ArenaBowl color={team.primaryColor} secondary={team.secondaryColor}
            fill={v.fillRate} />

          <div className="relative">
            <p className="eyebrow">{t.arena.homeFloor(v.city, v.region)}</p>
            <h2 className="headline mt-1 text-[clamp(1.75rem,5vw,3.75rem)]">{v.arena}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">{t.arena.opened(v.opened)}</Badge>
              <Badge>{t.common.yearsOld(v.age)}</Badge>
              <Badge>{t.arena.capacity(f.int(v.capacity))}</Badge>
              <Badge tone={fillPct >= 97 ? 'good' : fillPct >= 90 ? 'neutral' : 'bad'}>
                {t.arena.full(f.dec(fillPct, 1))}
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <BigTile label={t.arena.averageCrowd} value={v.averageAttendance} decimals={0}
                rank={team.attendanceRank}
                caption={t.arena.vsLeague(f.signed(v.vsLeagueAvg, 0))} />
              <BigTile label={t.arena.seasonTotal} value={v.totalAttendance / 1000} decimals={0} suffix="k"
                caption={t.arena.homeGames(v.homeGames)} />
              <BigTile label={t.arena.sellouts} value={v.sellouts} decimals={0}
                caption={t.arena.ofHomeDates(v.homeGames)} />
              <BigTile label={t.arena.averageTicket} value={tk.averagePrice} decimals={0} prefix="$"
                rank={team.ticketPriceRank}
                caption={t.arena.getInFrom(f.money(tk.getInPrice, false))} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ------------------------------------------------------ the gate */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartFrame
          title={t.arena.recentDates}
          sub={t.arena.recentDatesSub}
          height={300}
          series={[
            { key: 'attendance', label: t.arena.attendance, color: tokens.series[0] },
            { key: 'averagePrice', label: priceSeriesLabel, color: tokens.series[3] },
          ]}
          table={{
            columns: [t.abbr.date, t.h2h.opponent, t.arena.attendance, t.arena.fill,
              t.arena.averagePrice, t.arena.getIn],
            rows: games.map((g) => [
              f.shortDate(g.date), g.opponent, f.int(g.attendance),
              f.pct(g.fillRate, 1), f.money(g.averagePrice, false), f.money(g.getInPrice, false),
            ]),
          }}
        >
          {/* Two measures on very different scales would normally need two
              charts; here attendance is drawn as bars against its own axis and
              price as a line against a *normalised* second axis that is hidden,
              with both values always shown in the tooltip and the table. */}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={games.map((g) => ({
              label: `${f.shortDate(g.date)} ${g.opponent}`,
              attendance: g.attendance,
              averagePrice: g.averagePrice,
              soldOut: g.soldOut,
            }))} margin={{ top: 8, right: 12, bottom: 4, left: -14 }}>
              <CartesianGrid stroke="var(--grid)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
                tickLine={false} interval={0} angle={-12} textAnchor="end" height={46} />
              <YAxis yAxisId="a" tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickLine={false} axisLine={false} width={54}
                domain={[Math.round(v.capacity * 0.7), v.capacity]} />
              <YAxis yAxisId="b" hide domain={[0, 'dataMax + 60']} />
              <Tooltip cursor={{ fill: 'var(--layer-1)' }}
                content={({ active, payload, label }) => active && payload?.length ? (
                  <TooltipBox title={String(label)} rows={payload.map((p) => ({
                    label: String(p.name),
                    value: p.dataKey === 'averagePrice'
                      ? f.money(Number(p.value), false)
                      : f.int(Number(p.value)),
                    color: String(p.color),
                  }))} />
                ) : null} />
              <Bar yAxisId="a" dataKey="attendance" name={t.arena.attendance} radius={[4, 4, 0, 0]}>
                {games.map((g, i) => (
                  <Cell key={i} fill={g.soldOut ? tokens.series[0] : `${tokens.series[0]}99`} />
                ))}
              </Bar>
              <Line yAxisId="b" type="monotone" dataKey="averagePrice" name={priceSeriesLabel}
                stroke={tokens.series[3]} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>

        <GlassCard>
          <SectionTitle title={t.arena.ticketMarket} sub={t.arena.ticketMarketSub} />
          <div className="space-y-3">
            <PriceRow label={t.arena.getIn} value={tk.getInPrice} max={tk.premiumPrice}
              color={tokens.series[2]} hint={t.arena.cheapestSeat} />
            <PriceRow label={t.arena.average} value={tk.averagePrice} max={tk.premiumPrice}
              color={tokens.series[0]} hint={t.arena.allListings} />
            <PriceRow label={t.arena.premium} value={tk.premiumPrice} max={tk.premiumPrice}
              color={tokens.series[1]} hint={t.arena.lowerBowl} />
          </div>
          <dl className="mt-4 space-y-2 border-t pt-3 text-sm" style={{ borderColor: 'var(--border)' }}>
            <Row k={t.arena.leagueAvgTicket} v={f.money(Math.round(leagueAvgPrice), false)} />
            <Row k={t.arena.vsLeagueRow}
              v={`${tk.vsLeagueAvg >= 0 ? '+' : ''}${f.money(tk.vsLeagueAvg, false)}`}
              tone={tk.vsLeagueAvg >= 0 ? 'var(--good)' : 'var(--bad)'} />
            <Row k={t.arena.priceRank} v={t.common.rank(`#${team.ticketPriceRank}`, 30)} />
            <Row k={t.arena.marketSizeRank} v={t.common.rank(`#${v.marketRank}`, 30)} />
            <Row k={t.arena.demandIndex} v={`${f.dec(v.demandIndex * 100, 0)} / 100`} />
          </dl>
        </GlassCard>

        <GlassCard>
          <SectionTitle title={t.arena.howFull} sub={t.arena.howFullSub} />
          <FillGauge fill={v.fillRate} color={team.primaryColor} />
          <dl className="mt-4 space-y-2 text-sm">
            <Row k={t.arena.listedCapacity} v={f.int(v.capacity)} />
            <Row k={t.arena.averageCrowd} v={f.int(v.averageAttendance)} />
            <Row k={t.arena.emptySeats} v={f.int(Math.max(0, v.capacity - v.averageAttendance))} />
            <Row k={t.arena.leagueAverage} v={f.int(Math.round(leagueAvgAttendance))} />
            <Row k={t.arena.attendanceRank} v={t.common.rank(`#${team.attendanceRank}`, 30)} />
          </dl>
        </GlassCard>
      </div>

      {/* ------------------------------------------------- league context */}
      <ChartFrame
        title={t.arena.acrossLeague}
        sub={t.arena.acrossLeagueSub}
        height={320}
        table={{
          columns: [t.abbr.team, t.arena.arenaCol, t.arena.capacityCol, t.arena.averageCol, t.arena.fill],
          rows: [...leagueTeams].sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
            .map((x) => [x.abbr, x.venue.arena, f.int(x.venue.capacity),
              f.int(x.venue.averageAttendance), f.pct(x.venue.fillRate, 1)]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={[...leagueTeams]
              .sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
              .map((x) => ({ abbr: x.abbr, value: x.venue.averageAttendance, me: x.abbr === team.abbr }))}
            margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid stroke="var(--grid)" vertical={false} />
            <XAxis dataKey="abbr" tick={{ fill: 'var(--text-muted)', fontSize: 9 }}
              tickLine={false} interval={0} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false}
              axisLine={false} width={54} domain={[14000, 'dataMax + 500']} />
            <Tooltip cursor={{ fill: 'var(--layer-1)' }}
              content={({ active, payload, label }) => active && payload?.length ? (
                <TooltipBox title={String(label)}
                  rows={[{ label: t.arena.averageCrowd, value: f.int(Number(payload[0].value)) }]} />
              ) : null} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {[...leagueTeams].sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
                .map((x, i) => (
                  <Cell key={i}
                    fill={x.abbr === team.abbr ? team.primaryColor : 'var(--layer-3)'} />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>

      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {t.arena.disclaimer}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------- pieces
function ArenaBowl({ color, secondary, fill }: { color: string; secondary: string; fill: number }) {
  const seats = 3
  return (
    <svg aria-hidden viewBox="0 0 400 160"
      className="pointer-events-none absolute inset-x-0 bottom-0 h-40 w-full opacity-[.16]"
      preserveAspectRatio="none">
      {Array.from({ length: seats }).map((_, i) => {
        const inset = 30 + i * 34
        const lit = (seats - i) / seats <= fill
        return (
          <path key={i}
            d={`M ${inset} 160 Q 200 ${40 + i * 18} ${400 - inset} 160 Z`}
            fill="none"
            stroke={lit ? color : secondary}
            strokeWidth={10}
            strokeOpacity={lit ? 0.9 : 0.35}
          />
        )
      })}
      {/* the floor */}
      <ellipse cx="200" cy="152" rx="86" ry="20" fill={color} fillOpacity={0.55} />
      <ellipse cx="200" cy="152" rx="26" ry="7" fill="none" stroke={secondary} strokeWidth={2} />
    </svg>
  )
}

function BigTile({ label, value, decimals = 0, prefix = '', suffix = '', rank, caption }: {
  label: string; value: number; decimals?: number; prefix?: string; suffix?: string
  rank?: number; caption?: string
}) {
  return (
    <div className="glass rounded-xl px-3 py-3">
      <p className="eyebrow">{label}</p>
      <p className="text-2xl font-bold leading-none sm:text-3xl">
        <CountUp value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </p>
      {rank && <div className="mt-1.5"><RankChip rank={rank} /></div>}
      {caption && <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>{caption}</p>}
    </div>
  )
}

function PriceRow({ label, value, max, color, hint }: {
  label: string; value: number; max: number; color: string; hint: string
}) {
  const { f } = useI18n()
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="num text-lg font-bold" style={{ color }}>{f.money(value, false)}</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full" style={{ background: 'var(--layer-2)' }}>
        <motion.span className="block h-full rounded-full"
          initial={{ width: 0 }} whileInView={{ width: `${(value / max) * 100}%` }}
          viewport={{ once: true }} transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ background: color }} />
      </div>
      <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>
    </div>
  )
}

function FillGauge({ fill, color }: { fill: number; color: string }) {
  const { t, f } = useI18n()
  const pctFull = Math.min(100, fill * 100)
  const radius = 62
  const circumference = Math.PI * radius     // half circle
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 92" className="w-full max-w-[220px]" role="img"
        aria-label={`${f.dec(pctFull, 1)}% ${t.arena.ofCapacity}`}>
        <path d={`M 18 82 A ${radius} ${radius} 0 0 1 142 82`} fill="none"
          stroke="var(--layer-2)" strokeWidth={16} strokeLinecap="round" />
        <motion.path d={`M 18 82 A ${radius} ${radius} 0 0 1 142 82`} fill="none"
          stroke={color} strokeWidth={16} strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          whileInView={{ strokeDashoffset: circumference * (1 - pctFull / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }} />
        <text x="80" y="74" textAnchor="middle" className="num"
          style={{ fill: 'var(--text)', fontSize: 26, fontWeight: 700 }}>
          {f.dec(pctFull, 1)}%
        </text>
      </svg>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.arena.ofCapacity}</p>
    </div>
  )
}

function Row({ k, v, tone }: { k: string; v: string; tone?: string }) {
  return (
    <div className="flex justify-between border-b pb-1.5" style={{ borderColor: 'var(--border)' }}>
      <dt style={{ color: 'var(--text-2)' }}>{k}</dt>
      <dd className="num font-bold" style={{ color: tone }}>{v}</dd>
    </div>
  )
}
