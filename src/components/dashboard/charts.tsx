import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ShipmentStatus } from '@/types'
import { SHIPMENT_STATUSES } from '@/types'
import { STATUS_LABEL } from '@/utils/status'
import type { MonthlyVolumePoint } from '@/services/dashboardService'

// Hex mirrors of the Tailwind status tokens — Recharts needs literal colors.
const STATUS_HEX: Record<ShipmentStatus, string> = {
  delivered: '#0f8a54',
  in_transit: '#1d6fd1',
  pending: '#d97706',
  delayed: '#dc2626',
  cancelled: '#6b7280',
}

export function StatusMixChart({ byStatus }: { byStatus: Record<ShipmentStatus, number> }) {
  const data = SHIPMENT_STATUSES.map((s) => ({ status: s, label: STATUS_LABEL[s], value: byStatus[s] })).filter(
    (d) => d.value > 0,
  )
  const total = data.reduce((sum, d) => sum + d.value, 0)

  if (total === 0) {
    return <p className="py-10 text-center text-sm text-steel-400">No shipment data yet.</p>
  }

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={54}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_HEX[d.status]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ borderRadius: 10, border: '1px solid #e5e8ec', fontSize: 13 }}
              formatter={(value: number, _n, item) => [`${value}`, item?.payload?.label]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-tabular text-2xl font-bold text-navy-900">{total}</span>
          <span className="text-xs font-medium text-steel-400">Total</span>
        </div>
      </div>
      <ul className="flex-1 space-y-2">
        {data.map((d) => (
          <li key={d.status} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: STATUS_HEX[d.status] }} />
              <span className="text-steel-600">{d.label}</span>
            </span>
            <span className="font-tabular font-semibold text-navy-900">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function VolumeChart({ data }: { data: MonthlyVolumePoint[] }) {
  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b3b7a" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#0b3b7a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: '#5a6673' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12, fill: '#5a6673' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: '1px solid #e5e8ec', fontSize: 13 }}
            labelStyle={{ fontWeight: 600, color: '#0f1720' }}
            formatter={(value: number) => [`${value}`, 'Shipments']}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#0b3b7a"
            strokeWidth={2.5}
            fill="url(#volumeFill)"
            dot={{ r: 3, fill: '#0b3b7a' }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
