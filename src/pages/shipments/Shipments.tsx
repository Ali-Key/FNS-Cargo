import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  Eye,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Button,
  CopyButton,
  DetailRow,
  IconButton,
  MobileRowCard,
  PaymentBadge,
  RowActions,
  StatusBadge,
  TableCell,
  TableCellPrimary,
  TableHeadCell,
  TableRow,
} from "@/components/ui";
import {
  ConfirmDialog,
  DataToolbar,
  ExportMenu,
  FilterDropdown,
  PageHeader,
  ResponsiveDataList,
} from "@/components/dashboard";
import { ShipmentFormModal } from "@/components/shipments";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCachedResource,
  invalidateCachedResources,
} from "@/hooks/useCachedResource";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { listShipments, deleteShipment } from "@/services/shipmentsService";
import {
  listCustomerOptions,
  type CustomerOption,
} from "@/services/customersService";
import {
  exportShipmentReportPdf,
  exportShipmentsCsv,
} from "@/lib/exports/shipmentsExports";
import type {
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
const FILTER_KEY = "fsn.shipments.filters";

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

/** Stable identity, so the fallback never re-triggers a dependent render. */
const NO_CUSTOMER_OPTIONS: CustomerOption[] = [];

export default function Shipments() {
  useDocumentTitle("Shipments | FSN Cargo");
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
      // The delayed view is only ever entered by deep link from a metric card,
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

  // `?new=1` lets any page hand off straight into the create form.
  const [formOpen, setFormOpen] = useState(
    () => searchParams.get("new") === "1",
  );
  const [editing, setEditing] = useState<ShipmentWithCustomer | null>(null);
  const [deleting, setDeleting] = useState<ShipmentWithCustomer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Changing a filter has to go back to page one. Doing that in an effect
  // fires the query twice — once for the new filter on the old page, then
  // again after the reset — so the correction happens during render, before
  // the fetch key below is read.
  const filterSignature = JSON.stringify({
    search: debouncedSearch,
    status,
    method,
    payment,
    delayedOnly,
  });
  const [lastFilters, setLastFilters] = useState(filterSignature);
  if (lastFilters !== filterSignature) {
    setLastFilters(filterSignature);
    setPage(1);
  }

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

  // The customer list barely changes and every form on the page wants it, so
  // it is fetched once and reused for five minutes rather than on each mount.
  const { data: customerOptionsData } = useCachedResource(
    "customer-options",
    listCustomerOptions,
    { staleTime: 5 * 60_000 },
  );
  const customerOptions = customerOptionsData ?? NO_CUSTOMER_OPTIONS;

  // Persist filters so they survive a refresh.
  useEffect(() => {
    localStorage.setItem(
      FILTER_KEY,
      JSON.stringify({ status, method, payment, search }),
    );
  }, [status, method, payment, search]);

  /**
   * Used after a write. Creating, editing or deleting a shipment also changes
   * what the overview and detail views show, so every cached page is marked
   * stale before this one refetches.
   */
  const refresh = useCallback(() => {
    invalidateCachedResources();
    load();
  }, [load]);

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

  function rowActions(s: ShipmentWithCustomer) {
    return [
      {
        label: "View",
        icon: <Eye className="h-4 w-4" />,
        onClick: () => navigate(`/dashboard/shipments/${s.id}`),
      },
      {
        label: "Edit",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => openEdit(s),
      },
      ...(isAdmin
        ? [
            {
              label: "Delete",
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => setDeleting(s),
              danger: true,
            },
          ]
        : []),
    ];
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
      invalidateCachedResources();
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
    } catch {
      toast.error("Unable to delete shipment", "Please try again in a moment.");
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Shipments"
        description="Live status and settlement state for every consignment."
        crumbs={[{ label: "Operate" }, { label: "Shipments" }]}
        actions={
          <>
            <ExportMenu
              items={[
                {
                  label: "Shipment report (PDF)",
                  onClick: () =>
                    exportShipmentReportPdf(
                      {
                        search: debouncedSearch,
                        status,
                        method,
                        payment,
                        delayedOnly,
                      },
                      shipmentFilterSummary(),
                    ),
                },
                {
                  label: "Shipment list (CSV)",
                  onClick: () =>
                    exportShipmentsCsv({
                      search: debouncedSearch,
                      status,
                      method,
                      payment,
                      delayedOnly,
                    }),
                },
              ]}
            />
            <Button
              variant="deck"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              New shipment
            </Button>
          </>
        }
      />

      {error && !data && (
        <Alert
          variant="error"
          title="Could not load shipments"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <ResponsiveDataList
        rows={rows}
        loading={loading && !data}
        columnCount={8}
        toolbar={
          <DataToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            placeholder="Search tracking number, customer, or origin"
            filtersActive={filtersActive}
            onReset={clearFilters}
            summary={
              loading && !data ? null : (
                <>
                  <span className="font-tabular font-semibold text-deck-800">
                    {count}
                  </span>{" "}
                  {count === 1 ? "shipment" : "shipments"}
                </>
              )
            }
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
                  label="View"
                  options={DELAYED_OPTIONS}
                  value={delayedOnly ? "delayed" : "all"}
                  onChange={(v) => setDelayedOnly(v === "delayed")}
                />
              </>
            }
          />
        }
        tableClassName="min-w-[900px] lg:min-w-[1120px]"
        tableHead={
          <TableRow>
            <TableHeadCell>Consignment</TableHeadCell>
            <TableHeadCell>Customer</TableHeadCell>
            <TableHeadCell className="hidden lg:table-cell">
              Method
            </TableHeadCell>
            <TableHeadCell className="text-center">Value</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Payment</TableHeadCell>
            <TableHeadCell>Est. delivery</TableHeadCell>
            <TableHeadCell className="w-[124px] text-center">Actions</TableHeadCell>
          </TableRow>
        }
        renderRow={(s) => {
          const delayed = isShipmentDelayed(s.status, s.estimated_delivery);
          return (
            <TableRow key={s.id}>
              {/* Identity and route ride in one cell: the pair is what an
                  operator scans for, and splitting them wastes a column. */}
              <TableCellPrimary className="max-w-[280px]">
                <div className="flex items-center gap-1">
                  <Link
                    to={`/dashboard/shipments/${s.id}`}
                    className="deck-focus rounded-chip font-mono text-[13px] font-semibold text-deck-900 underline-offset-2 hover:text-signal-600 hover:underline"
                  >
                    {s.tracking_number}
                  </Link>
                  <CopyButton
                    value={s.tracking_number}
                    label="tracking number"
                  />
                </div>
                <p className="mt-0.5 truncate text-[12px] font-normal text-deck-500">
                  {s.origin} <span className="text-deck-300">→</span>{" "}
                  {s.destination}
                  {s.current_location && (
                    <span className="text-deck-400">
                      {" "}
                      · at {s.current_location}
                    </span>
                  )}
                </p>
              </TableCellPrimary>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar name={s.customer_name} size="sm" />
                  <span className="min-w-0 truncate font-medium text-deck-800">
                    {s.customer_name}
                  </span>
                </div>
              </TableCell>
              <TableCell className="hidden text-deck-600 lg:table-cell">
                {SHIPPING_METHOD_LABEL[s.shipping_method as ShippingMethod]}
                <span className="font-tabular block text-[11px] text-deck-400">
                  {formatWeight(s.weight)}
                </span>
              </TableCell>
              <TableCell className="font-tabular text-center font-semibold text-deck-900">
                {formatCurrency(s.total_price, 2)}
              </TableCell>
              <TableCell>
                <StatusBadge
                  status={s.status as ShipmentStatus}
                  delayed={delayed}
                />
              </TableCell>
              <TableCell>
                <PaymentBadge status={s.payment_status} />
              </TableCell>
              <TableCell className="font-tabular">
                {delayed ? (
                  <span className="inline-flex items-center gap-1.5 font-semibold text-status-delayed-ink">
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatDate(s.estimated_delivery, "—")}
                  </span>
                ) : (
                  <span className="text-deck-500">
                    {formatDate(s.estimated_delivery, "—")}
                  </span>
                )}
              </TableCell>
              <TableCell className="w-[124px] px-3">
                <div className="flex items-center justify-end gap-1.5">
                  <IconButton
                    label={`View ${s.tracking_number}`}
                    title="View shipment"
                    icon={<Eye className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => navigate(`/dashboard/shipments/${s.id}`)}
                  />
                  <IconButton
                    label={`Edit ${s.tracking_number}`}
                    title="Edit shipment"
                    icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                    onClick={() => openEdit(s)}
                  />
                  {isAdmin && (
                    <IconButton
                      label={`Delete ${s.tracking_number}`}
                      title="Delete shipment"
                      tone="danger"
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => setDeleting(s)}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        }}
        renderMobileCard={(s) => {
          const delayed = isShipmentDelayed(s.status, s.estimated_delivery);
          return (
            <MobileRowCard
              key={s.id}
              header={
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/dashboard/shipments/${s.id}`}
                      className="deck-focus truncate rounded-chip font-mono text-[13px] font-semibold text-deck-900"
                    >
                      {s.tracking_number}
                    </Link>
                    <CopyButton
                      value={s.tracking_number}
                      label="tracking number"
                    />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-deck-500">
                    {s.origin} <span className="text-deck-300">→</span>{" "}
                    {s.destination}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge
                      status={s.status as ShipmentStatus}
                      delayed={delayed}
                    />
                    <PaymentBadge status={s.payment_status} />
                  </div>
                </div>
              }
              actions={
                <RowActions
                  label={`Actions for ${s.tracking_number}`}
                  items={rowActions(s)}
                />
              }
            >
              <DetailRow label="Customer" value={s.customer_name} />
              <DetailRow
                label="Method"
                value={
                  SHIPPING_METHOD_LABEL[s.shipping_method as ShippingMethod]
                }
              />
              <DetailRow
                label="Value"
                value={formatCurrency(s.total_price, 2)}
                mono
              />
              <DetailRow
                label="Est. delivery"
                value={
                  delayed ? (
                    <span className="inline-flex items-center gap-1.5 font-semibold text-status-delayed-ink">
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
          );
        }}
        emptyIcon={<Package className="h-5 w-5" />}
        emptyTitle={
          filtersActive ? "No matching shipments" : "No shipments yet"
        }
        emptyDescription={
          filtersActive
            ? "Nothing matches this combination of search and filters. Widen them to see more."
            : "Create the first consignment and it will appear here with a live status and tracking timeline."
        }
        emptyAction={
          filtersActive ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button
              variant="deck"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              New shipment
            </Button>
          )
        }
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          totalItems: count,
          pageSize: PAGE_SIZE,
        }}
      />

      <ShipmentFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        shipment={editing}
        customerOptions={customerOptions}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Delete this shipment?"
        confirmLabel="Delete shipment"
        description={
          <>
            This permanently removes{" "}
            <span className="font-mono font-semibold text-deck-900">
              {deleting?.tracking_number}
            </span>{" "}
            and its entire tracking history. It cannot be undone.
          </>
        }
      />
    </div>
  );
}
