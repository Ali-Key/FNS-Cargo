import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Banknote,
  CalendarClock,
  Hash,
  Landmark,
  Pencil,
  Plus,
  Smartphone,
  Trash2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Button,
  DetailRow,
  IconButton,
  Metric,
  MetricSkeleton,
  MobileRowCard,
  TableCell,
  TableCellPrimary,
  TableHeadCell,
  TableRow,
} from '@/components/ui'
import {
  PageHeader,
  ConfirmDialog,
  FilterDropdown,
  DataToolbar,
  ExportMenu,
  ResponsiveDataList,
} from '@/components/dashboard'
import { CounterPaymentModal, EditPaymentModal } from '@/components/payments'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useCachedResource, invalidateCachedResources } from '@/hooks/useCachedResource'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import {
  listPayments,
  deletePayment,
  getPaymentTotals,
  getOutstandingTotal,
  type PaymentListParams,
  type PaymentTotals,
} from '@/services/financeService'
import { exportPaymentsCsv } from '@/lib/exports/financeExports'
import { PAYMENT_METHODS } from '@/types'
import type { PaymentLedgerRow } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate, formatTime } from '@/utils/date'

const PAGE_SIZE = 10

type MethodFilter = NonNullable<PaymentListParams['method']>

const METHOD_OPTIONS: { value: MethodFilter; label: string }[] = [
  { value: 'all', label: 'All methods' },
  ...PAYMENT_METHODS.map((m) => ({ value: m as MethodFilter, label: m })),
]

interface LedgerView {
  rows: PaymentLedgerRow[]
  count: number
  totals: PaymentTotals | null
  /** Distinguishes "the totals query failed" from "the totals are still loading". */
  totalsFailed: boolean
  /**
   * Balance still owed across the book. Null only when the invoices query
   * failed — an empty book owes 0, which is a figure, not a blank.
   */
  outstanding: number | null
}

/** A method is a fact, not a state — the glyph aids scanning, the colour stays neutral. */
const METHOD_ICON: Record<string, LucideIcon> = {
  'Bank Transfer': Landmark,
  'EVC Plus': Smartphone,
  'Edahab': Smartphone,
}

function MethodTag({ method }: { method: string }) {
  const Icon = METHOD_ICON[method] ?? Wallet
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-deck-600">
      <Icon className="h-3.5 w-3.5 shrink-0 text-deck-400" aria-hidden="true" />
      {method}
    </span>
  )
}

/**
 * The payment ledger: every payment taken, in one list. Money is the record
 * here — the page carries no billing view, so nothing on it is read from or
 * described in terms of invoices.
 */
export default function Payments() {
  useDocumentTitle('Payments | FSN Cargo')
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState<MethodFilter>('all')
  const debouncedSearch = useDebouncedValue(search)

  const [recording, setRecording] = useState(false)
  const [editing, setEditing] = useState<PaymentLedgerRow | null>(null)
  const [deleting, setDeleting] = useState<PaymentLedgerRow | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  // Changing a filter has to reset to page one, but doing that in an effect
  // fires the fetch twice: once for the new filter on the old page, then again
  // once the page resets. Adjusting during render lets the fetch below see the
  // corrected page on its first pass.
  const filterSignature = `${debouncedSearch}|${method}`
  const [lastFilters, setLastFilters] = useState(filterSignature)
  if (lastFilters !== filterSignature) {
    setLastFilters(filterSignature)
    setPage(1)
  }

  const paymentsKey = useMemo(
    () => `payments:${JSON.stringify({ page, search: debouncedSearch, method })}`,
    [page, debouncedSearch, method],
  )

  // The ledger and its totals are one view of one thing, so they load together:
  // parallel queries behind a single cache entry rather than separate states
  // that can disagree while one of them is still in flight.
  const fetchLedger = useCallback(async (): Promise<LedgerView> => {
    const [result, totals, outstanding] = await Promise.all([
      listPayments({ page, pageSize: PAGE_SIZE, search: debouncedSearch, method }),
      // A totals failure must not take the ledger down with it, but it must not
      // pass for a zero either — it comes back flagged, and the cards say so.
      getPaymentTotals({ search: debouncedSearch, method }).catch((err: unknown) => {
        console.error('[payments] could not load ledger totals', err)
        return null
      }),
      // What is still owed is a fact about the book, not about the payments on
      // screen, so it is read unfiltered and fails on its own terms.
      getOutstandingTotal().catch((err: unknown) => {
        console.error('[payments] could not load outstanding balance', err)
        return null
      }),
    ])
    return { rows: result.rows, count: result.count, totals, totalsFailed: totals === null, outstanding }
  }, [page, debouncedSearch, method])

  const { data, loading, error, reload } = useCachedResource<LedgerView>(paymentsKey, fetchLedger)

  const rows = data?.rows ?? []
  const count = data?.count ?? 0
  const totals = data?.totals ?? null
  const totalsFailed = data?.totalsFailed ?? false
  // `?? null` only when the view itself has not landed: once it has, a 0 is the
  // outstanding balance and must survive as one.
  const outstanding = data ? data.outstanding : null
  const loadError = Boolean(error)
  // Names the month the this-month figure covers, so the card is readable
  // without the reader having to work out which month "this" is.
  const thisMonthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date()),
    [],
  )
  // Only a cold ledger shows skeleton rows; a filter change or a background
  // refresh keeps the rows that are already on screen.
  const showSkeleton = loading && rows.length === 0

  function clearFilters() {
    setSearch('')
    setMethod('all')
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deletePayment(deleting.id, deleting.invoice_id)
      invalidateCachedResources()
      toast.success('Payment removed', 'The payment has been reversed out of the ledger.')
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else reload()
    } catch {
      toast.error('Unable to remove payment', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  /** Edit and remove share one icon-button shape so the pair reads as a set. */
  function rowActions(p: PaymentLedgerRow) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <IconButton
          label={`Edit payment of ${formatCurrency(p.amount, 2)} on ${formatDate(p.paid_at)}`}
          title={isAdmin ? 'Edit payment' : 'Only admins can edit a payment'}
          icon={<Pencil className="h-4 w-4" aria-hidden="true" />}
          disabled={!isAdmin}
          onClick={() => setEditing(p)}
        />
        <IconButton
          label={`Remove payment of ${formatCurrency(p.amount, 2)} on ${formatDate(p.paid_at)}`}
          title={isAdmin ? 'Remove payment' : 'Only admins can remove a payment'}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
          disabled={!isAdmin}
          onClick={() => setDeleting(p)}
        />
      </div>
    )
  }

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const filtersActive = !!search || method !== 'all'

  return (
    <div>
      <PageHeader
        title="Payments"
        description={`${count} ${count === 1 ? 'payment' : 'payments'} recorded${filtersActive ? ' under the current filters' : ''}.`}
        crumbs={[{ label: 'Commercial' }, { label: 'Payments' }]}
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              items={[{ label: 'Payments (CSV)', onClick: () => exportPaymentsCsv({ search: debouncedSearch, method }) }]}
            />
            <Button variant="deck" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setRecording(true)}>
              Record payment
            </Button>
          </div>
        }
      />

      {loadError && rows.length === 0 && (
        <Alert
          variant="error"
          title="Could not load payments"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={reload}>
              Retry
            </Button>
          }
        >
          Something went wrong fetching the payment ledger.
        </Alert>
      )}

      {/* What the ledger adds up to — four facts, one row. Every one of them is
          read from the database: an empty ledger reads $0.00, which is the true
          figure, and only a query that failed is allowed to say otherwise. */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {totals || totalsFailed ? (
          <>
            <Metric
              label="Collected all time"
              value={totals ? formatCurrency(totals.collected, 2) : 'Unable to load'}
              icon={Wallet}
              tone="positive"
              hint={
                totals
                  ? filtersActive
                    ? 'Under the current filters'
                    : 'Across the whole ledger'
                  : 'The ledger totals could not be read'
              }
            />
            <Metric
              label="Collected this month"
              value={totals ? formatCurrency(totals.collectedThisMonth, 2) : 'Unable to load'}
              icon={CalendarClock}
              hint={totals ? thisMonthLabel : 'The ledger totals could not be read'}
            />
            {/* Owed, not taken — so it comes off the invoices, unaffected by the
                method filter or the search box above the ledger. */}
            <Metric
              label="Still to collect"
              value={outstanding == null ? 'Unable to load' : formatCurrency(outstanding, 2)}
              icon={Banknote}
              tone={outstanding != null && outstanding > 0 ? 'caution' : 'default'}
              hint={
                outstanding == null
                  ? 'The outstanding balance could not be read'
                  : 'Unpaid invoice balances'
              }
            />
            <Metric
              label="Payments recorded"
              value={totals ? totals.count : 'Unable to load'}
              icon={Hash}
              tone="signal"
              hint={
                totals
                  ? `Averaging ${formatCurrency(totals.average, 2)} each`
                  : 'The ledger totals could not be read'
              }
            />
          </>
        ) : (
          <>
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
            <MetricSkeleton />
          </>
        )}
      </div>

      <ResponsiveDataList
        rows={rows}
        loading={showSkeleton}
        columnCount={7}
        toolbar={
          <DataToolbar
            embedded
            search={search}
            onSearchChange={setSearch}
            placeholder="Search customer, tracking number or reference"
            filters={<FilterDropdown label="Method" options={METHOD_OPTIONS} value={method} onChange={setMethod} />}
            filtersActive={filtersActive}
            onReset={clearFilters}
            summary={
              showSkeleton ? null : (
                <>
                  <span className="font-tabular font-semibold text-deck-800">{count}</span>{' '}
                  {count === 1 ? 'payment' : 'payments'}
                </>
              )
            }
          />
        }
        tableClassName="min-w-[760px] lg:min-w-[920px]"
        tableHead={
          <TableRow>
            <TableHeadCell>Date</TableHeadCell>
            <TableHeadCell>Customer</TableHeadCell>
            <TableHeadCell>Shipment</TableHeadCell>
            <TableHeadCell>Method</TableHeadCell>
            <TableHeadCell className="hidden lg:table-cell">Reference</TableHeadCell>
            <TableHeadCell className="text-center">Amount</TableHeadCell>
            <TableHeadCell className="w-[92px] text-center">Actions</TableHeadCell>
          </TableRow>
        }
        renderRow={(p) => (
          <TableRow key={p.id}>
            <TableCell className="whitespace-nowrap">
              <span className="font-tabular block text-deck-700">{formatDate(p.paid_at)}</span>
              <span className="font-tabular block text-[11px] text-deck-400">{formatTime(p.paid_at)}</span>
            </TableCell>
            <TableCellPrimary className="text-deck-900">
              <span className="flex items-center gap-2.5">
                <Avatar name={p.invoice?.shipment?.customer_name} size="sm" />
                <span className="min-w-0 truncate">{p.invoice?.shipment?.customer_name ?? '—'}</span>
              </span>
            </TableCellPrimary>
            <TableCell>
              {p.invoice?.shipment ? (
                <Link
                  to={`/dashboard/shipments/${p.invoice.shipment.id}`}
                  className="deck-focus rounded-chip font-mono text-[12px] text-deck-600 underline-offset-2 hover:text-signal-600 hover:underline"
                >
                  {p.invoice.shipment.tracking_number}
                </Link>
              ) : (
                <span className="text-deck-300">—</span>
              )}
            </TableCell>
            <TableCell>
              <MethodTag method={p.method} />
            </TableCell>
            <TableCell className="hidden max-w-[220px] truncate text-deck-500 lg:table-cell">
              {p.reference ?? '—'}
            </TableCell>
            <TableCell className="font-tabular text-center text-[14px] font-bold text-deck-900">
              {formatCurrency(p.amount, 2)}
            </TableCell>

            <TableCell className="w-[92px] text-center">{rowActions(p)}</TableCell>
          </TableRow>
        )}
        renderMobileCard={(p) => (
          <MobileRowCard
            key={p.id}
            header={
              <div className="flex min-w-0 justify-center items-start gap-2.5">
                <Avatar name={p.invoice?.shipment?.customer_name} size="sm" className="mt-0.5" />
                <div className="min-w-0">
                  <p className="font-tabular text-[15px] font-bold text-deck-900">{formatCurrency(p.amount, 2)}</p>
                  <p className="mt-1 truncate text-[13px] text-deck-700">
                    {p.invoice?.shipment?.customer_name ?? '—'}
                  </p>
                  {p.invoice?.shipment && (
                    <Link
                      to={`/dashboard/shipments/${p.invoice.shipment.id}`}
                      className="deck-focus mt-1 inline-block rounded-chip font-mono text-[12px] text-deck-500 underline-offset-2 hover:text-signal-600 hover:underline"
                    >
                      {p.invoice.shipment.tracking_number}
                    </Link>
                  )}
                </div>
              </div>
            }
            actions={rowActions(p)}
          >
            <DetailRow label="Date" value={`${formatDate(p.paid_at)} · ${formatTime(p.paid_at)}`} />
            <DetailRow label="Method" value={<MethodTag method={p.method} />} />
            <DetailRow label="Reference" value={p.reference ?? '—'} />
          </MobileRowCard>
        )}
        emptyIcon={<Wallet className="h-5 w-5" />}
        emptyTitle={filtersActive ? 'No matching payments' : 'No payments recorded yet'}
        emptyDescription={
          filtersActive
            ? 'Nothing matches this search and method combination.'
            : 'Record the first payment and it will appear here.'
        }
        emptyAction={
          filtersActive ? (
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : (
            <Button variant="deck" size="sm" onClick={() => setRecording(true)}>
              Record payment
            </Button>
          )
        }
        pagination={{ page, pageCount, onPageChange: setPage, totalItems: count, pageSize: PAGE_SIZE }}
      />

      <CounterPaymentModal
        open={recording}
        onClose={() => setRecording(false)}
        onSaved={() => {
          invalidateCachedResources()
          reload()
        }}
      />

      <EditPaymentModal
        open={!!editing}
        onClose={() => setEditing(null)}
        payment={editing}
        onSaved={() => {
          invalidateCachedResources()
          reload()
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove this payment?"
        confirmLabel="Remove payment"
        description="This reverses the payment out of the ledger and the shipment's settlement state. It cannot be undone."
      />
    </div>
  )
}
