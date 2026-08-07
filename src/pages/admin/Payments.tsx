import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, Download, Trash2, Receipt } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Pagination,
  EmptyState,
  SkeletonTableRows,
  SkeletonCard,
  RowActions,
  DetailRow,
  Button,
  MobileRowCard,
  Alert,
} from '@/components/ui'
import { StatTile, PageHeader, ConfirmDialog, FilterDropdown, DataToolbar, ExportMenu } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/context/ToastContext'
import { listPayments, deletePayment, type PaymentListParams } from '@/services/financeService'
import { downloadPaymentReceipt, exportPaymentsCsv } from '@/lib/exports/financeExports'
import { getDashboardData } from '@/services/dashboardService'
import { PAYMENT_METHODS } from '@/types'
import type { DashboardStats, PaymentWithInvoice } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const PAGE_SIZE = 10

type MethodFilter = NonNullable<PaymentListParams['method']>

const METHOD_OPTIONS: { value: MethodFilter; label: string }[] = [
  { value: 'all', label: 'All methods' },
  ...PAYMENT_METHODS.map((m) => ({ value: m as MethodFilter, label: m })),
]

export default function Payments() {
  useDocumentTitle('Payments | FNS Cargo')
  const toast = useToast()

  const [rows, setRows] = useState<PaymentWithInvoice[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState<MethodFilter>('all')
  const debouncedSearch = useDebouncedValue(search)

  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [deleting, setDeleting] = useState<PaymentWithInvoice | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listPayments({ page, pageSize: PAGE_SIZE, search: debouncedSearch, method })
      setRows(result.rows)
      setCount(result.count)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, method])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    getDashboardData()
      .then((dash) => setStats(dash.stats))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, method])

  function clearFilters() {
    setSearch('')
    setMethod('all')
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deletePayment(deleting.id, deleting.invoice_id)
      toast.success('Payment removed', 'The payment and its effect on the invoice balance have been reversed.')
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else void load()
    } catch {
      toast.error('Unable to remove payment', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleDownloadReceipt(paymentId: string) {
    try {
      await downloadPaymentReceipt(paymentId)
    } catch (err) {
      toast.error('Unable to generate receipt', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const filtersActive = !!search || method !== 'all'

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Every payment received against an invoice, with printable receipts."
      />

      {loadError && rows.length === 0 && (
        <Alert variant="error" title="Could not load payments">
          <p>Please try again.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          label="Revenue collected"
          value={formatCurrency(stats?.revenue_total ?? 0)}
          icon={TrendingUp}
          tone="delivered"
          to="/dashboard/analytics"
        />
        <StatTile
          label="Collected this month"
          value={formatCurrency(stats?.revenue_month ?? 0)}
          icon={Wallet}
          tone="navy"
        />
        <StatTile label="Payments recorded" value={count} icon={Receipt} tone="transit" />
      </div>

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search reference or notes…"
        filters={<FilterDropdown label="Method" options={METHOD_OPTIONS} value={method} onChange={setMethod} />}
        filtersActive={filtersActive}
        onReset={clearFilters}
      >
        <ExportMenu
          items={[
            {
              label: 'Payments (CSV)',
              onClick: () => exportPaymentsCsv({ search: debouncedSearch, method }),
            },
          ]}
        />
      </DataToolbar>

      <div className="hidden overflow-hidden rounded-card border border-gray-200 bg-white shadow-elevation-1 sm:block">
        <Table className="min-w-[640px] border-0 lg:min-w-[840px]">
          <TableHead className="sticky top-0">
            <TableRow>
              <TableHeadCell>Date</TableHeadCell>
              <TableHeadCell>Invoice</TableHeadCell>
              <TableHeadCell className="text-right">Amount</TableHeadCell>
              <TableHeadCell>Method</TableHeadCell>
              <TableHeadCell className="hidden lg:table-cell">Reference</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={6} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<Wallet className="h-6 w-6" />}
                    title={filtersActive ? 'No matching payments' : 'No payments yet'}
                    description={
                      filtersActive
                        ? 'Try changing your search or filter.'
                        : 'Recorded payments appear here as they are received.'
                    }
                    action={
                      filtersActive ? (
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-tabular text-sm text-steel-600">{formatDate(p.paid_at)}</TableCell>
                  <TableCell>
                    {p.invoice ? (
                      <Link
                        to="/dashboard/invoices"
                        className="rounded font-mono text-sm text-navy-700 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                      >
                        {p.invoice.invoice_number}
                      </Link>
                    ) : (
                      <span className="text-sm text-steel-400">Invoice removed</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-tabular text-sm font-semibold text-status-delivered">
                    {formatCurrency(p.amount, 2)}
                  </TableCell>
                  <TableCell className="text-sm text-steel-600">{p.method}</TableCell>
                  <TableCell className="hidden text-sm text-text-secondary lg:table-cell">{p.reference ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <RowActions
                        label={`Actions for payment on ${formatDate(p.paid_at)}`}
                        items={[
                          {
                            label: 'Download receipt',
                            icon: <Download className="h-4 w-4" />,
                            onClick: () => void handleDownloadReceipt(p.id),
                          },
                          {
                            label: 'Remove payment',
                            icon: <Trash2 className="h-4 w-4" />,
                            onClick: () => setDeleting(p),
                            danger: true,
                          },
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

      {/* Mobile card list — same data as the table, one card per payment */}
      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : rows.length === 0 ? (
          <div className="rounded-card border border-gray-200 bg-white shadow-elevation-1">
            <EmptyState
              icon={<Wallet className="h-6 w-6" />}
              title={filtersActive ? 'No matching payments' : 'No payments yet'}
              description={
                filtersActive
                  ? 'Try changing your search or filter.'
                  : 'Recorded payments appear here as they are received.'
              }
              action={
                filtersActive ? (
                  <Button variant="secondary" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          rows.map((p) => (
            <MobileRowCard
              key={p.id}
              header={
                <span className="font-tabular text-sm font-bold text-status-delivered">
                  {formatCurrency(p.amount, 2)}
                </span>
              }
              actions={
                <RowActions
                  label={`Actions for payment on ${formatDate(p.paid_at)}`}
                  items={[
                    {
                      label: 'Download receipt',
                      icon: <Download className="h-4 w-4" />,
                      onClick: () => void handleDownloadReceipt(p.id),
                    },
                    {
                      label: 'Remove payment',
                      icon: <Trash2 className="h-4 w-4" />,
                      onClick: () => setDeleting(p),
                      danger: true,
                    },
                  ]}
                />
              }
            >
              <DetailRow label="Date" value={formatDate(p.paid_at)} />
              <DetailRow label="Invoice" value={p.invoice?.invoice_number ?? 'Invoice removed'} mono />
              <DetailRow label="Method" value={p.method} />
              <DetailRow label="Reference" value={p.reference ?? '—'} />
            </MobileRowCard>
          ))
        )}
      </div>

      {!loading && rows.length > 0 && (
        <Pagination page={page} pageCount={pageCount} onPageChange={setPage} totalItems={count} pageSize={PAGE_SIZE} />
      )}

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove payment?"
        confirmLabel="Remove"
        description="This reverses the payment's effect on the invoice balance. This action cannot be undone."
      />
    </div>
  )
}
