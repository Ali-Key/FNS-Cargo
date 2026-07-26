import { supabase } from '@/lib/supabase'
import type { DashboardStats, ShipmentStatus } from '@/types'
import { SHIPMENT_STATUSES } from '@/types'

export interface MonthlyVolumePoint {
  month: string // e.g. "Feb"
  count: number
}

export interface MetricSummary {
  value: number
  /** Percentage change vs the previous period; null when there's no prior baseline. */
  delta: number | null
  direction: 'up' | 'down' | 'flat'
  /** Weekly counts (oldest → newest) for the tile sparkline. */
  spark: number[]
}

export interface DashboardMetrics {
  total: MetricSummary
  active: MetricSummary
  delivered: MetricSummary
  delayed: MetricSummary
}

export interface DashboardData {
  stats: DashboardStats
  monthlyVolume: MonthlyVolumePoint[]
  metrics: DashboardMetrics
}

const DAY = 86_400_000
const WEEK = 7 * DAY
const SPARK_WEEKS = 8

const EMPTY_BY_STATUS = (): Record<ShipmentStatus, number> =>
  SHIPMENT_STATUSES.reduce((acc, s) => ({ ...acc, [s]: 0 }), {} as Record<ShipmentStatus, number>)

const ACTIVE_STATUSES: ShipmentStatus[] = ['pending', 'in_transit', 'delayed']

interface Row {
  status: ShipmentStatus
  created: number
}

/**
 * Aggregates the dashboard overview in as few round-trips as possible.
 * Shipment rows are fetched minimally (status + created_at) and reduced
 * client-side into status counts, the 6-month volume trend, and per-metric
 * period-over-period deltas + sparklines.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const [{ data: shipmentRows, error: shipErr }, customersCount, activeCustomersCount] =
    await Promise.all([
      supabase.from('shipments').select('status, created_at'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

  if (shipErr) throw shipErr

  const rows: Row[] = (shipmentRows ?? []).map((r) => ({
    status: r.status as ShipmentStatus,
    created: new Date(r.created_at).getTime(),
  }))

  const byStatus = EMPTY_BY_STATUS()
  for (const row of rows) if (row.status in byStatus) byStatus[row.status] += 1

  const stats: DashboardStats = {
    total: rows.length,
    byStatus,
    customers: customersCount.count ?? 0,
    activeCustomers: activeCustomersCount.count ?? 0,
  }

  const now = Date.now()
  const isActive = (r: Row) => ACTIVE_STATUSES.includes(r.status)

  const metrics: DashboardMetrics = {
    total: buildMetric(rows, () => true, rows.length, now),
    active: buildMetric(rows, isActive, byStatus.pending + byStatus.in_transit + byStatus.delayed, now),
    delivered: buildMetric(rows, (r) => r.status === 'delivered', byStatus.delivered, now),
    delayed: buildMetric(rows, (r) => r.status === 'delayed', byStatus.delayed, now),
  }

  return {
    stats,
    monthlyVolume: buildMonthlyVolume(rows.map((r) => r.created)),
    metrics,
  }
}

/** Delta (this 30d vs prior 30d, by created_at) + 8-week sparkline for a status subset. */
function buildMetric(rows: Row[], predicate: (r: Row) => boolean, value: number, now: number): MetricSummary {
  const subset = rows.filter(predicate)

  const cur = subset.filter((r) => r.created >= now - 30 * DAY).length
  const prev = subset.filter((r) => r.created >= now - 60 * DAY && r.created < now - 30 * DAY).length

  let delta: number | null = null
  let direction: MetricSummary['direction'] = 'flat'
  if (prev > 0) {
    delta = Math.round(((cur - prev) / prev) * 100)
    direction = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  } else if (cur > 0) {
    delta = 100
    direction = 'up'
  }

  const spark = Array.from({ length: SPARK_WEEKS }, (_, i) => {
    const start = now - (SPARK_WEEKS - i) * WEEK
    const end = start + WEEK
    return subset.filter((r) => r.created >= start && r.created < end).length
  })

  return { value, delta, direction, spark }
}

/** Last 6 calendar months of shipment counts, oldest → newest. */
function buildMonthlyVolume(createdTimes: number[]): MonthlyVolumePoint[] {
  const now = new Date()
  const buckets: { key: string; label: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      count: 0,
    })
  }
  const index = new Map(buckets.map((b, i) => [b.key, i]))
  for (const time of createdTimes) {
    const d = new Date(time)
    if (Number.isNaN(d.getTime())) continue
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (i !== undefined) buckets[i].count += 1
  }
  return buckets.map((b) => ({ month: b.label, count: b.count }))
}
