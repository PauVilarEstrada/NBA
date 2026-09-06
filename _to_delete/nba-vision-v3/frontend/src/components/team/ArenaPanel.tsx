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
import * as engine from '@/lib/engine'
import { shortDate } from '@/lib/format'
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
  const v = team.venue
  const t = team.tickets
  const games = team.recentHomeGames ?? []

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
            <p className="eyebrow">Home floor · {v.city}, {v.region}</p>
            <h2 className="headline mt-1 text-[clamp(1.75rem,5vw,3.75rem)]">{v.arena}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="brand">Opened {v.opened}</Badge>
              <Badge>{v.age} years old</Badge>
              <Badge>Capacity {v.capacity.toLocaleString()}</Badge>
              <Badge tone={fillPct >= 97 ? 'good' : fillPct >= 90 ? 'neutral' : 'bad'}>
                {fillPct}% full
              </Badge>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <BigTile label="Average crowd" value={v.averageAttendance} decimals={0}
                rank={team.attendanceRank}
                caption={`${v.vsLeagueAvg >= 0 ? '+' : ''}${v.vsLeagueAvg.toLocaleString()} vs league`} />
              <BigTile label="Season total" value={v.totalAttendance / 1000} decimals={0} suffix="k"
                caption={`${v.homeGames} home games`} />
              <BigTile label="Sellouts" value={v.sellouts} decimals={0}
                caption={`of ${v.homeGames} home dates`} />
              <BigTile label="Average ticket" value={t.averagePrice} decimals={0} prefix="$"
                rank={team.ticketPriceRank}
                caption={`get in from $${t.getInPrice}`} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ------------------------------------------------------ the gate */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartFrame
          title="Recent home dates"
          sub="Crowd and average resale price, game by game — the visitor is the biggest lever on both"
          height={300}
          series={[
            { key: 'attendance', label: 'Attendance', color: tokens.series[0] },
            { key: 'averagePrice', label: 'Average price ($)', color: tokens.series[3] },
          ]}
          table={{
            columns: ['Date', 'Opponent', 'Attendance', 'Fill', 'Avg price', 'Get-in'],
            rows: games.map((g) => [
              shortDate(g.date), g.opponent, g.attendance.toLocaleString(),
              `${(g.fillRate * 100).toFixed(1)}%`, `$${g.averagePrice}`, `$${g.getInPrice}`,
            ]),
          }}
        >
          {/* Two measures on very different scales would normally need two
              charts; here attendance is drawn as bars against its own axis and
              price as a line against a *normalised* second axis that is hidden,
              with both values always shown in the tooltip and the table. */}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={games.map((g) => ({
              label: `${shortDate(g.date)} ${g.opponent}`,
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
                      ? `$${Number(p.value).toFixed(0)}`
                      : Number(p.value).toLocaleString(),
                    color: String(p.color),
                  }))} />
                ) : null} />
              <Bar yAxisId="a" dataKey="attendance" name="Attendance" radius={[4, 4, 0, 0]}>
                {games.map((g, i) => (
                  <Cell key={i} fill={g.soldOut ? tokens.series[0] : `${tokens.series[0]}99`} />
                ))}
              </Bar>
              <Line yAxisId="b" type="monotone" dataKey="averagePrice" name="Average price ($)"
                stroke={tokens.series[3]} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartFrame>

        <GlassCard>
          <SectionTitle title="Ticket market" sub="Modelled resale pricing" />
          <div className="space-y-3">
            <PriceRow label="Get in" value={t.getInPrice} max={t.premiumPrice}
              color={tokens.series[2]} hint="cheapest seat in the building" />
            <PriceRow label="Average" value={t.averagePrice} max={t.premiumPrice}
              color={tokens.series[0]} hint="all listings" />
            <PriceRow label="Premium" value={t.premiumPrice} max={t.premiumPrice}
              color={tokens.series[1]} hint="lower bowl, marquee visitor" />
          </div>
          <dl className="mt-4 space-y-2 border-t pt-3 text-sm" style={{ borderColor: 'var(--border)' }}>
            <Row k="League average ticket" v={`$${Math.round(leagueAvgPrice)}`} />
            <Row k="This team vs league" v={`${t.vsLeagueAvg >= 0 ? '+' : ''}$${t.vsLeagueAvg}`}
              tone={t.vsLeagueAvg >= 0 ? 'var(--good)' : 'var(--bad)'} />
            <Row k="Price rank" v={`#${team.ticketPriceRank} of 30`} />
            <Row k="Market size rank" v={`#${v.marketRank} of 30`} />
            <Row k="Demand index" v={`${(v.demandIndex * 100).toFixed(0)} / 100`} />
          </dl>
        </GlassCard>

        <GlassCard>
          <SectionTitle title="How full it gets" sub="Against capacity and the league" />
          <FillGauge fill={v.fillRate} color={team.primaryColor} />
          <dl className="mt-4 space-y-2 text-sm">
            <Row k="Listed capacity" v={v.capacity.toLocaleString()} />
            <Row k="Average crowd" v={v.averageAttendance.toLocaleString()} />
            <Row k="Empty seats a night" v={Math.max(0, v.capacity - v.averageAttendance).toLocaleString()} />
            <Row k="League average" v={Math.round(leagueAvgAttendance).toLocaleString()} />
            <Row k="Attendance rank" v={`#${team.attendanceRank} of 30`} />
          </dl>
        </GlassCard>
      </div>

      {/* ------------------------------------------------- league context */}
      <ChartFrame
        title="Attendance across the league"
        sub="Average crowd per home game, this team highlighted"
        height={320}
        table={{
          columns: ['Team', 'Arena', 'Capacity', 'Average', 'Fill'],
          rows: [...leagueTeams].sort((a, b) => b.venue.averageAttendance - a.venue.averageAttendance)
            .map((x) => [x.abbr, x.venue.arena, x.venue.capacity.toLocaleString(),
              x.venue.averageAttendance.toLocaleString(), `${(x.venue.fillRate * 100).toFixed(1)}%`]),
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
                  rows={[{ label: 'Average crowd', value: Number(payload[0].value).toLocaleString() }]} />
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
        Arena name, capacity, opening year and location are facts. <b>Attendance and ticket prices
        are modelled</b> — from capacity, win rate, market size, arena age and the visiting team's
        draw — and anchored to the public league averages (about 18,300 a night at roughly 95% of
        capacity). The NBA publishes no free per-game gate feed and resale pricing sits behind paid
        APIs; connect one through the ingest job and these panels fill from source instead.
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
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="num text-lg font-bold" style={{ color }}>${value}</span>
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
  const pctFull = Math.min(100, fill * 100)
  const radius = 62
  const circumference = Math.PI * radius     // half circle
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 92" className="w-full max-w-[220px]" role="img"
        aria-label={`${pctFull.toFixed(1)} percent of capacity`}>
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
          {pctFull.toFixed(1)}%
        </text>
      </svg>
      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>of listed capacity</p>
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
