import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { ChartFrame, TooltipBox, useAxis, type SeriesDef } from './ChartFrame'

export function TrendLine({
  title, sub, data, xKey, series, height = 280, referenceY, referenceLabel, table,
}: {
  title: string
  sub?: string
  data: Array<Record<string, string | number>>
  xKey: string
  series: SeriesDef[]
  height?: number
  referenceY?: number
  referenceLabel?: string
  table?: { columns: string[]; rows: Array<Array<string | number>> }
}) {
  const AXIS = useAxis()
  return (
    <ChartFrame title={title} sub={sub} series={series} height={height} table={table}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -14 }}>
          <CartesianGrid stroke={AXIS.grid} vertical={false} />
          <XAxis dataKey={xKey} tick={AXIS.tick} stroke={AXIS.stroke} tickLine={false}
            minTickGap={24} />
          <YAxis tick={AXIS.tick} stroke={AXIS.stroke} tickLine={false} axisLine={false} width={44} />
          {referenceY !== undefined && (
            <ReferenceLine
              y={referenceY} stroke={AXIS.stroke} strokeDasharray="4 4"
              label={{ value: referenceLabel, position: 'insideTopRight',
                fill: AXIS.tick.fill, fontSize: 10 }}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.key} type="monotone" dataKey={s.key} name={s.label}
              stroke={s.color} strokeWidth={2}
              dot={{ r: 2.5, fill: s.color, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 2, stroke: AXIS.surface }}
              isAnimationActive animationDuration={650}
            />
          ))}
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,.22)', strokeWidth: 1 }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={payload.map((p) => ({
                    label: String(p.name), value: Number(p.value).toFixed(1), color: String(p.color),
                  }))}
                />
              ) : null}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
