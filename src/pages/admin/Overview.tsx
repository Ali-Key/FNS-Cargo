import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import { StatTile, PageHeader } from "@/components/dashboard";
import { StatusMixChart, VolumeChart } from "@/components/dashboard/charts";
import {
  StatusBadge,
  EmptyState,
  Alert,
  Button,
  SkeletonCard,
  Skeleton,
  SectionCard,
} from "@/components/ui";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useCachedResource } from "@/hooks/useCachedResource";
import { useAuth } from "@/context/AuthContext";
import {
  getDashboardData,
  type DashboardData,
} from "@/services/dashboardService";
import { listShipments } from "@/services/shipmentsService";
import { listRecentActivity } from "@/services/activityService";
import type {
  ActivityLog,
  ShipmentStatus,
  ShipmentWithCustomer,
} from "@/types";
import { describeActivity } from "@/utils/activity";
import { formatRelativeToNow } from "@/utils/date";
import { formatCurrency } from "@/utils/format";

interface OverviewData {
  dash: DashboardData;
  recent: ShipmentWithCustomer[];
  activity: ActivityLog[];
}

export default function Overview() {
  useDocumentTitle("Dashboard | FNS Cargo");
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "Admin";

  const fetchOverview = useCallback(async (): Promise<OverviewData> => {
    const [dash, shipments, acts] = await Promise.all([
      getDashboardData(),
      listShipments({ page: 1, pageSize: 6 }),
      isAdmin ? listRecentActivity(8) : Promise.resolve([]),
    ]);
    return { dash, recent: shipments.rows, activity: acts };
  }, [isAdmin]);

  // Keyed by role: an admin and a dispatcher see different metric sets, so a role
  // switch must not paint the other role's cached shape.
  const {
    data: overview,
    loading,
    error,
    reload,
  } = useCachedResource<OverviewData>(
    `overview:${isAdmin ? "admin" : "ops"}`,
    fetchOverview,
  );
  const recent = overview?.recent ?? [];
  const activity = overview?.activity ?? [];
  const stats = overview?.dash.stats ?? null;
  const monthlyVolume = overview?.dash.monthlyVolume ?? [];
  // Only the very first load (no cache yet, nothing to paint) blocks the data
  // regions. A background revalidation keeps showing the last good data.
  const showSkeleton = loading && !overview;
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Current operational summary across shipments, customers, and tracking activity."
      />

      {/* Quick actions — the four things an operator starts a shift by doing. Not
          gated on data, so they're clickable the instant the page opens. */}
      <div className="flex flex-wrap gap-2">
        <Button
          className="text-white"
          variant="primary"
          size="sm"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => navigate("/dashboard/shipments")}
        >
          New shipment
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Zap className="h-4 w-4 text-primary-500" />}
          onClick={() => window.dispatchEvent(new Event("fns:command"))}
        >
          Quick tracking update
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate("/dashboard/customers")}
        >
          Add customer
        </Button>
        {isAdmin && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Receipt className="h-4 w-4" />}
            onClick={() => navigate("/dashboard/finance")}
          >
            Raise invoice
          </Button>
        )}
      </div>

      {error && !overview && (
        <Alert variant="error" title="Could not load dashboard data">
          <p>{error}</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={reload}
          >
            Retry
          </Button>
        </Alert>
      )}

      {showSkeleton || !stats ? (
        <OverviewSkeleton isAdmin={isAdmin} />
      ) : (
        <>
          {/* Metric tiles — each deep-linking to its filtered view */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-steel-400">
              Shipment volume
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Total Shipments"
                value={stats.total_shipments}
                icon={Package}
                tone="navy"
                to="/dashboard/shipments"
              />
              <StatTile
                label="Active"
                value={stats.active_shipments}
                icon={Truck}
                tone="transit"
                to="/dashboard/shipments?status=In+Transit"
              />
              <StatTile
                label="Delivered"
                value={stats.delivered_shipments}
                icon={CheckCircle2}
                tone="delivered"
                to="/dashboard/shipments?status=Delivered"
              />
              <StatTile
                label="Delayed"
                value={stats.delayed_shipments}
                icon={AlertTriangle}
                tone="delayed"
                to="/dashboard/shipments?delayed=1"
                hint="Past estimated delivery"
                attention
              />
            </div>
          </div>

          {/* Second row: money for admins, customer/quote load for dispatchers. */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-steel-400">
              {isAdmin ? "Revenue & billing" : "Accounts & workload"}
            </p>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatTile
                label="Customers"
                value={stats.customers}
                icon={Users}
                tone="navy"
                to="/dashboard/customers"
                hint={`${stats.active_customers} active`}
              />
              {isAdmin ? (
                <>
                  <StatTile
                    label="Revenue"
                    value={formatCurrency(stats.revenue_total ?? 0)}
                    icon={TrendingUp}
                    tone="delivered"
                    to="/dashboard/analytics"
                    hint={`${formatCurrency(stats.revenue_month ?? 0)} this month`}
                  />
                  <StatTile
                    label="Outstanding"
                    value={formatCurrency(stats.outstanding_amount ?? 0)}
                    icon={Wallet}
                    tone="navy"
                    to="/dashboard/finance"
                    hint={`${stats.unpaid_shipments} unpaid shipments`}
                  />
                  <StatTile
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
                  <StatTile
                    label="Unpaid shipments"
                    value={stats.unpaid_shipments}
                    icon={Wallet}
                    tone="transit"
                    to="/dashboard/shipments?payment=Unpaid"
                  />
                  <StatTile
                    label="Quote requests"
                    value={stats.pending_quotes}
                    icon={Receipt}
                    tone="navy"
                    to="/dashboard/quotes"
                    hint={`${stats.total_quotes} all time`}
                    attention
                  />
                  <StatTile
                    label="Countries served"
                    value={stats.countries_served}
                    icon={Truck}
                    tone="navy"
                    to="/dashboard/shipments"
                  />
                </>
              )}
            </div>
          </div>

          {/* Bento row: large volume chart + status donut */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard
              title="Shipment volume"
              note="Last 6 months"
              className="lg:col-span-2"
            >
              <VolumeChart data={monthlyVolume} />
            </SectionCard>
            <SectionCard title="Status mix">
              <StatusMixChart byStatus={stats.status_breakdown} />
            </SectionCard>
          </div>

          {/* Bento row: recent shipments + activity / customers */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <SectionCard
              title="Recent shipments"
              flush
              className="lg:col-span-2"
              action={
                <Link
                  to="/dashboard/shipments"
                  className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-navy-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                >
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              }
            >
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
                          <p className="truncate font-mono text-sm font-semibold text-navy-900">
                            {s.tracking_number}
                          </p>
                          <p className="truncate text-xs text-text-secondary">
                            {s.origin} → {s.destination}
                          </p>
                        </div>
                        <StatusBadge status={s.status as ShipmentStatus} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard
              title={isAdmin ? "Recent activity" : "Customers"}
              flush
            >
              {isAdmin ? (
                activity.length === 0 ? (
                  <EmptyState
                    title="No activity yet"
                    description="Dashboard actions are recorded here as they happen."
                  />
                ) : (
                  <ul className="divide-y divide-steel-100">
                    {activity.map((log) => {
                      const {
                        label,
                        icon: Icon,
                        tone,
                        detail,
                      } = describeActivity(log);
                      return (
                        <li
                          key={log.id}
                          className="flex items-start gap-3 px-6 py-3"
                        >
                          <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy-800">
                              {label}
                            </p>
                            {detail && (
                              <p className="truncate text-xs text-text-secondary">
                                {detail}
                              </p>
                            )}
                          </div>
                          <span className="whitespace-nowrap text-xs text-steel-400">
                            {formatRelativeToNow(log.created_at)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                  <Users className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="font-tabular text-3xl font-bold text-navy-900">
                    {stats.active_customers}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Active customers
                  </p>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

/** Mirrors the real layout's grid shape so the swap from skeleton to data causes
 *  no layout shift. */
function OverviewSkeleton({ isAdmin }: { isAdmin: boolean }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-elevation-1 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-40" />
          <Skeleton className="h-56 w-full" />
        </div>
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-elevation-1">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="h-56 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-elevation-1 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-36" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="rounded-card border border-gray-200 bg-white p-6 shadow-elevation-1">
          <Skeleton className="mb-4 h-4 w-28" />
          <div className="space-y-3">
            {Array.from({ length: isAdmin ? 5 : 2 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
