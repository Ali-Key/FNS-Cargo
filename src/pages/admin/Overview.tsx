import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Truck,
  CheckCircle2,
  Users,
  Wallet,
  TrendingUp,
  Receipt,
  FileText,
  Plus,
  Zap,
} from "lucide-react";
import { StatTile, PageHeader } from "@/components/dashboard";
import { RecordPaymentModal } from "@/components/dashboard/RecordPaymentModal";
import {
  StatusBadge,
  PaymentBadge,
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
import { listInvoices } from "@/services/financeService";
import type {
  InvoiceWithRelations,
  ShipmentStatus,
  ShipmentWithCustomer,
} from "@/types";
import { formatCurrency } from "@/utils/format";

interface OverviewData {
  dash: DashboardData;
  recent: ShipmentWithCustomer[];
  outstanding: InvoiceWithRelations[];
}

export default function Overview() {
  useDocumentTitle("Dashboard | FNS Cargo");
  const { role, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = role === "Admin";
  const [paying, setPaying] = useState<InvoiceWithRelations | null>(null);

  const fetchOverview = useCallback(async (): Promise<OverviewData> => {
    const [dash, shipments, invoices] = await Promise.all([
      getDashboardData(),
      listShipments({ page: 1, pageSize: 6 }),
      isAdmin
        ? listInvoices({
            page: 1,
            pageSize: 5,
            view: "outstanding",
            orderBy: "balance",
          })
        : Promise.resolve({ rows: [], count: 0 }),
    ]);
    return { dash, recent: shipments.rows, outstanding: invoices.rows };
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
  const outstanding = overview?.outstanding ?? [];
  const stats = overview?.dash.stats ?? null;
  // Only the very first load (no cache yet, nothing to paint) blocks the data
  // regions. A background revalidation keeps showing the last good data.
  const showSkeleton = loading && !overview;
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="space-y-5">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Overview"}
        description="Current operational summary across shipments, customers, and tracking activity."
      />

      {/* Quick actions — the things an operator starts a shift by doing. Not
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
            onClick={() => navigate("/dashboard/invoices")}
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
        <OverviewSkeleton />
      ) : (
        <>
          {/* Five figures, maximum — the questions this screen exists to answer. */}
          <div>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-steel-400">
              {isAdmin ? "Operations & revenue" : "Operations"}
            </p>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
              {isAdmin ? (
                <>
                  <StatTile
                    label="Pending Payments"
                    value={formatCurrency(stats.outstanding_amount ?? 0)}
                    icon={Wallet}
                    tone="navy"
                    to="/dashboard/invoices"
                    hint={`${stats.unpaid_shipments} unpaid shipments`}
                  />
                  <StatTile
                    label="Total Revenue"
                    value={formatCurrency(stats.revenue_total ?? 0)}
                    icon={TrendingUp}
                    tone="delivered"
                    to="/dashboard/analytics"
                    hint={`${formatCurrency(stats.revenue_month ?? 0)} this month`}
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
                    icon={FileText}
                    tone="navy"
                    to="/dashboard/quotes"
                    hint={`${stats.total_quotes} all time`}
                    attention
                  />
                </>
              )}
            </div>
          </div>

          {/* Recent shipments + who to chase for payment */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SectionCard
              title="Recent shipments"
              flush
              className="lg:col-span-2"
              action={
                <Link
                  to="/dashboard/shipments"
                  className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-navy-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                >
                  View all
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
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge status={s.status as ShipmentStatus} />
                          <PaymentBadge status={s.payment_status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            {isAdmin ? (
              <SectionCard
                title="Largest balances owed"
                flush
                action={
                  <Link
                    to="/dashboard/invoices"
                    className="inline-flex items-center gap-1 rounded-md text-sm font-semibold text-navy-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                  >
                    View all
                  </Link>
                }
              >
                {outstanding.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="h-6 w-6" />}
                    title="Nothing outstanding"
                    description="Every issued invoice has been settled."
                  />
                ) : (
                  <ul className="divide-y divide-steel-100">
                    {outstanding.map((inv) => (
                      <li
                        key={inv.id}
                        className="flex items-center justify-between gap-3 px-6 py-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy-900">
                            {inv.customer?.full_name ?? "Unknown customer"}
                          </p>
                          <p className="truncate font-mono text-xs text-text-secondary">
                            {inv.invoice_number}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-tabular text-sm font-bold text-status-delayed">
                            {formatCurrency(inv.balance, 2)}
                          </span>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPaying(inv)}
                          >
                            Collect
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            ) : (
              <SectionCard title="Customers" flush>
                <div className="flex flex-col items-center justify-center gap-1 px-6 py-10 text-center">
                  <Users className="mb-2 h-8 w-8 text-gray-300" />
                  <p className="font-tabular text-3xl font-bold text-navy-900">
                    {stats.active_customers}
                  </p>
                  <p className="text-sm text-text-secondary">
                    Active customers
                  </p>
                </div>
              </SectionCard>
            )}
          </div>
        </>
      )}

      <RecordPaymentModal
        open={!!paying}
        onClose={() => setPaying(null)}
        onSaved={reload}
        invoice={paying}
      />
    </div>
  );
}

/** Mirrors the real layout's grid shape so the swap from skeleton to data causes
 *  no layout shift. */
function OverviewSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="border border-gray-200 bg-white lg:col-span-2">
          <div className="border-b border-gray-200 px-5 py-3.5">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </div>
        <div className="border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-3.5">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
