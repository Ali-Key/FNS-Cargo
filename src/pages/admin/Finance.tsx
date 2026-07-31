import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Plus,
  Receipt,
  Search,
  Pencil,
  Trash2,
  Wallet,
  CircleDollarSign,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'
import {
  Button,
  Input,
  InvoiceBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Pagination,
  EmptyState,
  SkeletonTableRows,
} from '@/components/ui'
import { MetricTile, PageHeader, ConfirmDialog, PillGroup } from '@/components/dashboard'
import { InvoiceFormModal } from '@/components/dashboard/InvoiceFormModal'
import { RecordPaymentModal } from '@/components/dashboard/RecordPaymentModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/context/ToastContext'
import {
  listInvoices,
  deleteInvoice,
  listRecentPayments,
  type InvoiceListParams,
} from '@/services/financeService'
import { getDashboardData } from '@/services/dashboardService'
import type { DashboardStats, InvoiceWithRelations, PaymentWithInvoice } from '@/types'
import { isInvoiceOverdue } from '@/utils/status'
import { formatCurrency } from '@/utils/format'
import { formatDate, formatRelativeToNow } from '@/utils/date'

const PAGE_SIZE = 10

type View = NonNullable<InvoiceListParams['view']>

const VIEW_PILLS: { value: View; label: string }[] = [
  { value: 'all', label: 'All invoices' },
  { value: 'outstanding', label: 'Outstanding' },
  { value: 'overdue', label: 'Overdue' },
]

export default function Finance() {
  useDocumentTitle('Finance | FNS Cargo')
  const toast = useToast()

  const [rows, setRows] = useState<InvoiceWithRelations[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [view, setView] = useState<View>('all')
  const debouncedSearch = useDebouncedValue(search)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [ledger, setLedger] = useState<PaymentWithInvoice[]>([])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null)
  const [paying, setPaying] = useState<InvoiceWithRelations | null>(null)
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listInvoices({ page, pageSize: PAGE_SIZE, search: debouncedSearch, view })
      setRows(result.rows)
      setCount(result.count)
    } catch {
      toast.error('Unable to load invoices', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, view, toast])

  useEffect(() => {
    load()
  }, [load])

  // Headline figures and the payment ledger refresh together with the table so
  // recording a payment updates every surface at once.
  const loadSummary = useCallback(async () => {
    try {
      const [dash, payments] = await Promise.all([getDashboardData(), listRecentPayments(8)])
      setStats(dash.stats)
      setLedger(payments)
    } catch {
      setLedger([])
    }
  }, [])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, view])

  function refreshAll() {
    void load()
    void loadSummary()
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteInvoice(deleting.id, deleting.invoice_number)
      toast.success('Invoice deleted', `${deleting.invoice_number} and its payments have been removed.`)
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else refreshAll()
    } catch {
      toast.error('Unable to delete invoice', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const filtersActive = !!search || view !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finance"
        description="Invoices, payments, and outstanding balances across every shipment."
        actions={
          <Button
            variant="accent"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Raise invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricTile
          label="Revenue collected"
          value={formatCurrency(stats?.revenue_total ?? 0)}
          icon={TrendingUp}
          tone="delivered"
          to="/dashboard/analytics"
          hint={`${formatCurrency(stats?.revenue_month ?? 0)} this month`}
        />
        <MetricTile
          label="Outstanding"
          value={formatCurrency(stats?.outstanding_amount ?? 0)}
          icon={Wallet}
          tone="navy"
          to="/dashboard/finance"
          hint="Unsettled invoice balances"
        />
        <MetricTile
          label="Overdue invoices"
          value={stats?.overdue_invoices ?? 0}
          icon={AlertTriangle}
          tone="delayed"
          to="/dashboard/finance"
          attention
        />
        <MetricTile
          label="Unpaid shipments"
          value={stats?.unpaid_shipments ?? 0}
          icon={CircleDollarSign}
          tone="transit"
          to="/dashboard/shipments?payment=Unpaid"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <div className="space-y-3 rounded-card border border-steel-100 bg-white p-3 shadow-elevation-1">
            <div className="sm:max-w-xs">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice number…"
                icon={<Search className="h-4 w-4" />}
                aria-label="Search invoices"
              />
            </div>
            <PillGroup label="Filter invoices" options={VIEW_PILLS} value={view} onChange={setView} />
          </div>

          <div className="overflow-hidden rounded-card border border-steel-100 bg-white shadow-elevation-1">
            <Table className="min-w-[900px] border-0">
              <TableHead className="sticky top-0">
                <TableRow>
                  <TableHeadCell>Invoice</TableHeadCell>
                  <TableHeadCell>Shipment</TableHeadCell>
                  <TableHeadCell>Customer</TableHeadCell>
                  <TableHeadCell className="text-right">Amount</TableHeadCell>
                  <TableHeadCell className="text-right">Paid</TableHeadCell>
                  <TableHeadCell className="text-right">Balance</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell>Due</TableHeadCell>
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
                        title={filtersActive ? 'No matching invoices' : 'No invoices yet'}
                        description={
                          filtersActive
                            ? 'Try changing your search or filter.'
                            : 'Raise an invoice against a shipment to start tracking revenue.'
                        }
                        action={
                          filtersActive ? (
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setSearch('')
                                setView('all')
                              }}
                            >
                              Clear filters
                            </Button>
                          ) : (
                            <Button
                              variant="accent"
                              icon={<Plus className="h-4 w-4" />}
                              onClick={() => {
                                setEditing(null)
                                setFormOpen(true)
                              }}
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
                    const overdue = isInvoiceOverdue(inv.status, inv.due_date, inv.balance)
                    return (
                      <TableRow key={inv.id} className="group">
                        <TableCell className="font-mono text-sm font-semibold text-navy-900">
                          {inv.invoice_number}
                        </TableCell>
                        <TableCell>
                          {inv.shipment ? (
                            <Link
                              to={`/dashboard/shipments/${inv.shipment.id}`}
                              className="rounded font-mono text-sm text-navy-700 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                            >
                              {inv.shipment.tracking_number}
                            </Link>
                          ) : (
                            <span className="text-sm text-steel-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-steel-600">
                          {inv.customer?.full_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-right font-tabular text-sm font-semibold text-navy-900">
                          {formatCurrency(inv.amount, 2)}
                        </TableCell>
                        <TableCell className="text-right font-tabular text-sm text-status-delivered">
                          {formatCurrency(inv.amount_paid, 2)}
                        </TableCell>
                        <TableCell className="text-right font-tabular text-sm font-semibold text-navy-900">
                          {formatCurrency(inv.balance, 2)}
                        </TableCell>
                        <TableCell>
                          <InvoiceBadge status={inv.status} overdue={overdue} />
                        </TableCell>
                        <TableCell className="font-tabular text-sm text-steel-500">
                          {formatDate(inv.due_date, '—')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            {(inv.balance ?? 0) > 0 && inv.status !== 'Void' && (
                              <Button size="sm" variant="secondary" onClick={() => setPaying(inv)}>
                                Record payment
                              </Button>
                            )}
                            <button
                              onClick={() => {
                                setEditing(inv)
                                setFormOpen(true)
                              }}
                              className="rounded-control p-1.5 text-steel-500 hover:bg-steel-100 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                              aria-label={`Edit ${inv.invoice_number}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeleting(inv)}
                              className="rounded-control p-1.5 text-steel-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label={`Delete ${inv.invoice_number}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
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
        </div>

        {/* Payment ledger — the running record of money actually received. */}
        <div className="rounded-card border border-steel-100 bg-white shadow-elevation-1">
          <div className="border-b border-steel-100 px-6 py-4">
            <h2 className="font-bold text-navy-900">Payment history</h2>
            <p className="mt-0.5 text-xs text-steel-500">Most recent receipts across all invoices.</p>
          </div>
          {ledger.length === 0 ? (
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title="No payments yet"
              description="Recorded payments appear here as they are received."
            />
          ) : (
            <ul className="divide-y divide-steel-100">
              {ledger.map((p) => (
                <li key={p.id} className="flex items-start justify-between gap-3 px-6 py-3.5">
                  <div className="min-w-0">
                    <p className="font-tabular text-sm font-bold text-status-delivered">
                      {formatCurrency(p.amount, 2)}
                    </p>
                    <p className="truncate text-xs text-steel-500">
                      {p.invoice?.invoice_number ?? 'Invoice removed'} · {p.method}
                    </p>
                  </div>
                  <span className="whitespace-nowrap text-xs text-steel-400">
                    {formatRelativeToNow(p.paid_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

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
            This permanently removes invoice{' '}
            <span className="font-mono font-semibold text-navy-800">{deleting?.invoice_number}</span> and every
            payment recorded against it. This action cannot be undone.
          </>
        }
      />
    </div>
  )
}
