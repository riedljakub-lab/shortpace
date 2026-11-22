import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  LineChart,
  Rectangle,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type BarShapeProps,
} from 'recharts'
import { runTypeLabel } from '../../config/runTypes'
import type { KmGap, PacePoint, TypeGap, WeekKm, WeekLongest } from '../../domain/dashboard'
import { formatShortDate } from '../../domain/dates'
import { formatKm, formatPace } from '../../domain/pace'
import type { ChartColors } from './chartTheme'
import { TooltipBox } from './ChartCard'
import { signedSec } from './format'

const reducedMotion = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

const SIZE = { width: 600, height: 256 } // first render size before measuring (and in tests)
const MARGIN = { top: 12, right: 12, bottom: 4, left: 0 }
const TICK = { fontSize: 12 }

/** Rounded at the data end, square at the zero line (works for negative values too). */
function SignedBar(props: BarShapeProps & { horizontal?: boolean }) {
  const value = Number(props.value ?? 0)
  const { horizontal, ...rest } = props
  const radius: [number, number, number, number] = horizontal
    ? value >= 0
      ? [0, 4, 4, 0]
      : [4, 0, 0, 4]
    : value >= 0
      ? [4, 4, 0, 0]
      : [0, 0, 4, 4]
  return <Rectangle {...rest} radius={radius} />
}

function axisProps(c: ChartColors) {
  return { stroke: c.grid, tick: { ...TICK, fill: c.axis }, tickLine: false }
}

export function PaceChart({
  data,
  goal,
  colors,
}: {
  data: PacePoint[]
  goal: number
  colors: ChartColors
}) {
  const paces = [...data.map((d) => d.paceSec), goal]
  // Round axis to whole 30-second steps (60 s when the range is wide): 5:30, 6:00, 6:30...
  const lo = Math.floor((Math.min(...paces) - 10) / 30) * 30
  const hi = Math.ceil((Math.max(...paces) + 10) / 30) * 30
  const step = hi - lo > 240 ? 60 : 30
  const ticks = Array.from({ length: Math.floor((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  const domain = [lo, hi]
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(colors)} minTickGap={16} />
        <YAxis
          {...axisProps(colors)}
          reversed
          domain={domain}
          ticks={ticks}
          tickFormatter={(v: number) => formatPace(v)}
          width={44}
        />
        <ReferenceLine
          y={goal}
          stroke={colors.reference}
          strokeDasharray="5 4"
          label={{
            value: `Goal ${formatPace(goal)}`,
            position: 'insideTopRight',
            fill: colors.axis,
            fontSize: 12,
          }}
        />
        <Tooltip
          cursor={{ stroke: colors.grid }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as PacePoint | undefined
            if (!active || !p) return null
            return (
              <TooltipBox
                title={`${formatShortDate(p.date)} · ${runTypeLabel(p.type)}`}
                lines={[`${formatPace(p.paceSec)} /km`, `${signedSec(p.gapSec)} vs goal`]}
              />
            )
          }}
        />
        <Line
          dataKey="paceSec"
          stroke={colors.series1}
          strokeWidth={2}
          strokeLinejoin="round"
          dot={{ r: 4, fill: colors.series1, stroke: colors.surface, strokeWidth: 2 }}
          activeDot={{ r: 6, fill: colors.series1, stroke: colors.surface, strokeWidth: 2 }}
          isAnimationActive={!reducedMotion()}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function GapTrendChart({ data, colors }: { data: PacePoint[]; colors: ChartColors }) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <LineChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(colors)} minTickGap={16} />
        <YAxis
          {...axisProps(colors)}
          reversed
          tickFormatter={(v: number) => signedSec(v)}
          width={52}
        />
        <ReferenceLine
          y={0}
          stroke={colors.reference}
          strokeDasharray="5 4"
          label={{
            value: 'Goal pace',
            position: 'insideTopRight',
            fill: colors.axis,
            fontSize: 12,
          }}
        />
        <Tooltip
          cursor={{ stroke: colors.grid }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as PacePoint | undefined
            if (!active || !p) return null
            return (
              <TooltipBox
                title={formatShortDate(p.date)}
                lines={[
                  `5-run average: ${signedSec(p.rollingGapSec)}`,
                  `This run: ${signedSec(p.gapSec)}`,
                ]}
              />
            )
          }}
        />
        <Line
          dataKey="rollingGapSec"
          stroke={colors.series1}
          strokeWidth={2}
          strokeLinejoin="round"
          dot={false}
          activeDot={{ r: 6, fill: colors.series1, stroke: colors.surface, strokeWidth: 2 }}
          isAnimationActive={!reducedMotion()}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function TypeGapChart({ data, colors }: { data: TypeGap[]; colors: ChartColors }) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <BarChart data={data} layout="vertical" margin={{ ...MARGIN, right: 20 }}>
        <CartesianGrid stroke={colors.grid} horizontal={false} />
        <XAxis type="number" {...axisProps(colors)} tickFormatter={(v: number) => signedSec(v)} />
        <YAxis type="category" dataKey="label" {...axisProps(colors)} width={48} />
        <ReferenceLine x={0} stroke={colors.reference} />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as TypeGap | undefined
            if (!active || !p) return null
            return (
              <TooltipBox
                title={`${p.label} runs (${p.runs})`}
                lines={[`${signedSec(p.avgGapSec)} per km vs goal`]}
              />
            )
          }}
        />
        <Bar
          dataKey="avgGapSec"
          fill={colors.series1}
          barSize={22}
          shape={(props: BarShapeProps) => <SignedBar {...props} horizontal />}
          isAnimationActive={!reducedMotion()}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function KmGapChart({ data, colors }: { data: KmGap[]; colors: ChartColors }) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <BarChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(colors)} />
        <YAxis {...axisProps(colors)} tickFormatter={(v: number) => signedSec(v)} width={52} />
        <ReferenceLine y={0} stroke={colors.reference} />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as KmGap | undefined
            if (!active || !p) return null
            return (
              <TooltipBox
                title={`${p.label} (${p.runs} ${p.runs === 1 ? 'run' : 'runs'})`}
                lines={[`${signedSec(p.avgGapSec)} per km vs goal`]}
              />
            )
          }}
        />
        <Bar
          dataKey="avgGapSec"
          fill={colors.series1}
          maxBarSize={24}
          shape={(props: BarShapeProps) => <SignedBar {...props} />}
          isAnimationActive={!reducedMotion()}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function WeeklyKmChart({ data, colors }: { data: WeekKm[]; colors: ChartColors }) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <BarChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(colors)} minTickGap={8} />
        <YAxis {...axisProps(colors)} width={36} />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as WeekKm | undefined
            if (!active || !p) return null
            return <TooltipBox title={`Week of ${p.label}`} lines={[`${formatKm(p.km)} km`]} />
          }}
        />
        <Bar
          dataKey="km"
          fill={colors.series1}
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reducedMotion()}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function LongestChart({ data, colors }: { data: WeekLongest[]; colors: ChartColors }) {
  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={SIZE}>
      <ComposedChart data={data} margin={MARGIN}>
        <CartesianGrid stroke={colors.grid} vertical={false} />
        <XAxis dataKey="label" {...axisProps(colors)} minTickGap={8} />
        <YAxis {...axisProps(colors)} width={36} />
        <Tooltip
          cursor={{ fill: colors.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            const p = payload?.[0]?.payload as WeekLongest | undefined
            if (!active || !p) return null
            return (
              <TooltipBox
                title={`Week of ${p.label}`}
                lines={[
                  p.longestKm === null ? 'No runs' : `Longest: ${formatKm(p.longestKm)} km`,
                  p.limitKm === null ? 'Limit: fresh start' : `Limit: ${formatKm(p.limitKm)} km`,
                  ...(p.bigJump ? ['⚠ Big jump this week'] : []),
                ]}
              />
            )
          }}
        />
        <Bar
          dataKey="longestKm"
          maxBarSize={24}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reducedMotion()}
        >
          {data.map((d) => (
            <Cell key={d.weekStart} fill={d.bigJump ? colors.alert : colors.series1} />
          ))}
        </Bar>
        <Line
          dataKey="limitKm"
          type="stepAfter"
          // A threshold, so it's styled like the goal line: neutral and dashed.
          stroke={colors.reference}
          strokeDasharray="5 4"
          strokeWidth={2}
          dot={false}
          connectNulls
          isAnimationActive={!reducedMotion()}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
