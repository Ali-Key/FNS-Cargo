import type { AnalyticsReport } from '@/types'
import { buildCsv, downloadCsv } from './csv'

interface ReportRow extends Record<string, unknown> {
  section: string
  item: string
  value: string | number
}

/**
 * A missing measure is not a zero. `avg_transit_days` is null until something
 * lands, and a report served by an older `analytics_report()` carries no
 * payment keys at all — both leave the cell empty rather than writing a 0 the
 * owner would then read as a measurement.
 */
const cell = (value: number | null | undefined): string | number =>
  value === null || value === undefined ? '' : value

/**
 * The whole report as one flat CSV: section, measure, number.
 *
 * Values are written raw, never currency-formatted — the point of the download
 * is to total and chart the figures in a spreadsheet, and "$1,234.00" is text
 * to Excel. Formatting belongs on the page, which already has it.
 *
 * Built from the report already on screen rather than a fresh RPC call, so the
 * file can never disagree with the page that offered it.
 */
export function exportAnalyticsCsv(report: AnalyticsReport, months: number) {
  const rows: ReportRow[] = []
  const push = (section: string, item: string, value: string | number) => rows.push({ section, item, value })

  push('Period', 'Months covered', months)

  // Headline figures, in the order the tiles read across the top of the page.
  const collected = report.revenue_trend.reduce((sum, point) => sum + point.collected, 0)
  const invoiced = report.revenue_trend.reduce((sum, point) => sum + point.invoiced, 0)
  push('Summary', 'Collected', collected)
  push('Summary', 'Invoiced', invoiced)
  push('Summary', 'Outstanding', invoiced - collected)

  const payments = report.payment_stats ?? null
  push('Summary', 'Payments recorded', cell(payments?.count))
  push('Summary', 'Average payment', cell(payments?.average))

  const growth = report.customer_growth ?? []
  push('Summary', 'New customers', growth.reduce((sum, point) => sum + point.new_customers, 0))
  push('Summary', 'Total customers', growth.at(-1)?.total ?? 0)

  // Collected and invoiced go out as separate rows per month rather than as two
  // columns, so every row in the file carries exactly one number under one label.
  for (const point of report.revenue_trend) push('Collected by month', point.month, point.collected)
  for (const point of report.revenue_trend) push('Invoiced by month', point.month, point.invoiced)

  for (const method of report.payment_mix ?? []) {
    push('Collected by method', method.name, method.revenue ?? 0)
    push('Payments by method', method.name, method.value)
  }

  const perf = report.delivery_performance
  if (perf) {
    push('Delivery', 'Delivered', perf.delivered)
    push('Delivery', 'On time', perf.on_time)
    push('Delivery', 'Late', perf.late)
    push('Delivery', 'In progress', perf.in_progress)
    push('Delivery', 'Overdue', perf.overdue)
    push('Delivery', 'Average transit (days)', cell(perf.avg_transit_days))
    push('Delivery', 'Delivered legs measured', perf.transit_sample)
    push('Delivery', 'Average time in transit (days)', cell(perf.avg_open_days))
    push('Delivery', 'In-transit legs measured', perf.open_sample)
    push('Delivery', 'Shipments booked this period', perf.period_shipments)
  }

  for (const point of growth) {
    push('New customers by month', point.month, point.new_customers)
    push('Total customers by month', point.month, point.total)
  }

  for (const route of report.top_routes ?? []) {
    const lane = `${route.origin} to ${route.destination}`
    push('Lane volume', lane, route.shipments)
    push('Lane value', lane, route.value)
  }

  for (const point of report.method_mix ?? []) push('Shipping method mix', point.name, point.value)
  for (const point of report.cargo_mix ?? []) push('Cargo type mix', point.name, point.value)

  for (const customer of report.top_customers ?? []) {
    push('Top customer shipments', customer.full_name, customer.shipments)
    push('Top customer value', customer.full_name, customer.value)
  }

  const csv = buildCsv<ReportRow>(
    [
      { key: 'section', label: 'Section' },
      { key: 'item', label: 'Measure' },
      { key: 'value', label: 'Value' },
    ],
    rows,
  )

  downloadCsv(`fsn-cargo-report-${months}m-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}
