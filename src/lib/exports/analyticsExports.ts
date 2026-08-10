import type { AnalyticsReport } from '@/types'
import { buildCsv, downloadCsv } from './csv'

const today = () => new Date().toISOString().slice(0, 10)

/** Revenue by month, collected against invoiced. */
export async function exportRevenueTrendCsv(report: AnalyticsReport) {
  const rows = report.revenue_trend.map((p) => ({
    month: p.month,
    collected: p.collected,
    invoiced: p.invoiced,
  }))
  const csv = buildCsv(
    [
      { key: 'month', label: 'Month' },
      { key: 'collected', label: 'Collected' },
      { key: 'invoiced', label: 'Invoiced' },
    ],
    rows,
  )
  downloadCsv(`fns-cargo-revenue-${today()}.csv`, csv)
}

/** Shipment volume and booked revenue per lane. */
export async function exportTopRoutesCsv(report: AnalyticsReport) {
  const rows = report.top_routes.map((r) => ({
    route: `${r.origin} -> ${r.destination}`,
    shipments: r.shipments,
    value: r.value,
    avg_weight_kg: r.avg_weight ?? '',
  }))
  const csv = buildCsv(
    [
      { key: 'route', label: 'Route' },
      { key: 'shipments', label: 'Shipments' },
      { key: 'value', label: 'Revenue' },
      { key: 'avg_weight_kg', label: 'Avg weight (kg)' },
    ],
    rows,
  )
  downloadCsv(`fns-cargo-routes-${today()}.csv`, csv)
}

/** Shipment volume by shipping method — the closest thing this report has to "revenue by channel". */
export async function exportMethodMixCsv(report: AnalyticsReport) {
  const rows = report.method_mix.map((m) => ({ name: m.name, value: m.value }))
  const csv = buildCsv(
    [
      { key: 'name', label: 'Shipping method' },
      { key: 'value', label: 'Shipments' },
    ],
    rows,
  )
  downloadCsv(`fns-cargo-shipping-methods-${today()}.csv`, csv)
}
