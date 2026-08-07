import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Receipt,
  Pencil,
  Trash2,
  Wallet,
  AlertTriangle,
  CircleDollarSign,
  Eye,
} from "lucide-react";
import { Button, InvoiceBadge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Pagination, EmptyState, SkeletonTableRows, SkeletonCard, RowActions, DetailRow, CopyButton, MobileRowCard, Alert, StatTile, PageHeader, ConfirmDialog, DataToolbar } from '@/components/dash'
import { FilterDropdown, InvoicePreviewModal, ExportMenu } from '@/components/dashboard'
import { InvoiceFormModal } from "@/components/dashboard/InvoiceFormModal";
import { RecordPaymentModal } from "@/components/dashboard/RecordPaymentModal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useToast } from "@/context/ToastContext";
import {
  listInvoices,
  deleteInvoice,
  type InvoiceListParams,
} from "@/services/financeService";
import { exportInvoicesCsv } from "@/lib/exports/financeExports";
import { getDashboardData } from "@/services/dashboardService";
import type { DashboardStats, InvoiceWithRelations } from "@/types";
import { isInvoiceOverdue } from "@/utils/status";
import { formatCurrency } from "@/utils/format";
import { formatDate } from "@/utils/date";

const PAGE_SIZE = 10;

type View = NonNullable<InvoiceListParams["view"]>;

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "all", label: "All invoices" },
  { value: "outstanding", label: "Outstanding" },
  { value: "overdue", label: "Overdue" },
];

export default function Invoices() {
  useDocumentTitle("Invoices | FNS Cargo");
  const toast = useToast();

  const [rows, setRows] = useState<InvoiceWithRelations[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<View>("all");
  const debouncedSearch = useDebouncedValue(search);

  const [stats, setStats] = useState<DashboardStats | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null);
  const [paying, setPaying] = useState<InvoiceWithRelations | null>(null);
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [previewInvoiceId, setPreviewInvoiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listInvoices({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        view,
      });
      setRows(result.rows);
      setCount(result.count);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, view]);

  useEffect(() => {
    load();
  }, [load]);

  const loadStats = useCallback(async () => {
    try {
      const dash = await getDashboardData();
      setStats(dash.stats);
    } catch {
      /* stat tiles just stay at their last known value */
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, view]);

  function refreshAll() {
    void load();
    void loadStats();
  }

  function clearFilters() {
    setSearch("");
    setView("all");
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await deleteInvoice(deleting.id, deleting.invoice_number);
      toast.success(
        "Invoice deleted",
        `${deleting.invoice_number} and its payments have been removed.`,
      );
      setDeleting(null);
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else refreshAll();
    } catch {
      toast.error("Unable to delete invoice", "Please try again in a moment.");
    } finally {
      setDeleteLoading(false);
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filtersActive = !!search || view !== "all";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Raise invoices against shipments and track what's outstanding."
        actions={
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" />}
            className="text-white"
            onClick={openCreate}
          >
            Raise invoice
          </Button>
        }
      />

      {loadError && rows.length === 0 && (
        <Alert variant="error" title="Could not load invoices">
          <p>Please try again.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Outstanding"
          value={formatCurrency(stats?.outstanding_amount ?? 0)}
          icon={Wallet}
          tone="navy"
          hint="Unsettled invoice balances"
        />
        <StatTile
          label="Overdue invoices"
          value={stats?.overdue_invoices ?? 0}
          icon={AlertTriangle}
          tone="delayed"
          attention
        />
        <StatTile
          label="Unpaid shipments"
          value={stats?.unpaid_shipments ?? 0}
          icon={CircleDollarSign}
          tone="transit"
          to="/dashboard/shipments?payment=Unpaid"
        />
      </div>

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search invoice number…"
        filters={<FilterDropdown label="View" options={VIEW_OPTIONS} value={view} onChange={setView} />}
        filtersActive={filtersActive}
        onReset={clearFilters}
      >
        <ExportMenu
          items={[
            {
              label: "Invoices (CSV)",
              onClick: () => exportInvoicesCsv({ search: debouncedSearch, view }),
            },
          ]}
        />
      </DataToolbar>

      <div className="hidden overflow-hidden rounded-card border border-gray-200 bg-white shadow-elevation-1 sm:block">
        <Table className="min-w-[640px] border-0 lg:min-w-[900px]">
          <TableHead className="sticky top-0">
            <TableRow>
              <TableHeadCell>Invoice</TableHeadCell>
              <TableHeadCell className="hidden lg:table-cell">
                Shipment
              </TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell className="text-right">Amount</TableHeadCell>
              <TableHeadCell className="hidden text-right lg:table-cell">
                Paid
              </TableHeadCell>
              <TableHeadCell className="text-right">Balance</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell className="hidden lg:table-cell">
                Due
              </TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={9} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    icon={<Receipt className="h-6 w-6" />}
                    title={
                      filtersActive ? "No matching invoices" : "No invoices yet"
                    }
                    description={
                      filtersActive
                        ? "Try changing your search or filter."
                        : "Raise an invoice against a shipment to start tracking revenue."
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
                          Raise invoice
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((inv) => {
                const overdue = isInvoiceOverdue(
                  inv.status,
                  inv.due_date,
                  inv.balance,
                );
                return (
                  <TableRow key={inv.id}>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-sm font-semibold text-primary-600">
                          {inv.invoice_number}
                        </span>
                        <CopyButton value={inv.invoice_number} label="invoice number" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {inv.shipment ? (
                        <Link
                          to={`/dashboard/shipments/${inv.shipment.id}`}
                          className="rounded font-mono text-sm text-navy-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                        >
                          {inv.shipment.tracking_number}
                        </Link>
                      ) : (
                        <span className="text-sm text-steel-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-steel-600">
                      {inv.customer?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-tabular text-sm font-semibold text-navy-900">
                        {formatCurrency(inv.amount, 2)}
                      </span>
                      {(inv.amount ?? 0) > 0 && (
                        <div className="mt-1 h-1 w-full min-w-[64px] overflow-hidden rounded-full bg-steel-100">
                          <div
                            className="h-full rounded-full bg-status-delivered"
                            style={{
                              width: `${Math.min(100, Math.round(((inv.amount_paid ?? 0) / inv.amount) * 100))}%`,
                            }}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden text-right font-tabular text-sm text-status-delivered lg:table-cell">
                      {formatCurrency(inv.amount_paid, 2)}
                    </TableCell>
                    <TableCell className="text-right font-tabular text-sm font-semibold text-navy-900">
                      {formatCurrency(inv.balance, 2)}
                    </TableCell>
                    <TableCell>
                      <InvoiceBadge status={inv.status} overdue={overdue} />
                    </TableCell>
                    <TableCell className="hidden font-tabular text-sm text-text-secondary lg:table-cell">
                      {formatDate(inv.due_date, "—")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {(inv.balance ?? 0) > 0 && inv.status !== "Void" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setPaying(inv)}
                          >
                            Record payment
                          </Button>
                        )}
                        <RowActions
                          label={`Actions for ${inv.invoice_number}`}
                          items={[
                            {
                              label: "View invoice",
                              icon: <Eye className="h-4 w-4" />,
                              onClick: () => setPreviewInvoiceId(inv.id),
                            },
                            {
                              label: "Edit invoice",
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => {
                                setEditing(inv);
                                setFormOpen(true);
                              },
                            },
                            {
                              label: "Delete invoice",
                              icon: <Trash2 className="h-4 w-4" />,
                              onClick: () => setDeleting(inv),
                              danger: true,
                            },
                          ]}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list — same data as the table, one card per invoice */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-gray-200 bg-white shadow-elevation-1">
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title={filtersActive ? "No matching invoices" : "No invoices yet"}
              description={
                filtersActive
                  ? "Try changing your search or filter."
                  : "Raise an invoice against a shipment to start tracking revenue."
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
                    Raise invoice
                  </Button>
                )
              }
            />
          </div>
        ) : (
          rows.map((inv) => {
            const overdue = isInvoiceOverdue(
              inv.status,
              inv.due_date,
              inv.balance,
            );
            return (
              <MobileRowCard
                key={inv.id}
                header={
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-sm font-semibold text-primary-600">
                      {inv.invoice_number}
                    </span>
                    <CopyButton value={inv.invoice_number} label="invoice number" />
                  </div>
                }
                actions={
                  <RowActions
                    label={`Actions for ${inv.invoice_number}`}
                    items={[
                      {
                        label: "View invoice",
                        icon: <Eye className="h-4 w-4" />,
                        onClick: () => setPreviewInvoiceId(inv.id),
                      },
                      {
                        label: "Edit invoice",
                        icon: <Pencil className="h-4 w-4" />,
                        onClick: () => {
                          setEditing(inv);
                          setFormOpen(true);
                        },
                      },
                      {
                        label: "Delete invoice",
                        icon: <Trash2 className="h-4 w-4" />,
                        onClick: () => setDeleting(inv),
                        danger: true,
                      },
                    ]}
                  />
                }
                footer={
                  (inv.balance ?? 0) > 0 && inv.status !== "Void" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => setPaying(inv)}
                    >
                      Record payment
                    </Button>
                  ) : undefined
                }
              >
                <DetailRow
                  label="Customer"
                  value={inv.customer?.full_name ?? "—"}
                />
                <DetailRow
                  label="Amount"
                  value={formatCurrency(inv.amount, 2)}
                  mono
                />
                <DetailRow
                  label="Balance"
                  value={formatCurrency(inv.balance, 2)}
                  mono
                />
                <DetailRow label="Status">
                  <InvoiceBadge status={inv.status} overdue={overdue} />
                </DetailRow>
                <DetailRow
                  label="Due"
                  value={formatDate(inv.due_date, "—")}
                />
              </MobileRowCard>
            );
          })
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

      <InvoicePreviewModal
        open={!!previewInvoiceId}
        onClose={() => setPreviewInvoiceId(null)}
        invoiceId={previewInvoiceId}
      />

      <InvoiceFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refreshAll}
        invoice={editing}
      />

      <RecordPaymentModal
        open={!!paying}
        onClose={() => setPaying(null)}
        onSaved={refreshAll}
        invoice={paying}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Delete invoice?"
        confirmLabel="Delete"
        description={
          <>
            This permanently removes invoice{" "}
            <span className="font-mono font-semibold text-navy-800">
              {deleting?.invoice_number}
            </span>{" "}
            and every payment recorded against it. This action cannot be undone.
          </>
        }
      />
    </div>
  );
}
