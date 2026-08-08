import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Timer, Target, TrendingUp, Users } from 'lucide-react'
import { PageHeader, PillGroup, StatTile } from '@/components/dashboard'
import {
  RevenueTrendChart,
  CustomerGrowthChart,
  RouteVolumeChart,
  MixDonutChart,
} from '@/components/dashboard/charts'
import { Alert, Button, EmptyState, SectionCard, Skeleton, SkeletonCard } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getAnalyticsReport } from '@/services/analyticsService'
import type { AnalyticsReport } from '@/types'
import { formatCurrency, formatNumber } from '@/utils/format'

type Range = '3' | '6' | '12'

const RANGE_PILLS: { value: Range; label: string }[] = [
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '12 months' },
]

export default function Analytics() {
  useDocumentTitle('Analytics | FNS Cargo')

  const [range, setRange] = useState<Range>('6')
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setReport(await getAnalyticsReport(Number(range)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the report.')
    } finally {
      setLoading(false)
    }
  }, [range])

  useEffect(() => {
    void load()
  }, [load])

  const perf = report?.delivery_performance
  // On-time rate is measured against deliveries that had an estimate to miss.
  const rated = (perf?.on_time ?? 0) + (perf?.late ?? 0)
  const onTimeRate = rated > 0 ? Math.round(((perf?.on_time ?? 0) / rated) * 100) : null

  const collected = report?.revenue_trend.reduce((sum, p) => sum + p.collected, 0) ?? 0
  const invoiced = report?.revenue_trend.reduce((sum, p) => sum + p.invoiced, 0) ?? 0
  const newCustomers = report?.customer_growth.reduce((sum, p) => sum + p.new_customers, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Revenue, lane performance, and customer growth across the operation."
        actions={
          <PillGroup label="Reporting period" options={RANGE_PILLS} value={range} onChange={setRange} />
        }
      />

      {loading ? (
        <AnalyticsSkeleton />
      ) : error || !report ? (
        <Alert variant="error" title="Could not load the report">
          <p>{error ?? 'No data was returned.'}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="space-y-6"
          // Re-keying on range replays the transition when the period changes,
          // which makes it obvious the numbers below were recalculated.
          key={range}
        >
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              icon={TrendingUp}
              label="Collected"
              value={formatCurrency(collected)}
              hint={`of ${formatCurrency(invoiced)} invoiced`}
              tone="delivered"
            />
            <StatTile
              icon={Target}
              label="On-time delivery"
              value={onTimeRate === null ? '—' : `${onTimeRate}%`}
              hint={rated > 0 ? `${perf?.on_time ?? 0} of ${rated} rated` : 'No rated deliveries yet'}
            />
            <StatTile
              icon={Timer}
              label="Avg transit"
              value={perf?.avg_transit_days != null ? `${perf.avg_transit_days} d` : '—'}
              hint={`${formatNumber(perf?.delivered ?? 0)} delivered`}
              tone="transit"
            />
            <StatTile
              icon={Users}
              label="New customers"
              value={formatNumber(newCustomers)}
              hint={`${formatNumber(report.customer_growth.at(-1)?.total ?? 0)} total`}
            />
          </div>

          <SectionCard title="Revenue trend" note="Collected against invoiced">
            <RevenueTrendChart data={report.revenue_trend} />
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Busiest routes" note="By shipment volume">
              <RouteVolumeChart
                data={report.top_routes.map((r) => ({
                  label: `${r.origin} → ${r.destination}`,
                  shipments: r.shipments,
                }))}
              />
            </SectionCard>
            <SectionCard title="Customer growth" note="New against running total">
              <CustomerGrowthChart data={report.customer_growth} />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Shipping method mix">
              <MixDonutChart data={report.method_mix} label="Shipments" />
            </SectionCard>
            <SectionCard title="Cargo type mix">
              <MixDonutChart data={report.cargo_mix} label="Shipments" />
            </SectionCard>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectionCard title="Top customers" note="By lifetime shipment value" flush>
              {report.top_customers.length === 0 ? (
                <EmptyState title="No customers yet" description="Customer value appears here once shipments are priced." />
              ) : (
                <ul className="divide-y divide-steel-100">
                  {report.top_customers.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 px-6 py-3.5">
                      <div className="min-w-0">
                        <Link
                          to="/dashboard/customers"
                          className="truncate rounded text-sm font-semibold text-navy-900 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                        >
                          {c.full_name}
                        </Link>
                        <p className="truncate text-xs text-text-secondary">
                          {formatNumber(c.shipments)} shipments
                        </p>
                      </div>
                      <span className="font-tabular text-sm font-bold text-navy-900">
                        {formatCurrency(c.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard title="Route value" note="Revenue booked per lane" flush>
              {report.top_routes.length === 0 ? (
                <EmptyState title="No routes yet" description="Lane performance appears once shipments are created." />
              ) : (
                <ul className="divide-y divide-steel-100">
                  {report.top_routes.map((r) => (
                    <li
                      key={`${r.origin}-${r.destination}`}
                      className="flex items-center justify-between gap-3 px-6 py-3.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-900">
                          {r.origin} → {r.destination}
                        </p>
                        <p className="truncate text-xs text-text-secondary">
                          {formatNumber(r.shipments)} shipments
                          {r.avg_weight != null && ` · avg ${r.avg_weight} kg`}
                        </p>
                      </div>
                      <span className="font-tabular text-sm font-bold text-navy-900">
                        {formatCurrency(r.value)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        </motion.div>
      )}
    </div>
  )
}

/** Mirrors the loaded layout's shape so the swap from skeleton to data causes no layout shift. */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="border border-gray-200 bg-white p-6">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-gray-200 bg-white p-6">
            <Skeleton className="mb-4 h-4 w-32" />
            <Skeleton className="h-48 w-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
