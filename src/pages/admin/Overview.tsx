import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Package,
  Truck,
  CheckCircle2,
  Users,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
  Wallet,
  Receipt,
  Plus,
  Zap,
} from 'lucide-react'
import { MetricTile, PageHeader } from '@/components/dashboard'
import { StatusMixChart, VolumeChart } from '@/components/dashboard/charts'
import { StatusBadge, Spinner, EmptyState, Alert, Button } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { getDashboardData, type DashboardData } from '@/services/dashboardService'
import { listShipments } from '@/services/shipmentsService'
import { listRecentActivity } from '@/services/activityService'
import type { ActivityLog, ShipmentStatus, ShipmentWithCustomer } from '@/types'
import { describeActivity } from '@/utils/activity'
import { formatRelativeToNow } from '@/utils/date'
import { formatCurrency } from '@/utils/format'

export default function Overview() {
  useDocumentTitle('Dashboard | FNS Cargo')
  const { role, profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'Admin'

  const [data, setData] = useState<DashboardData | null>(null)
  const [recent, setRecent] = useState<ShipmentWithCustomer[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError(null)
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
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Unable to load dashboard data.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [isAdmin, reloadKey])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-navy-700" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Overview" description="Operational summary for FNS Cargo." />
        <Alert variant="error" title="Could not load dashboard data">
          <p>{error ?? 'No data was returned.'}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => setReloadKey((k) => k + 1)}
          >
            Retry
          </Button>
        </Alert>
      </div>
    )
  }

  const { stats, monthlyVolume } = data
  const firstName = profile?.full_name?.split(' ')[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : 'Overview'}
        description="Current operational summary across shipments, customers, and tracking activity."
      />

      {/* Quick actions — the four things an operator starts a shift by doing. */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="accent"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate('/dashboard/shipments')}
        >
          New shipment
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Zap className="h-4 w-4 text-accent-500" />}
          onClick={() => window.dispatchEvent(new Event('fns:command'))}
        >
          Quick tracking update
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate('/dashboard/customers')}
        >
          Add customer
        </Button>
        {isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Receipt className="h-4 w-4" />}
            onClick={() => navigate('/dashboard/finance')}
          >
            Raise invoice
          </Button>
        )}
      </div>

      {/* Metric tiles — each deep-linking to its filtered view */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile label="Total Shipments" value={stats.total_shipments} icon={Package} tone="navy" to="/dashboard/shipments" />
        <MetricTile
          label="Active"
          value={stats.active_shipments}
          icon={Truck}
          tone="transit"
          to="/dashboard/shipments?status=In+Transit"
        />
        <MetricTile
          label="Delivered"
          value={stats.delivered_shipments}
          icon={CheckCircle2}
          tone="delivered"
          to="/dashboard/shipments?status=Delivered"
        />
        <MetricTile
          label="Delayed"
          value={stats.delayed_shipments}
          icon={AlertTriangle}
          tone="delayed"
          to="/dashboard/shipments?delayed=1"
          hint="Past estimated delivery"
          attention
        />
      </div>

      {/* Second row: money for admins, customer/quote load for dispatchers. */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Customers"
          value={stats.customers}
          icon={Users}
          tone="navy"
          to="/dashboard/customers"
          hint={`${stats.active_customers} active`}
        />
        {isAdmin ? (
          <>
            <MetricTile
              label="Revenue"
              value={formatCurrency(stats.revenue_total ?? 0)}
              icon={TrendingUp}
              tone="delivered"
              to="/dashboard/analytics"
              hint={`${formatCurrency(stats.revenue_month ?? 0)} this month`}
            />
            <MetricTile
              label="Outstanding"
              value={formatCurrency(stats.outstanding_amount ?? 0)}
              icon={Wallet}
              tone="navy"
              to="/dashboard/finance"
              hint={`${stats.unpaid_shipments} unpaid shipments`}
            />
            <MetricTile
              label="Overdue invoices"
              value={stats.overdue_invoices ?? 0}
              icon={Receipt}
              tone="delayed"
              to="/dashboard/finance"
              attention
            />
          </>
        ) : (
          <>
            <MetricTile
              label="Unpaid shipments"
              value={stats.unpaid_shipments}
              icon={Wallet}
              tone="transit"
              to="/dashboard/shipments?payment=Unpaid"
            />
            <MetricTile
              label="Quote requests"
              value={stats.pending_quotes}
              icon={Receipt}
              tone="navy"
              to="/dashboard/quotes"
              hint={`${stats.total_quotes} all time`}
              attention
            />
            <MetricTile
              label="Countries served"
              value={stats.countries_served}
              icon={Truck}
              tone="navy"
              to="/dashboard/shipments"
            />
          </>
        )}
      </div>

      {/* Bento row: large volume chart + status donut */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-steel-100 bg-white p-6 shadow-elevation-1 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-navy-900">Shipment volume</h2>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-steel-400">Last 6 months</span>
          </div>
          <VolumeChart data={monthlyVolume} />
        </div>
        <div className="rounded-card border border-steel-100 bg-white p-6 shadow-elevation-1">
          <h2 className="mb-4 font-bold text-navy-900">Status mix</h2>
          <StatusMixChart byStatus={stats.status_breakdown} />
        </div>
      </div>

      {/* Bento row: recent shipments + activity / customers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-steel-100 bg-white shadow-elevation-1 lg:col-span-2">
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
              title="No shipments yet"
              description="Shipments you create will appear here."
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

        <div className="rounded-card border border-steel-100 bg-white shadow-elevation-1">
          <div className="border-b border-steel-100 px-6 py-4">
            <h2 className="font-bold text-navy-900">{isAdmin ? 'Recent activity' : 'Customers'}</h2>
          </div>
          {isAdmin ? (
            activity.length === 0 ? (
              <EmptyState title="No activity yet" description="Dashboard actions are recorded here as they happen." />
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
              <p className="font-tabular text-3xl font-bold text-navy-900">{stats.active_customers}</p>
              <p className="text-sm text-steel-500">Active customers</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
