import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Plus,
  Package,
  Eye,
  Pencil,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Button, StatusBadge, PaymentBadge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Pagination, EmptyState, SkeletonTableRows, SkeletonCard, RowActions, Avatar, DetailRow, CopyButton, MobileRowCard, Alert, PageHeader, ConfirmDialog, DataToolbar } from '@/components/dash'
import { FilterDropdown, ExportMenu } from '@/components/dashboard'
import { ShipmentFormModal } from "@/components/dashboard/ShipmentFormModal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCachedResource } from "@/hooks/useCachedResource";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { listShipments, deleteShipment } from "@/services/shipmentsService";
import { listCustomerOptions } from "@/services/customersService";
import { exportShipmentReportPdf, exportShipmentsCsv } from "@/lib/exports/shipmentsExports";
import type {
  Customer,
  PaymentStatus,
  ShipmentStatus,
  ShippingMethod,
  ShipmentWithCustomer,
} from "@/types";
import { SHIPMENT_STATUSES, SHIPPING_METHODS, PAYMENT_STATUSES } from "@/types";
import {
  STATUS_LABEL,
  SHIPPING_METHOD_LABEL,
  isShipmentDelayed,
} from "@/utils/status";
import { formatDate } from "@/utils/date";
import { formatWeight, formatCurrency } from "@/utils/format";

const PAGE_SIZE = 10;
const FILTER_KEY = "fns.shipments.filters";

type StatusFilter = ShipmentStatus | "all";
type MethodFilter = ShippingMethod | "all";
type PaymentFilter = PaymentStatus | "all";
type DelayedFilter = "all" | "delayed";

const STATUS_OPTIONS = [
  { value: "all" as StatusFilter, label: "All statuses" },
  ...SHIPMENT_STATUSES.map((s) => ({
    value: s as StatusFilter,
    label: STATUS_LABEL[s],
  })),
];
const METHOD_OPTIONS = [
  { value: "all" as MethodFilter, label: "All methods" },
  ...SHIPPING_METHODS.map((m) => ({
    value: m as MethodFilter,
    label: SHIPPING_METHOD_LABEL[m],
  })),
];
const PAYMENT_OPTIONS = [
  { value: "all" as PaymentFilter, label: "All payments" },
  ...PAYMENT_STATUSES.map((p) => ({ value: p as PaymentFilter, label: p })),
];
const DELAYED_OPTIONS = [
  { value: "all" as DelayedFilter, label: "All shipments" },
  { value: "delayed" as DelayedFilter, label: "Delayed only" },
];

function isStatus(v: string | null): v is ShipmentStatus {
  return !!v && (SHIPMENT_STATUSES as readonly string[]).includes(v);
}
function isMethod(v: string | null): v is ShippingMethod {
  return !!v && (SHIPPING_METHODS as readonly string[]).includes(v);
}
function isPayment(v: string | null): v is PaymentStatus {
  return !!v && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export default function Shipments() {
  useDocumentTitle("Shipments | FNS Cargo");
  const toast = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Initial filter state: URL query (deep-link) wins, then the last saved
  // filters from localStorage (survive refresh), then defaults.
  const initial = useMemo(() => {
    let saved: {
      status?: string;
      method?: string;
      payment?: string;
      search?: string;
    } = {};
    try {
      saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? "{}");
    } catch {
      /* ignore */
    }
    const urlStatus = searchParams.get("status");
    const urlMethod = searchParams.get("method");
    const urlPayment = searchParams.get("payment");
    const urlQ = searchParams.get("q");
    return {
      status: (isStatus(urlStatus)
        ? urlStatus
        : isStatus(saved.status ?? null)
          ? saved.status
          : "all") as StatusFilter,
      method: (isMethod(urlMethod)
        ? urlMethod
        : isMethod(saved.method ?? null)
          ? saved.method
          : "all") as MethodFilter,
      payment: (isPayment(urlPayment)
        ? urlPayment
        : isPayment(saved.payment ?? null)
          ? saved.payment
          : "all") as PaymentFilter,
      // The delayed view is only ever entered by deep link from a metric tile,
      // so it is deliberately not persisted between visits.
      delayed: searchParams.get("delayed") === "1",
      search: urlQ ?? saved.search ?? "",
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initial.search);
  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [method, setMethod] = useState<MethodFilter>(initial.method);
  const [payment, setPayment] = useState<PaymentFilter>(initial.payment);
  const [delayedOnly, setDelayedOnly] = useState(initial.delayed);
  const debouncedSearch = useDebouncedValue(search);

  const [customerOptions, setCustomerOptions] = useState<
    Pick<Customer, "id" | "full_name">[]
  >([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShipmentWithCustomer | null>(null);
  const [deleting, setDeleting] = useState<ShipmentWithCustomer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Keyed by the full filter/page signature so revisiting the same view (most
  // often the default landing state) paints instantly from cache while a
  // background request confirms it's current; a new combination just fetches.
  const shipmentsKey = useMemo(
    () =>
      `shipments:${JSON.stringify({ page, search: debouncedSearch, status, method, payment, delayedOnly })}`,
    [page, debouncedSearch, status, method, payment, delayedOnly],
  );
  const fetchShipments = useCallback(
    () =>
      listShipments({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status,
        method,
        payment,
        delayedOnly,
      }),
    [page, debouncedSearch, status, method, payment, delayedOnly],
  );
  const {
    data,
    loading,
    error,
    reload: load,
  } = useCachedResource(shipmentsKey, fetchShipments);
  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;

  useEffect(() => {
    listCustomerOptions()
      .then(setCustomerOptions)
      .catch(() => setCustomerOptions([]));
  }, []);

  // Persist filters so they survive a refresh; reset to first page on change.
  useEffect(() => {
    localStorage.setItem(
      FILTER_KEY,
      JSON.stringify({ status, method, payment, search }),
    );
    setPage(1);
  }, [debouncedSearch, status, method, payment, delayedOnly, search]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filtersActive =
    !!search ||
    status !== "all" ||
    method !== "all" ||
    payment !== "all" ||
    delayedOnly;

  function shipmentFilterSummary() {
    const parts: string[] = [];
    if (status !== "all") parts.push(`Status: ${STATUS_LABEL[status]}`);
    if (method !== "all")
      parts.push(`Method: ${SHIPPING_METHOD_LABEL[method]}`);
    if (payment !== "all") parts.push(`Payment: ${payment}`);
    if (delayedOnly) parts.push("Delayed only");
    if (debouncedSearch) parts.push(`Search: "${debouncedSearch}"`);
    return parts.length ? parts.join(" · ") : "All shipments";
  }

  function clearFilters() {
    setSearch("");
    setStatus("all");
    setMethod("all");
    setPayment("all");
    setDelayedOnly(false);
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(shipment: ShipmentWithCustomer) {
    setEditing(shipment);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteShipment(deleting.id, deleting.tracking_number);
      toast.success(
        "Shipment deleted",
        "The shipment and its tracking history have been removed.",
      );
      setDeleting(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch {
      toast.error("Unable to delete shipment", "Please try again in a moment.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Add, track, and manage every shipment in one place."
        actions={
          <Button
            variant="primary"
            className="text-white"
            icon={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            New shipment
          </Button>
        }
      />

      {error && !data && (
        <Alert variant="error" title="Could not load shipments">
          <p>{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      {/* Sticky filter bar — state persists across refresh */}
      <DataToolbar
        className="sticky top-16 z-20"
        search={search}
        onSearchChange={setSearch}
        placeholder="Search tracking #, customer, origin…"
        filtersActive={filtersActive}
        onReset={clearFilters}
        filters={
          <>
            <FilterDropdown
              label="Status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={setStatus}
            />
            <FilterDropdown
              label="Method"
              options={METHOD_OPTIONS}
              value={method}
              onChange={setMethod}
            />
            <FilterDropdown
              label="Payment"
              options={PAYMENT_OPTIONS}
              value={payment}
              onChange={setPayment}
            />
            <FilterDropdown
              label="Delayed"
              options={DELAYED_OPTIONS}
              value={delayedOnly ? "delayed" : "all"}
              onChange={(v) => setDelayedOnly(v === "delayed")}
            />
          </>
        }
      >
        <ExportMenu
          items={[
            {
              label: "Shipment report (PDF)",
              onClick: () =>
                exportShipmentReportPdf(
                  { search: debouncedSearch, status, method, payment, delayedOnly },
                  shipmentFilterSummary(),
                ),
            },
            {
              label: "Shipment list (CSV)",
              onClick: () =>
                exportShipmentsCsv({ search: debouncedSearch, status, method, payment, delayedOnly }),
            },
          ]}
        />
      </DataToolbar>

      <div className="hidden overflow-hidden rounded-card border border-gray-200 bg-white shadow-elevation-1 sm:block">
        <Table className="min-w-[860px] border-0 lg:min-w-[1240px]">
          <TableHead className="sticky top-0">
            <TableRow>
              <TableHeadCell>Tracking #</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Route</TableHeadCell>
              <TableHeadCell className="hidden lg:table-cell">
                Method
              </TableHeadCell>
              <TableHeadCell className="hidden text-right lg:table-cell">
                Weight
              </TableHeadCell>
              <TableHeadCell className="text-right">Value</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Payment</TableHeadCell>
              <TableHeadCell className="hidden lg:table-cell">
                Assigned
              </TableHeadCell>
              <TableHeadCell>Est. Delivery</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={11} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={11}>
                  <EmptyState
                    icon={<Package className="h-6 w-6" />}
                    title={
                      filtersActive
                        ? "No matching shipments"
                        : "No shipments yet"
                    }
                    description={
                      filtersActive
                        ? "Try changing your search or filters."
                        : "Add your first shipment to get started."
                    }
                    action={
                      filtersActive ? (
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          icon={<Plus className="h-4 w-4" />}
                          onClick={openCreate}
                        >
                          New shipment
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/dashboard/shipments/${s.id}`}
                        className="rounded font-mono text-sm font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                      >
                        {s.tracking_number}
                      </Link>
                      <CopyButton value={s.tracking_number} label="tracking number" />
                    </div>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-navy-800">
                    {s.customer_name}
                  </TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {s.origin} → {s.destination}
                    {s.current_location && (
                      <span className="block text-xs text-steel-400">
                        at {s.current_location}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden text-sm text-steel-600 lg:table-cell">
                    {SHIPPING_METHOD_LABEL[s.shipping_method as ShippingMethod]}
                  </TableCell>
                  <TableCell className="hidden text-right font-tabular text-sm text-steel-600 lg:table-cell">
                    {formatWeight(s.weight)}
                  </TableCell>
                  <TableCell className="text-right font-tabular text-sm text-steel-600">
                    {formatCurrency(s.total_price, 2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge
                      status={s.status as ShipmentStatus}
                      delayed={isShipmentDelayed(
                        s.status,
                        s.estimated_delivery,
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge status={s.payment_status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {s.assignee ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar name={s.assignee.full_name} size="sm" />
                        <span className="text-sm text-steel-600">
                          {s.assignee.full_name}
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-steel-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-tabular text-sm">
                    {isShipmentDelayed(s.status, s.estimated_delivery) ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-status-delayed">
                        <AlertTriangle
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        {formatDate(s.estimated_delivery, "—")}
                      </span>
                    ) : (
                      <span className="text-text-secondary">
                        {formatDate(s.estimated_delivery, "—")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <RowActions
                        label={`Actions for ${s.tracking_number}`}
                        items={[
                          {
                            label: "View shipment",
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () =>
                              navigate(`/dashboard/shipments/${s.id}`),
                          },
                          {
                            label: "Edit shipment",
                            icon: <Pencil className="h-4 w-4" />,
                            onClick: () => openEdit(s),
                          },
                          ...(isAdmin
                            ? [
                                {
                                  label: "Delete shipment",
                                  icon: <Trash2 className="h-4 w-4" />,
                                  onClick: () => setDeleting(s),
                                  danger: true,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list — same data as the table, one card per shipment */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-gray-200 bg-white shadow-elevation-1">
            <EmptyState
              icon={<Package className="h-6 w-6" />}
              title={
                filtersActive ? "No matching shipments" : "No shipments yet"
              }
              description={
                filtersActive
                  ? "Try changing your search or filters."
                  : "Add your first shipment to get started."
              }
              action={
                filtersActive ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon={<Plus className="h-4 w-4" />}
                    onClick={openCreate}
                  >
                    New shipment
                  </Button>
                )
              }
            />
          </div>
        ) : (
          rows.map((s) => (
            <MobileRowCard
              key={s.id}
              header={
                <div className="flex items-center gap-1">
                  <Link
                    to={`/dashboard/shipments/${s.id}`}
                    className="rounded font-mono text-sm font-semibold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                  >
                    {s.tracking_number}
                  </Link>
                  <CopyButton value={s.tracking_number} label="tracking number" />
                </div>
              }
              actions={
                <RowActions
                  label={`Actions for ${s.tracking_number}`}
                  items={[
                    {
                      label: "View shipment",
                      icon: <Eye className="h-4 w-4" />,
                      onClick: () => navigate(`/dashboard/shipments/${s.id}`),
                    },
                    {
                      label: "Edit shipment",
                      icon: <Pencil className="h-4 w-4" />,
                      onClick: () => openEdit(s),
                    },
                    ...(isAdmin
                      ? [
                          {
                            label: "Delete shipment",
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => setDeleting(s),
                            danger: true,
                          },
                        ]
                      : []),
                  ]}
                />
              }
            >
              <DetailRow label="Customer" value={s.customer_name} />
              <DetailRow
                label="Route"
                value={`${s.origin} → ${s.destination}`}
              />
              <DetailRow
                label="Value"
                value={formatCurrency(s.total_price, 2)}
                mono
              />
              <DetailRow label="Status">
                <StatusBadge
                  status={s.status as ShipmentStatus}
                  delayed={isShipmentDelayed(s.status, s.estimated_delivery)}
                />
              </DetailRow>
              <DetailRow label="Payment">
                <PaymentBadge status={s.payment_status} />
              </DetailRow>
              <DetailRow
                label="Est. delivery"
                value={
                  isShipmentDelayed(s.status, s.estimated_delivery) ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-status-delayed">
                      <AlertTriangle
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {formatDate(s.estimated_delivery, "—")}
                    </span>
                  ) : (
                    formatDate(s.estimated_delivery, "—")
                  )
                }
              />
            </MobileRowCard>
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          totalItems={count}
          pageSize={PAGE_SIZE}
        />
      )}

      <ShipmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        shipment={editing}
        customerOptions={customerOptions}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Delete shipment?"
        confirmLabel="Delete"
        description={
          <>
            This permanently removes shipment{" "}
            <span className="font-mono font-semibold text-navy-800">
              {deleting?.tracking_number}
            </span>{" "}
            and its tracking history. This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
