import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, RefreshCw, Target, Timer, TrendingUp, Users } from 'lucide-react'
import { ExportMenu, PageHeader, PillGroup } from '@/components/dashboard'
import {
  RevenueTrendChart,
  CustomerGrowthChart,
  RouteVolumeChart,
  MixDonutChart,
  ValueBars,
} from '@/components/dashboard/charts'
import {
  Alert,
  Button,
  EmptyState,
  Metric,
  MetricSkeleton,
  Panel,
  PanelHeader,
  SectionCard,
  Skeleton,
} from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCachedResource } from '@/hooks/useCachedResource'
import { getAnalyticsReport } from '@/services/analyticsService'
import { exportAnalyticsCsv } from '@/lib/exports/reportExports'
import type { AnalyticsReport } from '@/types'
import { formatCurrency, formatNumber } from '@/utils/format'

type Range = '3' | '6' | '12'

const RANGE_PILLS: { value: Range; label: string }[] = [
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
]

export default function Analytics() {
  useDocumentTitle('Reports | FSN Cargo')

  const [range, setRange] = useState<Range>('6')

  const fetchReport = useCallback(
    () => getAnalyticsReport(Number(range)),
    [range],
  )

  // Keyed by range, so flipping back to a period already viewed paints it
  // straight from cache instead of re-running analytics_report().
  const {
    data: report,
    loading,
    refreshing,
    error,
    reload: load,
  } = useCachedResource<AnalyticsReport>(`analytics:${range}`, fetchReport)

  const perf = report?.delivery_performance

  // Only deliveries with a recorded result are used
  // to calculate the on-time delivery rate.
  const rated =
    (perf?.on_time ?? 0) +
    (perf?.late ?? 0)

  const onTimeRate =
    rated > 0
      ? Math.round(
          ((perf?.on_time ?? 0) / rated) * 100,
        )
      : null

  const inProgress = perf?.in_progress ?? 0
  const overdue = perf?.overdue ?? 0

  // Transit runs departure scan to delivery scan. The legs that landed inside
  // the period give the completed average; until one does, the tile reports how
  // long the legs still moving have been out, which is the same clock mid-run.
  const avgTransit = perf?.avg_transit_days
  const transitSample = perf?.transit_sample ?? 0
  const avgOpen = perf?.avg_open_days
  const openSample = perf?.open_sample ?? 0

  // Three different reasons the clock cannot be read, and they are not the same
  // news. Nothing booked is an empty book. Booked but never scanned out is the
  // ordinary state of cargo still waiting at the counter — normal, and not a
  // data problem. Only a leg that departed and still cannot be measured is a
  // gap in the scans. A failed query never reaches here; it renders the alert.
  const noTransitHint =
    (perf?.period_shipments ?? 0) === 0
      ? 'No shipments on the books yet'
      : (perf?.departed_sample ?? 0) === 0
        ? 'Nothing has departed yet'
        : 'Insufficient delivery data'

  const collected =
    report?.revenue_trend.reduce(
      (sum, point) => sum + point.collected,
      0,
    ) ?? 0

  const invoiced =
    report?.revenue_trend.reduce(
      (sum, point) => sum + point.invoiced,
      0,
    ) ?? 0

  const newCustomers =
    report?.customer_growth.reduce(
      (sum, point) => sum + point.new_customers,
      0,
    ) ?? 0

  const totalCustomers =
    report?.customer_growth.at(-1)?.total ?? 0

  // Sum and count come back from analytics_report() over the same period window
  // as every other trend on the page, so the mean is never assembled here out of
  // two figures that could have been read across different date ranges.
  const payments = report?.payment_stats ?? null

  // Same window as payment_stats, so the bars below add up to the tile above.
  // Defaulted rather than assumed: a payload served by an older
  // analytics_report() carries no mix, which is an empty panel and not a crash.
  const paymentMix = report?.payment_mix ?? []

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Revenue, cargo performance, and customer growth across the FSN Cargo network."
        crumbs={[
          { label: 'Control' },
          { label: 'Reports' },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PillGroup
              label="Reporting period"
              options={RANGE_PILLS}
              value={range}
              onChange={setRange}
            />

            {/* Nothing to export until a report has landed, so the menu appears
                with the figures rather than offering an empty file. */}
            {report && (
              <ExportMenu
                items={[
                  {
                    label: 'Report summary (CSV)',
                    onClick: async () =>
                      exportAnalyticsCsv(report, Number(range)),
                  },
                ]}
              />
            )}

            {/* The report is cached per period, so returning to one already
                viewed paints from cache. This is how the owner asks for the
                figures to be read again now. */}
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
              loading={refreshing}
              onClick={load}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {loading && !report ? (
        <AnalyticsSkeleton />
      ) : error || !report ? (
        <Alert
          variant="error"
          title="Could not load the report"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={load}
            >
              Retry
            </Button>
          }
        >
          {error ?? 'No data was returned for this period.'}
        </Alert>
      ) : (
        <div
          className="animate-fade-up space-y-5"
          key={range}
        >
          {/* Overview metrics */}
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
            <Metric
              icon={TrendingUp}
              label="Collected"
              value={formatCurrency(collected)}
              hint={`of ${formatCurrency(invoiced)} invoiced`}
              tone="positive"
            />

            {/* Nothing delivered yet means there is no rate to compute. Rather
                than park a dash on the row, the tile falls back to the in-flight
                picture the report already carries. */}
            {rated > 0 ? (
              <Metric
                icon={Target}
                label="On-time delivery"
                value={`${onTimeRate ?? 0}%`}
                hint={`${perf?.on_time ?? 0} of ${rated} rated`}
                tone={
                  (onTimeRate ?? 0) < 80
                    ? 'caution'
                    : 'signal'
                }
              />
            ) : (
              <Metric
                icon={Target}
                label="In transit"
                value={formatNumber(inProgress)}
                hint={
                  overdue > 0
                    ? `${formatNumber(overdue)} past the estimate`
                    : 'All within the estimate'
                }
                tone={overdue > 0 ? 'caution' : 'default'}
              />
            )}

            {/* Transit time can only be measured once something lands. Until
                then the tile reports how long the shipments still moving have
                been out, which is the same clock mid-run — and when nothing has
                moved at all, that clock reads 0 days. Zero elapsed transit is a
                measurement; the hint says which of the three cases it is. Only a
                payload that carried no delivery figures at all is a blank. */}
            {avgTransit != null ? (
              <Metric
                icon={Timer}
                label="Average transit"
                value={`${avgTransit} d`}
                hint={`${formatNumber(transitSample)} delivered`}
              />
            ) : (
              <Metric
                icon={Timer}
                label="Time in transit"
                value={perf ? `${avgOpen ?? 0} d` : '—'}
                hint={
                  !perf
                    ? 'The report returned no delivery figures'
                    : avgOpen != null
                      ? `Average age of ${formatNumber(openSample)} in-transit ${openSample === 1 ? 'shipment' : 'shipments'}`
                      : noTransitHint
                }
              />
            )}

            <Metric
              icon={Users}
              label="New customers"
              value={formatNumber(newCustomers)}
              hint={`${formatNumber(totalCustomers)} on the books`}
            />

            {/* Nothing collected averages $0.00 — that is what the ledger says,
                and the hint carries the reason the figure is zero. A report that
                came back without payment figures at all is a different thing,
                and is the only case this tile leaves blank. */}
            <Metric
              icon={Banknote}
              label="Average payment"
              value={!payments ? 'Unable to load' : formatCurrency(payments.average ?? 0, 2)}
              hint={
                !payments
                  ? 'The report returned no payment totals'
                  : payments.count > 0
                    ? `${formatCurrency(payments.collected)} across ${formatNumber(payments.count)} ${payments.count === 1 ? 'payment' : 'payments'}`
                    : 'No collected payments yet'
              }
            />
          </div>

          {/* Revenue */}
          <SectionCard
            title="Revenue trend"
            note="Collected vs invoiced"
          >
            {report.revenue_trend.length === 0 ? (
              <EmptyState
                title="No revenue data yet"
                description="Revenue data will appear once invoices and payments are recorded."
              />
            ) : (
              <RevenueTrendChart
                data={report.revenue_trend}
              />
            )}
          </SectionCard>

          {/* How that revenue came in. Sits under the trend because it splits
              the same money over the same window — one figure, two cuts. */}
          <SectionCard
            title="How customers pay"
            note="Collected by method"
          >
            {paymentMix.length === 0 ? (
              <EmptyState
                title="No payments recorded yet"
                description="Payment channels will appear here once money has been taken."
              />
            ) : (
              <ValueBars
                data={paymentMix.map((entry) => ({
                  label: entry.name,
                  value: entry.revenue ?? 0,
                  note: `${formatNumber(entry.value)} ${entry.value === 1 ? 'payment' : 'payments'}`,
                }))}
                emptyMessage="No money collected in this period."
              />
            )}
          </SectionCard>

          {/* Routes + customer growth */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Busiest lanes"
              note="By volume"
            >
              {report.top_routes.length === 0 ? (
                <EmptyState
                  title="No shipments yet"
                  description="Lane data will appear once shipments are created."
                />
              ) : (
                <RouteVolumeChart
                  data={report.top_routes.map((route) => ({
                    label: `${route.origin} → ${route.destination}`,
                    shipments: route.shipments,
                  }))}
                />
              )}
            </SectionCard>

            <SectionCard
              title="Customer growth"
              note="New vs total"
            >
              {report.customer_growth.length === 0 ? (
                <EmptyState
                  title="No customer data yet"
                  description="Customer growth will appear once customers are added."
                />
              ) : (
                <CustomerGrowthChart
                  data={report.customer_growth}
                />
              )}
            </SectionCard>
          </div>

          {/* Shipment mix */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Shipping method mix"
              note="Shipment distribution"
            >
              {report.method_mix.length === 0 ? (
                <EmptyState
                  title="No shipping data yet"
                  description="Shipping method data will appear once shipments are booked."
                />
              ) : (
                <MixDonutChart
                  data={report.method_mix}
                  label="Shipments"
                />
              )}
            </SectionCard>

            <SectionCard
              title="Cargo type mix"
              note="Shipment distribution"
            >
              {report.cargo_mix.length === 0 ? (
                <EmptyState
                  title="No cargo data yet"
                  description="Cargo type data will appear once shipments are booked."
                />
              ) : (
                <MixDonutChart
                  data={report.cargo_mix}
                  label="Shipments"
                />
              )}
            </SectionCard>
          </div>

          {/* Top customers + lane value */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <Panel>
              <PanelHeader
                title="Top customers"
                description="Ranked by lifetime shipment value."
                dense
              />

              {report.top_customers.length === 0 ? (
                <EmptyState
                  title="No customers yet"
                  description="Customer value appears here once shipments have been priced."
                />
              ) : (
                <ol className="divide-y divide-deck-100">
                  {report.top_customers.map(
                    (customer, index) => (
                      <li
                        key={customer.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className="font-tabular w-5 shrink-0 text-[11px] font-bold text-deck-300">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <Link
                            to="/dashboard/customers"
                            className="deck-focus block truncate rounded-chip text-[13px] font-semibold text-deck-900 underline-offset-2 hover:text-signal-600 hover:underline"
                          >
                            {customer.full_name}
                          </Link>

                          <p className="truncate text-[11px] text-deck-500">
                            {formatNumber(customer.shipments)} shipments
                          </p>
                        </div>

                        <span className="font-tabular shrink-0 text-[13px] font-bold text-deck-900">
                          {formatCurrency(customer.value)}
                        </span>
                      </li>
                    ),
                  )}
                </ol>
              )}
            </Panel>

            <Panel>
              <PanelHeader
                title="Lane value"
                description="Revenue booked per origin/destination pair."
                dense
              />

              {report.top_routes.length === 0 ? (
                <EmptyState
                  title="No lanes yet"
                  description="Lane performance appears once shipments have been created."
                />
              ) : (
                <ol className="divide-y divide-deck-100">
                  {report.top_routes.map(
                    (route, index) => (
                      <li
                        key={`${route.origin}-${route.destination}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <span className="font-tabular w-5 shrink-0 text-[11px] font-bold text-deck-300">
                          {index + 1}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-semibold text-deck-900">
                            {route.origin}{' '}
                            <span className="text-deck-300">
                              →
                            </span>{' '}
                            {route.destination}
                          </p>

                          <p className="truncate text-[11px] text-deck-500">
                            {formatNumber(route.shipments)} shipments
                            {route.avg_weight != null &&
                              ` · avg ${route.avg_weight} kg`}
                          </p>
                        </div>

                        <span className="font-tabular shrink-0 text-[13px] font-bold text-deck-900">
                          {formatCurrency(route.value)}
                        </span>
                      </li>
                    ),
                  )}
                </ol>
              )}
            </Panel>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Loading state follows the original page alignment.
 */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <MetricSkeleton key={index} />
        ))}
      </div>

      {/* Revenue */}
      <div className="rounded-deck bg-panel p-5 shadow-deck">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>

      {/* How customers pay */}
      <div className="rounded-deck bg-panel p-5 shadow-deck">
        <Skeleton className="mb-4 h-4 w-36" />

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row}>
              <Skeleton className="mb-1.5 h-3 w-40" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Lanes + customer growth */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-deck bg-panel p-5 shadow-deck"
          >
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>

      {/* Mix */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-deck bg-panel p-5 shadow-deck"
          >
            <Skeleton className="mb-4 h-4 w-36" />
            <Skeleton className="mx-auto h-48 w-48 rounded-full" />
          </div>
        ))}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div
            key={index}
            className="rounded-deck bg-panel p-5 shadow-deck"
          >
            <Skeleton className="mb-4 h-4 w-32" />

            <div className="space-y-4">
              {Array.from({ length: 5 }).map((__, row) => (
                <div
                  key={row}
                  className="flex items-center gap-3"
                >
                  <Skeleton className="h-4 w-5" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
