import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package, Truck, AlertTriangle, CheckCircle2, Users, ArrowRight } from 'lucide-react'
import { MetricTile, PageHeader } from '@/components/dashboard'
import { StatusMixChart, VolumeChart } from '@/components/dashboard/charts'
import { StatusBadge, Spinner, EmptyState } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { getDashboardData, type DashboardData } from '@/services/dashboardService'
import { listShipments } from '@/services/shipmentsService'
import { listRecentActivity } from '@/services/activityService'
import type { ActivityLog, ShipmentStatus, ShipmentWithCustomer } from '@/types'
import { describeActivity } from '@/utils/activity'
import { formatRelativeToNow } from '@/utils/date'

export default function Overview() {
  useDocumentTitle('Dashboard · FNS Cargo')
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [data, setData] = useState<DashboardData | null>(null)
  const [recent, setRecent] = useState<ShipmentWithCustomer[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [dash, shipments] = await Promise.all([
          getDashboardData(),
          listShipments({ page: 1, pageSize: 6 }),
        ])
        const acts = isAdmin ? await listRecentActivity(8) : []
        if (!active) return
        setData(dash)
        setRecent(shipments.rows)
        setActivity(acts)
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [isAdmin])

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-navy-700" />
      </div>
    )
  }

  const { stats, monthlyVolume, metrics } = data

  return (
    <div className="space-y-8">
      <PageHeader title="Overview" description="Here's how things are looking right now." />

      {/* Metric tiles — value + delta + sparkline, each deep-linking to its filtered view */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile label="Total Shipments" metric={metrics.total} icon={Package} tone="navy" to="/dashboard/shipments" />
        <MetricTile
          label="Active"
          metric={metrics.active}
          icon={Truck}
          tone="transit"
          to="/dashboard/shipments?status=in_transit"
        />
        <MetricTile
          label="Delivered"
          metric={metrics.delivered}
          icon={CheckCircle2}
          tone="delivered"
          to="/dashboard/shipments?status=delivered"
        />
        <MetricTile
          label="Delayed"
          metric={metrics.delayed}
          icon={AlertTriangle}
          tone="delayed"
          to="/dashboard/shipments?status=delayed"
          attention
          invertDelta
        />
      </div>

      {/* Bento row: large volume chart + status donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Shipment volume</h2>
            <span className="text-xs font-medium text-steel-400">Last 6 months</span>
          </div>
          <VolumeChart data={monthlyVolume} />
        </div>
        <div className="rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1">
          <h2 className="mb-4 font-bold text-navy-900">Status mix</h2>
          <StatusMixChart byStatus={stats.byStatus} />
        </div>
      </div>

      {/* Bento row: recent shipments + activity / customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-steel-100 bg-white shadow-elevation-1 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-steel-100 px-6 py-4">
            <h2 className="font-bold text-navy-900">Recent shipments</h2>
            <Link
              to="/dashboard/shipments"
              className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-navy-700 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title="Nothing here yet"
              description="Once you add a shipment, it'll show up here."
            />
          ) : (
            <ul className="divide-y divide-steel-100">
              {recent.map((s) => (
                <li key={s.id}>
                  <Link
                    to={`/dashboard/shipments/${s.id}`}
                    className="flex items-center justify-between gap-3 px-6 py-3.5 transition-colors hover:bg-navy-50/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-sm font-semibold text-navy-900">{s.tracking_number}</p>
                      <p className="truncate text-xs text-steel-500">
                        {s.origin} → {s.destination}
                      </p>
                    </div>
                    <StatusBadge status={s.status as ShipmentStatus} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-steel-100 bg-white shadow-elevation-1">
          <div className="border-b border-steel-100 px-6 py-4">
            <h2 className="font-bold text-navy-900">{isAdmin ? 'Recent activity' : 'Customers'}</h2>
          </div>
          {isAdmin ? (
            activity.length === 0 ? (
              <EmptyState title="Nothing's happened yet" description="Actions you take around the dashboard will show up here." />
            ) : (
              <ul className="divide-y divide-steel-100">
                {activity.map((log) => {
                  const { label, icon: Icon, tone, detail } = describeActivity(log)
                  return (
                    <li key={log.id} className="flex items-start gap-3 px-6 py-3">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-800">{label}</p>
                        {detail && <p className="truncate text-xs text-steel-500">{detail}</p>}
                      </div>
                      <span className="whitespace-nowrap text-xs text-steel-400">
                        {formatRelativeToNow(log.created_at)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
              <Users className="mb-2 h-8 w-8 text-steel-300" />
              <p className="font-tabular text-3xl font-bold text-navy-900">{stats.activeCustomers}</p>
              <p className="text-sm text-steel-500">active customers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
