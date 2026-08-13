import { Suspense, lazy, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Command,
  FileText,
  Package,
  Plus,
  Receipt,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/dashboard";
import { RecordPaymentModal } from "@/components/payments";
import {
  Alert,
  Button,
  EmptyState,
  Metric,
  MetricSkeleton,
  Panel,
  PanelBody,
  PanelHeader,
  PaymentBadge,
  Skeleton,
  StatusBadge,
} from "@/components/ui";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
  useCachedResource,
  invalidateCachedResources,
} from "@/hooks/useCachedResource";
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
import { STATUS_HEX, STATUS_STYLES } from "@/utils/status";

/**
 * Recharts is ~330 kB. Keeping it behind `lazy()` means the console's first
 * paint never blocks on it and `vendor-charts` stays a dynamic import.
 */
const ShipmentVolumeChart = lazy(async () => {
  const mod = await import("@/components/dashboard/charts");
  return { default: mod.ShipmentVolumeChart };
});

interface OverviewData {
  dash: DashboardData;
  recent: ShipmentWithCustomer[];
  outstanding: InvoiceWithRelations[];
}

export default function Overview() {
  useDocumentTitle("Overview | FSN Cargo");

  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();

  const [paying, setPaying] =
    useState<InvoiceWithRelations | null>(null);

  const fetchOverview = useCallback(
    async (): Promise<OverviewData> => {
      const [dash, shipments, invoices] = await Promise.all([
        getDashboardData(),

        listShipments({
          page: 1,
          pageSize: 6,
        }),

        isAdmin
          ? listInvoices({
              page: 1,
              pageSize: 5,
              view: "outstanding",
              orderBy: "balance",
            })
          : Promise.resolve({
              rows: [],
              count: 0,
            }),
      ]);

      return {
        dash,
        recent: shipments.rows,
        outstanding: invoices.rows,
      };
    },
    [isAdmin],
  );

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

  const showSkeleton = loading && !overview;

  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="w-full space-y-5">
      {/* ------------------------------------------------------------------ */}
      {/* PAGE HEADER                                                        */}
      {/* ------------------------------------------------------------------ */}

      <PageHeader
        title={
          firstName
            ? `Good to see you, ${firstName}`
            : "Overview"
        }
        description="What is moving right now, and what needs a decision today."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<Command className="h-4 w-4" />}
              onClick={() => {
                window.dispatchEvent(new Event("fsn:command"));
              }}
            >
              Post update
            </Button>

            <Button
              variant="deck"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                navigate("/dashboard/shipments?new=1");
              }}
            >
              New shipment
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------------ */}
      {/* ERROR                                                              */}
      {/* ------------------------------------------------------------------ */}

      {error && !overview && (
        <Alert
          variant="error"
          title="Could not load the console"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={reload}
            >
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* STALE DATA                                                         */}
      {/* ------------------------------------------------------------------ */}

      {error && overview && (
        <Alert
          variant="warning"
          title="Showing the last known figures"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={reload}
            >
              Retry
            </Button>
          }
        >
          The console could not refresh just now, so these numbers may be out of
          date.
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* METRICS                                                            */}
      {/* ------------------------------------------------------------------ */}

      <section
        aria-label={
          isAdmin
            ? "Operations and revenue"
            : "Operations"
        }
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
          {showSkeleton || !stats ? (
            Array.from({ length: 6 }).map((_, index) => (
              <MetricSkeleton key={index} />
            ))
          ) : (
            <>
              <Metric
                label="Total shipments"
                value={stats.total_shipments}
                icon={Package}
                to="/dashboard/shipments"
                hint="All time"
              />

              <Metric
                label="In motion"
                value={stats.active_shipments}
                icon={Truck}
                tone="signal"
                to="/dashboard/shipments?status=In+Transit"
                hint="Not yet delivered"
              />

              <Metric
                label="Delivered"
                value={stats.delivered_shipments}
                icon={CheckCircle2}
                tone="positive"
                to="/dashboard/shipments?status=Delivered"
                hint="Completed consignments"
              />

              <Metric
                label="Needs attention"
                value={stats.delayed_shipments}
                icon={AlertTriangle}
                tone={stats.delayed_shipments > 0 ? "critical" : "default"}
                to="/dashboard/shipments?delayed=1"
                hint="Past their estimated delivery"
              />

              {isAdmin ? (
                <>
                  <Metric
                    label="Outstanding"
                    value={formatCurrency(
                      stats.outstanding_amount ?? 0,
                    )}
                    icon={Wallet}
                    tone="caution"
                    to="/dashboard/payments"
                    hint={`${stats.unpaid_shipments} unpaid shipments`}
                  />

                  <Metric
                    label="Revenue collected"
                    value={formatCurrency(
                      stats.revenue_total ?? 0,
                    )}
                    icon={TrendingUp}
                    tone="positive"
                    to="/dashboard/analytics"
                    hint={`${formatCurrency(
                      stats.revenue_month ?? 0,
                    )} this month`}
                  />
                </>
              ) : (
                <>
                  <Metric
                    label="Unpaid shipments"
                    value={stats.unpaid_shipments}
                    icon={Wallet}
                    tone="caution"
                    to="/dashboard/shipments?payment=Unpaid"
                    hint="Awaiting settlement"
                  />

                  <Metric
                    label="Quote requests"
                    value={stats.pending_quotes}
                    icon={FileText}
                    tone={
                      stats.pending_quotes > 0
                        ? "signal"
                        : "default"
                    }
                    to="/dashboard/quotes"
                    hint={`${stats.total_quotes} all time`}
                  />
                </>
              )}
            </>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* TREND + STATUS MIX                                                 */}
      {/* ------------------------------------------------------------------ */}

      <section
        aria-label="Shipment trend and status mix"
        className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-3"
      >
        <Panel className="min-w-0 overflow-hidden xl:col-span-2">
          <PanelHeader
            title="Shipment volume"
            description="Consignments created month by month."
            icon={BarChart3}
          />

          <PanelBody>
            {showSkeleton || !stats ? (
              <Skeleton className="h-56 w-full" />
            ) : (
              <Suspense
                fallback={<Skeleton className="h-56 w-full" />}
              >
                <ShipmentVolumeChart
                  data={overview?.dash.monthlyVolume ?? []}
                />
              </Suspense>
            )}
          </PanelBody>
        </Panel>

        <Panel className="min-w-0 overflow-hidden">
          <PanelHeader
            title="Where things stand"
            description="Live shipments by stage."
            icon={Activity}
            action={
              <PanelLink to="/dashboard/shipments">
                Shipments
              </PanelLink>
            }
          />

          <PanelBody>
            {showSkeleton || !stats ? (
              <BreakdownSkeleton rows={5} />
            ) : (
              <StatusBreakdown
                breakdown={stats.status_breakdown}
              />
            )}
          </PanelBody>
        </Panel>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CONTENT                                                        */}
      {/* ------------------------------------------------------------------ */}

      <section
        aria-label="Dashboard activity"
        className="grid min-w-0 grid-cols-1 items-start gap-5 xl:grid-cols-3"
      >
        {/* ---------------------------------------------------------------- */}
        {/* LATEST CONSIGNMENTS                                               */}
        {/* ---------------------------------------------------------------- */}

        <Panel className="min-w-0 overflow-hidden xl:col-span-2">
          <PanelHeader
            title="Latest consignments"
            description="The six most recently created shipments."
            icon={Package}
            action={
              <PanelLink to="/dashboard/shipments">
                All shipments
              </PanelLink>
            }
          />

          {showSkeleton ? (
            <ListSkeleton rows={6} />
          ) : recent.length === 0 ? (
            <EmptyState
              icon={<Package className="h-5 w-5" />}
              title="No shipments yet"
              description="Create the first consignment and it will show up here with its live status."
              action={
                <Button
                  variant="deck"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    navigate(
                      "/dashboard/shipments?new=1",
                    );
                  }}
                >
                  New shipment
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-deck-100">
              {recent.map((shipment) => (
                <li key={shipment.id}>
                  <Link
                    to={`/dashboard/shipments/${shipment.id}`}
                    className="
                      deck-focus
                      group
                      flex
                      min-w-0
                      items-center
                      gap-3
                      px-4
                      py-3.5
                      transition-colors
                      hover:bg-deck-50
                      sm:px-5
                    "
                  >
                    {/* Shipment identity */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-[12px] font-semibold tracking-tight text-deck-900 sm:text-[13px]">
                        {shipment.tracking_number}
                      </p>

                      <p className="mt-1 truncate text-[11px] leading-4 text-deck-500 sm:text-[12px]">
                        {shipment.origin}

                        <span
                          className="mx-1.5 text-deck-300"
                          aria-hidden="true"
                        >
                          →
                        </span>

                        {shipment.destination}
                      </p>
                    </div>

                    {/* Desktop status */}
                    <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                      <StatusBadge
                        status={
                          shipment.status as ShipmentStatus
                        }
                      />

                      <PaymentBadge
                        status={shipment.payment_status}
                      />
                    </div>

                    {/* Mobile status */}
                    <StatusBadge
                      status={
                        shipment.status as ShipmentStatus
                      }
                      className="shrink-0 sm:hidden"
                    />

                    <ArrowRight
                      className="
                        hidden
                        h-4
                        w-4
                        shrink-0
                        text-deck-300
                        transition-transform
                        group-hover:translate-x-0.5
                        group-hover:text-signal-600
                        sm:block
                      "
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* ---------------------------------------------------------------- */}
        {/* RIGHT COLUMN                                                      */}
        {/* ---------------------------------------------------------------- */}

        {isAdmin ? (
          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader
              title="Chase list"
              description="Largest balances still owed."
              icon={Wallet}
              action={
                <PanelLink to="/dashboard/payments">
                  Payments
                </PanelLink>
              }
            />

            {showSkeleton ? (
              <ListSkeleton rows={5} />
            ) : outstanding.length === 0 ? (
              <EmptyState
                icon={
                  <CheckCircle2 className="h-5 w-5" />
                }
                title="Nothing outstanding"
                description="Every issued invoice has been settled in full."
              />
            ) : (
              <ul className="divide-y divide-deck-100">
                {outstanding.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="
                      flex
                      min-w-0
                      items-center
                      gap-3
                      px-4
                      py-3.5
                      sm:px-5
                    "
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-semibold text-deck-900 sm:text-[13px]">
                        {invoice.customer?.full_name ??
                          "Unknown customer"}
                      </p>

                      <p className="mt-1 truncate font-mono text-[10px] text-deck-500 sm:text-[11px]">
                        {invoice.invoice_number}
                      </p>
                    </div>

                    <span className="font-tabular shrink-0 text-[12px] font-bold text-status-delayed-ink sm:text-[13px]">
                      {formatCurrency(
                        invoice.balance,
                        2,
                      )}
                    </span>

                    <Button
                      size="xs"
                      variant="subtle"
                      onClick={() => {
                        setPaying(invoice);
                      }}
                    >
                      Collect
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel className="min-w-0 overflow-hidden">
            <PanelHeader
              title="Your desk"
              description="Where to go next."
              icon={Users}
            />

            <div className="divide-y divide-deck-100">
              <div className="px-4 py-5 text-center sm:px-5">
                <p className="font-tabular text-[30px] font-bold leading-none tracking-tight text-deck-900 sm:text-[34px]">
                  {showSkeleton || !stats
                    ? "—"
                    : stats.active_customers}
                </p>

                <p className="mt-1.5 text-[11px] font-medium text-deck-500 sm:text-[12px]">
                  Active customers
                </p>
              </div>

              <DeskLink
                to="/dashboard/tracking"
                icon={Truck}
                label="Post a tracking update"
              />

              <DeskLink
                to="/dashboard/customers"
                icon={Users}
                label="Add a customer"
              />

              <DeskLink
                to="/dashboard/quotes"
                icon={Receipt}
                label="Review quote requests"
              />
            </div>
          </Panel>
        )}
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* PAYMENT MODAL                                                       */}
      {/* ------------------------------------------------------------------ */}

      <RecordPaymentModal
        open={!!paying}
        onClose={() => {
          setPaying(null);
        }}
        onSaved={() => {
          invalidateCachedResources();
          reload();
        }}
        invoice={paying}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SHARED COMPONENTS                                                          */
/* -------------------------------------------------------------------------- */

function PanelLink({
  to,
  children,
}: {
  to: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className="
        deck-focus
        inline-flex
        shrink-0
        items-center
        gap-1
        rounded-chip
        text-[11px]
        font-semibold
        text-deck-500
        transition-colors
        hover:text-signal-600
        sm:text-[12px]
      "
    >
      {children}

      <ArrowRight
        className="h-3.5 w-3.5"
        aria-hidden="true"
      />
    </Link>
  );
}

function DeskLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Users;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="deck-focus group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-deck-50 sm:px-5"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-deck-sm bg-deck-100 text-deck-500 transition-colors group-hover:bg-signal-50 group-hover:text-signal-600">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-deck-800">
        {label}
      </span>

      <ArrowRight
        className="h-4 w-4 shrink-0 text-deck-300 transition-transform group-hover:translate-x-0.5 group-hover:text-signal-600"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Row placeholders shaped like the real list,
 * so loading does not cause layout shift.
 */
function ListSkeleton({
  rows,
}: {
  rows: number;
}) {
  return (
    <ul className="divide-y divide-deck-100">
      {Array.from({ length: rows }).map((_, index) => (
        <li
          key={index}
          className="flex items-center gap-3 px-4 py-3.5 sm:px-5"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-36" />
            <Skeleton className="h-3 w-24" />
          </div>

          <Skeleton className="h-5 w-20 shrink-0 rounded-badge" />
        </li>
      ))}
    </ul>
  );
}
/**
 * Stage mix as label / count / proportion bar. Plain markup rather than a
 * second chart: nine short rows read faster than a donut and cost no bundle.
 */
function StatusBreakdown({
  breakdown,
}: {
  breakdown: Partial<Record<ShipmentStatus, number>>;
}) {
  const rows = (
    Object.keys(STATUS_STYLES) as ShipmentStatus[]
  )
    .map((status) => ({
      status,
      count: breakdown[status] ?? 0,
    }))
    .filter((row) => row.count > 0);

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-[13px] text-deck-400">
        No shipments on record yet.
      </p>
    );
  }

  const total = rows.reduce(
    (sum, row) => sum + row.count,
    0,
  );

  return (
    <ul className="space-y-3">
      {rows.map(({ status, count }) => {
        const share = Math.round((count / total) * 100);

        return (
          <li key={status}>
            <div className="flex items-baseline justify-between gap-3">
              <span
                className={`truncate text-[12px] font-semibold ${STATUS_STYLES[status].text}`}
              >
                {status}
              </span>

              <span className="font-tabular shrink-0 text-[12px] font-bold text-deck-900">
                {count}

                <span className="ml-1.5 font-medium text-deck-400">
                  {share}%
                </span>
              </span>
            </div>

            <div
              className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-deck-100"
              role="presentation"
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(share, 2)}%`,
                  backgroundColor: STATUS_HEX[status],
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Placeholder shaped like the breakdown rows, so loading does not shift. */
function BreakdownSkeleton({ rows }: { rows: number }) {
  return (
    <ul className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <li key={index}>
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-10" />
          </div>

          <Skeleton className="mt-1.5 h-1.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}
