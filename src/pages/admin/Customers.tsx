import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus,
  Users,
  Pencil,
  Trash2,
  Mail,
  Phone,
  FileText,
} from "lucide-react";
import { Button, Badge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Pagination, EmptyState, SkeletonTableRows, Avatar, RowActions, Alert, PageHeader, DataToolbar, ConfirmDialog } from '@/components/dash'
import { CustomerFormModal } from "@/components/dashboard/CustomerFormModal";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useCachedResource } from "@/hooks/useCachedResource";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import {
  listCustomers,
  deleteCustomer,
} from "@/services/customersService";
import { listShipmentsForCustomer } from "@/services/shipmentsService";
import { listCustomerInvoices } from "@/services/financeService";
import { getSystemSettings } from "@/services/settingsService";
import type { Customer } from "@/types";
import { formatDate } from "@/utils/date";
import { activeVariant } from "@/utils/status";

const PAGE_SIZE = 10;

export default function Customers() {
  useDocumentTitle("Customers | FNS Cargo");
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = role === "Admin";

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Keyed by page + search so the common default view (page 1, no search)
  // paints instantly from cache while a background request confirms it.
  const customersKey = useMemo(
    () => `customers:${JSON.stringify({ page, search: debouncedSearch })}`,
    [page, debouncedSearch],
  );
  const fetchCustomers = useCallback(
    () => listCustomers({ page, pageSize: PAGE_SIZE, search: debouncedSearch }),
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

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

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
          company={settings ?? { company_name: "FNS Cargo" }}
        />,
        `statement-${customer.full_name.trim().replace(/\s+/g, "-").toLowerCase()}.pdf`,
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
      if (rows.length === 1 && page > 1) setPage((p) => p - 1);
      else load();
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
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={
          isAdmin
            ? "Keep track of your customers and how to reach them."
            : "A read-only list of your customers."
        }
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              className="text-white"
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
        <Alert variant="error" title="Could not load customers">
          <p>{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search name, email, phone, city…"
      />

      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-elevation-1">
        <Table className="border-0">
          <TableHead>
            <TableRow>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Contact</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Added</TableHeadCell>
              {isAdmin && (
                <TableHeadCell className="text-right">Actions</TableHeadCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={isAdmin ? 5 : 4} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 5 : 4}>
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No customers found"
                    description={
                      search
                        ? "Try a different search."
                        : "Add your first customer to get started."
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.full_name} />
                      <span className="font-medium text-navy-900">
                        {c.full_name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-0.5">
                      {c.email && (
                        <span className="flex items-center gap-1.5 text-steel-600">
                          <Mail className="h-3.5 w-3.5 text-steel-400" />{" "}
                          {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1.5 text-steel-600">
                          <Phone className="h-3.5 w-3.5 text-steel-400" />{" "}
                          {c.phone}
                        </span>
                      )}
                      {!c.email && !c.phone && (
                        <span className="text-steel-400">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={activeVariant(c.status)}>
                      {c.status === "Active" ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-text-secondary">
                    {formatDate(c.created_at)}
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex justify-end">
                        <RowActions
                          label={`Actions for ${c.full_name}`}
                          items={[
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
                          ]}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && rows.length > 0 && (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={count}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        customer={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove customer?"
        confirmLabel="Remove"
        description={
          <>
            This permanently removes{" "}
            <span className="font-semibold text-navy-800">
              {deleting?.full_name}
            </span>{" "}
            from your customer records.
          </>
        }
      />
    </div>
  );
}
