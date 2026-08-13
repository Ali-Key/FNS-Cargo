import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FileText,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DetailRow,
  IconButton,
  MobileRowCard,
  RowActions,
  TableCell,
  TableCellPrimary,
  TableHeadCell,
  TableRow,
} from "@/components/ui";
import {
  PageHeader,
  DataToolbar,
  ConfirmDialog,
  ResponsiveDataList,
} from "@/components/dashboard";
import { CustomerFormModal } from "@/components/customers";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import {
  useCachedResource,
  invalidateCachedResources,
} from "@/hooks/useCachedResource";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  listCustomers,
  deleteCustomer,
  getCustomerBalances,
  type CustomerBalance,
} from "@/services/customersService";
import { listShipmentsForCustomer } from "@/services/shipmentsService";
import { listCustomerInvoices } from "@/services/financeService";
import { getSystemSettings } from "@/services/settingsService";
import type { Customer } from "@/types";
import { formatDate } from "@/utils/date";
import { formatCurrency } from "@/utils/format";
import { activeVariant } from "@/utils/status";

const PAGE_SIZE = 10;

export default function Customers() {
  useDocumentTitle("Customers | FSN Cargo");

  const toast = useToast();
  // Mirrors the RPC's is_admin() gate (role *and* Active status), so the
  // columns the page renders always match the ones the server will fill.
  const { isAdmin } = useAuth();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Searching has to go back to page one. Doing that in an effect fires the
  // query twice — once for the new term on the old page, then again after the
  // reset — so the correction happens during render, before the key is read.
  const [lastSearch, setLastSearch] = useState(debouncedSearch);
  if (lastSearch !== debouncedSearch) {
    setLastSearch(debouncedSearch);
    setPage(1);
  }

  // Keyed by page + search so the common default view
  // paints instantly from cache while a background request confirms it.
  const customersKey = useMemo(
    () =>
      `customers:${JSON.stringify({
        page,
        search: debouncedSearch,
      })}`,
    [page, debouncedSearch],
  );

  const fetchCustomers = useCallback(
    () =>
      listCustomers({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
      }),
    [page, debouncedSearch],
  );

  const {
    data,
    loading,
    error,
    reload: load,
  } = useCachedResource(customersKey, fetchCustomers);

  const rows = data?.rows ?? [];
  const count = data?.count ?? 0;

  // Stable across renders that return the same page of customers.
  const rowIdsKey = rows.map((c) => c.id).join(",");

  // Shipment/payment aggregates for just the customers on this page.
  const [balances, setBalances] = useState<Record<string, CustomerBalance>>({});
  const [balancesError, setBalancesError] = useState<string | null>(null);
  // Bumped by the banner’s Retry so a transient failure does not leave the
  // shipment/paid/owed columns empty until the page changes.
  const [balancesReload, setBalancesReload] = useState(0);

  useEffect(() => {
    if (!rowIdsKey) {
      setBalances({});
      setBalancesError(null);
      return;
    }

    let active = true;

    getCustomerBalances(rowIdsKey.split(","))
      .then((result) => {
        if (!active) return;

        setBalances(Object.fromEntries(result.map((b) => [b.customer_id, b])));
        setBalancesError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;

        // The rest of the list still works, but say so rather than leaving the
        // shipment/paid/owed columns looking like a customer with no activity.
        setBalances({});
        setBalancesError(
          err instanceof Error ? err.message : "Please try again in a moment.",
        );
      });

    return () => {
      active = false;
    };
  }, [rowIdsKey, balancesReload]);

  /**
   * Used after a write. A customer change also moves the counts the overview
   * shows and the names the shipment forms offer, so every cached page is
   * marked stale before this one refetches.
   */
  const refresh = useCallback(() => {
    invalidateCachedResources();
    load();
  }, [load]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function customerActionItems(c: Customer) {
    return [
      {
        label: "Edit customer",
        icon: <Pencil className="h-4 w-4" />,
        onClick: () => {
          setEditing(c);
          setFormOpen(true);
        },
      },
      {
        label: "Statement (PDF)",
        icon: <FileText className="h-4 w-4" />,
        onClick: () => void downloadCustomerStatement(c),
      },
      {
        label: "Delete customer",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => setDeleting(c),
        danger: true,
      },
    ];
  }

  async function downloadCustomerStatement(customer: Customer) {
    try {
      const [shipments, invoices, settings] = await Promise.all([
        listShipmentsForCustomer(customer.id),
        listCustomerInvoices(customer.id),
        getSystemSettings(),
      ]);

      const [{ CustomerStatementDocument }, { downloadPdf }] =
        await Promise.all([
          import("@/lib/documents/CustomerStatementDocument"),
          import("@/lib/documents/generatePdf"),
        ]);

      await downloadPdf(
        <CustomerStatementDocument
          customer={customer}
          shipments={shipments}
          invoices={invoices}
          company={
            settings ?? {
              company_name: "FSN Cargo",
            }
          }
        />,
        `statement-${customer.full_name
          .trim()
          .replace(/\s+/g, "-")
          .toLowerCase()}.pdf`,
      );
    } catch (err) {
      toast.error(
        "Unable to generate statement",
        err instanceof Error ? err.message : "Please try again.",
      );
    }
  }

  async function confirmDelete() {
    if (!deleting) return;

    setDeleteLoading(true);

    try {
      await deleteCustomer(deleting.id, deleting.full_name);

      toast.success(
        "Customer removed",
        `${deleting.full_name}'s record has been deleted.`,
      );

      setDeleting(null);

      invalidateCachedResources();

      if (rows.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        load();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (/foreign key|violates/i.test(message)) {
        toast.error(
          "Customer is in use",
          "This customer is linked to existing shipments and cannot be deleted.",
        );
      } else {
        toast.error(
          "Unable to remove customer",
          "Please try again in a moment.",
        );
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        description={
          isAdmin
            ? "Shipment counts, paid, and outstanding balance per account."
            : "Balances are visible to administrators only."
        }
        crumbs={[{ label: "Commercial" }, { label: "Customers" }]}
        actions={
          isAdmin ? (
            <Button
              variant="deck"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New customer
            </Button>
          ) : undefined
        }
      />

      {error && !data && (
        <Alert
          variant="error"
          title="Could not load customers"
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

      {balancesError && (
        <Alert
          variant="warning"
          title="Shipment and balance totals unavailable"
          className="mb-4"
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setBalancesReload((n) => n + 1)}
            >
              Retry
            </Button>
          }
        >
          {balancesError}
        </Alert>
      )}

      <ResponsiveDataList
        rows={rows}
        loading={loading && !data}
        columnCount={isAdmin ? 7 : 4}
        toolbar={
          <DataToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            placeholder="Search name, email, phone, or city"
            summary={
              loading && !data ? null : (
                <>
                  <span className="font-tabular font-semibold text-deck-800">
                    {count}
                  </span>{" "}
                  {count === 1 ? "customer" : "customers"}
                </>
              )
            }
            filtersActive={!!search}
            onReset={() => setSearch("")}
          />
        }
        tableClassName="min-w-[680px] lg:min-w-[900px]"
        tableHead={
          <TableRow>
            <TableHeadCell>Customer</TableHeadCell>

            <TableHeadCell className="hidden lg:table-cell">
              Contact
            </TableHeadCell>

            <TableHeadCell className="text-center">Shipments</TableHeadCell>

            {isAdmin && (
              <TableHeadCell className="text-center">Paid</TableHeadCell>
            )}

            {isAdmin && (
              <TableHeadCell className="text-center">Owed</TableHeadCell>
            )}

            <TableHeadCell>Status</TableHeadCell>

            {isAdmin && (
              <TableHeadCell className="w-[124px] text-center">
                Actions
              </TableHeadCell>
            )}
          </TableRow>
        }
        renderRow={(c) => {
          const balance = balances[c.id];
          const owed = balance?.balance_owed ?? 0;

          return (
            <TableRow key={c.id}>
              <TableCellPrimary>
                <div className="flex items-center gap-3">
                  <Avatar name={c.full_name} />

                  <div className="min-w-0">
                    <p className="truncate text-deck-900">{c.full_name}</p>

                    <p className="mt-0.5 text-[11px] font-normal text-deck-400">
                      Since {formatDate(c.created_at)}
                    </p>
                  </div>
                </div>
              </TableCellPrimary>

              <TableCell className="hidden lg:table-cell">
                <div className="space-y-0.5">
                  {c.email && (
                    <span className="flex items-center gap-1.5 text-deck-600">
                      <Mail
                        className="h-3.5 w-3.5 text-deck-400"
                        aria-hidden="true"
                      />
                      {c.email}
                    </span>
                  )}

                  {c.phone && (
                    <span className="flex items-center gap-1.5 text-deck-600">
                      <Phone
                        className="h-3.5 w-3.5 text-deck-400"
                        aria-hidden="true"
                      />
                      {c.phone}
                    </span>
                  )}

                  {!c.email && !c.phone && (
                    <span className="text-deck-300">—</span>
                  )}
                </div>
              </TableCell>

              <TableCell className="font-tabular text-center font-semibold text-deck-900">
                {balance ? (
                  balance.shipment_count
                ) : (
                  <span className="text-deck-300">
                    {balancesError ? "—" : "…"}
                  </span>
                )}
              </TableCell>

              {isAdmin && (
                <TableCell className="font-tabular text-center text-status-delivered-ink">
                  {balance?.total_paid != null
                    ? formatCurrency(balance.total_paid, 2)
                    : "—"}
                </TableCell>
              )}

              {isAdmin && (
                <TableCell
                  className={`font-tabular text-center font-semibold ${
                    owed > 0 ? "text-status-delayed-ink" : "text-deck-400"
                  }`}
                >
                  {balance?.balance_owed != null
                    ? formatCurrency(balance.balance_owed, 2)
                    : "—"}
                </TableCell>
              )}

              <TableCell>
                <Badge variant={activeVariant(c.status)}>
                  {c.status === "Active" ? "Active" : "Disabled"}
                </Badge>
              </TableCell>

              {isAdmin && (
                <TableCell className="w-[124px] px-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <IconButton
                      label={`Edit ${c.full_name}`}
                      title="Edit customer"
                      icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => {
                        setEditing(c);
                        setFormOpen(true);
                      }}
                    />

                    <IconButton
                      label={`Download statement for ${c.full_name}`}
                      title="Download statement"
                      icon={<FileText className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => void downloadCustomerStatement(c)}
                    />

                    <IconButton
                      label={`Delete ${c.full_name}`}
                      title="Delete customer"
                      tone="danger"
                      icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                      onClick={() => setDeleting(c)}
                    />
                  </div>
                </TableCell>
              )}
            </TableRow>
          );
        }}
        renderMobileCard={(c) => {
          const balance = balances[c.id];

          return (
            <MobileRowCard
              key={c.id}
              header={
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={c.full_name} size="sm" />

                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-deck-900">
                      {c.full_name}
                    </p>

                    <Badge variant={activeVariant(c.status)} className="mt-1">
                      {c.status === "Active" ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              }
              actions={
                isAdmin ? (
                  <RowActions
                    label={`Actions for ${c.full_name}`}
                    items={customerActionItems(c)}
                  />
                ) : undefined
              }
            >
              <DetailRow label="Email" value={c.email || "—"} />

              <DetailRow label="Phone" value={c.phone || "—"} />

              <DetailRow
                label="Shipments"
                value={balance ? String(balance.shipment_count) : "—"}
                mono
              />

              {isAdmin && (
                <DetailRow
                  label="Paid"
                  value={
                    balance?.total_paid != null
                      ? formatCurrency(balance.total_paid, 2)
                      : "—"
                  }
                  mono
                />
              )}

              {isAdmin && (
                <DetailRow
                  label="Owed"
                  value={
                    balance?.balance_owed != null
                      ? formatCurrency(balance.balance_owed, 2)
                      : "—"
                  }
                  mono
                />
              )}

              <DetailRow
                label="Customer since"
                value={formatDate(c.created_at)}
              />
            </MobileRowCard>
          );
        }}
        emptyIcon={<Users className="h-5 w-5" />}
        emptyTitle={search ? "No matching customers" : "No customers yet"}
        emptyDescription={
          search
            ? "Nothing matches that search. Try a name, email, phone number, or city."
            : "Add the first customer and their shipments, balances, and statements will collect here."
        }
        emptyAction={
          isAdmin && !search ? (
            <Button
              variant="deck"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New customer
            </Button>
          ) : undefined
        }
        pagination={{
          page,
          pageCount,
          onPageChange: setPage,
          totalItems: count,
          pageSize: PAGE_SIZE,
        }}
      />

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
        customer={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove this customer?"
        confirmLabel="Remove customer"
        description={
          <>
            This permanently removes{" "}
            <span className="font-semibold text-deck-900">
              {deleting?.full_name}
            </span>{" "}
            from your customer records. Customers linked to existing shipments
            cannot be removed.
          </>
        }
      />
    </div>
  );
}
