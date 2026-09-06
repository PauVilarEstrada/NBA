import {
  Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ChartFrame, TooltipBox, useAxis, type SeriesDef } from './ChartFrame'

/** Grouped horizontal bars. Horizontal because the category labels are words
 *  (PTS, REB, TS%) and rotated x-labels are a readability tax. */
export function CompareBars({
  title, sub, data, series, height = 300, table,
}: {
  title: string
  sub?: string
  data: Array<Record<string, string | number>>
  series: SeriesDef[]
  height?: number
  table?: { columns: string[]; rows: Array<Array<string | number>> }
}) {
  const AXIS = useAxis()
  return (
    <ChartFrame title={title} sub={sub} series={series} height={height} table={table}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" barGap={2} barCategoryGap={14}
          margin={{ top: 4, right: 42, bottom: 4, left: 6 }}>
          <CartesianGrid stroke={AXIS.grid} horizontal={false} />
          <XAxis type="number" tick={AXIS.tick} stroke={AXIS.stroke} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="label" tick={{ ...AXIS.tick, fontSize: 12 }}
            stroke={AXIS.stroke} tickLine={false} axisLine={false} width={74} />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color}
              radius={[0, 4, 4, 0]} isAnimationActive animationDuration={620}
              animationBegin={i * 90}>
              {/* direct labels: identity never rests on colour alone */}
              <LabelList dataKey={s.key} position="right"
                style={{ fill: AXIS.tick.fill, fontSize: 10, fontVariantNumeric: 'tabular-nums' }} />
            </Bar>
          ))}
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,.05)' }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={payload.map((p) => ({
                    label: String(p.name), value: String(p.value), color: String(p.color),
                  }))}
                />
              ) : null}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
