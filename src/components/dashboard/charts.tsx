import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RevenuePoint, CustomerGrowthPoint, MixPoint, MonthlyVolumePoint } from '@/types'
import { DECK_HEX } from '@/utils/status'
import { formatCurrency } from '@/utils/format'

// Shared chart chrome, so every plot in the console reads as one system.
const AXIS = { fontSize: 11, fill: DECK_HEX.muted, fontWeight: 500 } as const

const TOOLTIP = {
  contentStyle: {
    borderRadius: 10,
    border: 'none',
    boxShadow: '0 0 0 1px rgba(11,18,32,0.08), 0 12px 30px -8px rgba(11,18,32,0.25)',
    fontSize: 12,
    padding: '8px 10px',
  },
  labelStyle: { fontWeight: 700, color: DECK_HEX.ink, marginBottom: 2 },
  itemStyle: { padding: 0 },
} as const

const GRID = { strokeDasharray: '2 4', stroke: DECK_HEX.line } as const
const LEGEND = { fontSize: 11, paddingTop: 10, color: DECK_HEX.muted } as const

/** Categorical ramp for mix charts, ordered so neighbours stay distinguishable. */
const MIX_COLORS = [
  DECK_HEX.signal,
  DECK_HEX.ink,
  DECK_HEX.signalLight,
  DECK_HEX.ink600,
  DECK_HEX.caution,
  DECK_HEX.muted,
  DECK_HEX.positive,
  DECK_HEX.transit,
]

// ---- Analytics & Reports ---------------------------------------------------

/** Collected against invoiced, month by month. The gap between the bands is the receivable. */
export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  if (data.every((d) => d.collected === 0 && d.invoiced === 0)) {
    return <ChartEmpty message="No revenue recorded in this period." />
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="fsn-collected" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={DECK_HEX.signal} stopOpacity={0.28} />
              <stop offset="100%" stopColor={DECK_HEX.signal} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <Tooltip {...TOOLTIP} formatter={(value: number, name) => [formatCurrency(value, 2), name]} />
          <Legend iconType="plainline" wrapperStyle={LEGEND} />
          <Area
            type="monotone"
            dataKey="invoiced"
            name="Invoiced"
            stroke={DECK_HEX.muted}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="collected"
            name="Collected"
            stroke={DECK_HEX.signal}
            strokeWidth={2.25}
            fill="url(#fsn-collected)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** New customers per month against the running total, on one grid. */
export function CustomerGrowthChart({ data }: { data: CustomerGrowthPoint[] }) {
  if (data.every((d) => d.total === 0)) {
    return <ChartEmpty message="No customers on record yet." />
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={36} />
          <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(11,18,32,0.04)' }} />
          <Legend wrapperStyle={LEGEND} />
          <Bar dataKey="new_customers" name="New" fill={DECK_HEX.signal} radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Bar dataKey="total" name="Total" fill={DECK_HEX.ink} radius={[3, 3, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal ranking of lanes by volume — the labels need the room a vertical axis gives. */
export function RouteVolumeChart({ data }: { data: { label: string; shipments: number }[] }) {
  if (data.length === 0) return <ChartEmpty message="No routes to rank yet." />
  return (
    <div className="w-full" style={{ height: Math.max(180, data.length * 38) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid {...GRID} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={150}
          />
          <Tooltip {...TOOLTIP} cursor={{ fill: 'rgba(11,18,32,0.04)' }} />
          <Bar dataKey="shipments" name="Shipments" fill={DECK_HEX.ink} radius={[0, 3, 3, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Generic donut for method / cargo mix, with the total in the hole. */
export function MixDonutChart({ data, label }: { data: MixPoint[]; label: string }) {
  const rows = data.filter((d) => d.value > 0)
  const total = rows.reduce((sum, d) => sum + d.value, 0)
  if (total === 0) return <ChartEmpty message={`No ${label.toLowerCase()} data yet.`} />

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={76}
              paddingAngle={2}
              stroke="none"
            >
              {rows.map((d, i) => (
                <Cell key={d.name} fill={MIX_COLORS[i % MIX_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip {...TOOLTIP} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-tabular text-[26px] font-bold leading-none text-deck-900">{total}</span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-deck-400">{label}</span>
        </div>
      </div>
      <ul className="w-full flex-1 space-y-2">
        {rows.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }}
                aria-hidden="true"
              />
              <span className="truncate text-deck-600">{d.name}</span>
            </span>
            <span className="font-tabular shrink-0 font-semibold text-deck-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return <p className="py-14 text-center text-[13px] text-deck-400">{message}</p>
}

// ---- Overview --------------------------------------------------------------

/** Shipments created month by month. Volume only — money never enters this plot,
 *  so the same component serves Admins and Dispatchers. */
export function ShipmentVolumeChart({ data }: { data: MonthlyVolumePoint[] }) {
  if (data.length === 0 || data.every((d) => d.shipments === 0)) {
    return <ChartEmpty message="No shipments recorded yet." />
  }
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...GRID} vertical={false} />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={36} />
          <Tooltip {...TOOLTIP} cursor={{ stroke: DECK_HEX.line }} />
          <Area
            type="monotone"
            dataKey="shipments"
            name="Shipments"
            stroke={DECK_HEX.signal}
            strokeWidth={2}
            fill={DECK_HEX.signal}
            fillOpacity={0.12}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
