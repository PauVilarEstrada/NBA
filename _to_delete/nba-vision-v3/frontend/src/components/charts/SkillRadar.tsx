import {
  PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip,
} from 'recharts'
import { ChartFrame, TooltipBox, useAxis, type SeriesDef } from './ChartFrame'

export interface RadarSeries { name: string; color: string; values: Record<string, number> }

/** Skill radar, 0-100 against a league reference on every axis.
 *  Radar only works when the axes share a scale — plotting raw PPG against raw
 *  TS% would produce a shape that means nothing. */
export function SkillRadar({
  axes, series, height = 300, title = 'Skill profile',
}: { axes: string[]; series: RadarSeries[]; height?: number; title?: string }) {
  const data = axes.map((axis) => {
    const row: Record<string, string | number> = { axis }
    series.forEach((s) => { row[s.name] = s.values[axis] ?? 0 })
    return row
  })
  const AXIS = useAxis()
  const defs: SeriesDef[] = series.map((s) => ({ key: s.name, label: s.name, color: s.color }))

  return (
    <ChartFrame
      title={title}
      sub="Each axis scaled 0-100 against a league reference"
      series={defs}
      height={height}
      table={{
        columns: ['Axis', ...series.map((s) => s.name)],
        rows: axes.map((a) => [a, ...series.map((s) => (s.values[a] ?? 0).toFixed(0))]),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke={AXIS.grid} />
          <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--text-2)', fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
          {series.map((s) => (
            <Radar
              key={s.name} name={s.name} dataKey={s.name}
              stroke={s.color} fill={s.color} fillOpacity={series.length > 1 ? 0.18 : 0.28}
              strokeWidth={2} isAnimationActive
            />
          ))}
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <TooltipBox
                  title={String(label)}
                  rows={payload.map((p) => ({
                    label: String(p.name), value: Number(p.value).toFixed(0),
                    color: String(p.color),
                  }))}
                />
              ) : null}
          />
        </RadarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
