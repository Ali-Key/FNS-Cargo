import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { RevenuePoint, CustomerGrowthPoint, MixPoint } from '@/types'
import { BRAND_BLUE_HEX, BRAND_BLUE_LIGHT_HEX } from '@/utils/status'
import { formatCurrency } from '@/utils/format'

// Shared chart chrome so every surface reads as one system.
const AXIS = { fontSize: 12, fill: '#64748b' } as const
const TOOLTIP = {
  contentStyle: { borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 },
  labelStyle: { fontWeight: 600, color: '#0f172a' },
} as const

const NAVY = BRAND_BLUE_HEX
const primary = BRAND_BLUE_LIGHT_HEX
const GREEN = '#16a34a'
const STEEL = '#94a3b8'

/** Categorical ramp for mix charts, ordered so neighbours stay distinguishable. */
const MIX_COLORS = [NAVY, primary, GREEN, '#5b7fa6', '#f59e0b', '#7c8b99', '#2d5f8a', '#b45309']

// ---- Analytics & Reports ---------------------------------------------------

/** Collected vs invoiced, month by month. The gap between the lines is the receivable. */
export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  if (data.every((d) => d.collected === 0 && d.invoiced === 0)) {
    return <ChartEmpty message="No revenue recorded in this period." />
  }
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={54}
            tickFormatter={(v: number) => formatCurrency(v)}
          />
          <Tooltip {...TOOLTIP} formatter={(value: number, name) => [formatCurrency(value, 2), name]} />
          <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Line
            type="monotone"
            dataKey="invoiced"
            name="Invoiced"
            stroke={STEEL}
            strokeWidth={2}
            strokeDasharray="5 4"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="collected"
            name="Collected"
            stroke={GREEN}
            strokeWidth={2.5}
            dot={{ r: 3, fill: GREEN }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} />
          <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} width={36} />
          <Tooltip {...TOOLTIP} cursor={{ fill: '#f5f7f9' }} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          <Bar dataKey="new_customers" name="New" fill={primary} radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="total" name="Total" fill={NAVY} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Horizontal ranking of lanes by volume — labels need the room a vertical axis gives. */
export function RouteVolumeChart({ data }: { data: { label: string; shipments: number }[] }) {
  if (data.length === 0) return <ChartEmpty message="No routes to rank yet." />
  return (
    <div className="w-full" style={{ height: Math.max(180, data.length * 40) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ ...AXIS, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={150}
          />
          <Tooltip {...TOOLTIP} cursor={{ fill: '#f5f7f9' }} />
          <Bar dataKey="shipments" name="Shipments" fill={NAVY} radius={[0, 4, 4, 0]} maxBarSize={20} />
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
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
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
          <span className="font-tabular text-2xl font-bold text-navy-900">{total}</span>
          <span className="text-xs font-medium text-steel-400">{label}</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {rows.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length] }}
              />
              <span className="text-steel-600">{d.name}</span>
            </span>
            <span className="font-tabular font-semibold text-navy-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ChartEmpty({ message }: { message: string }) {
  return <p className="py-12 text-center text-sm text-steel-400">{message}</p>
}
