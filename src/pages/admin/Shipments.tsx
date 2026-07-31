import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Package, Eye, Pencil, Trash2, Search, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  Button,
  Input,
  StatusBadge,
  PaymentBadge,
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
import { PageHeader, ConfirmDialog, PillGroup } from '@/components/dashboard'
import { ShipmentFormModal } from '@/components/dashboard/ShipmentFormModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/context/ToastContext'
import { listShipments, deleteShipment } from '@/services/shipmentsService'
import { listCustomerOptions } from '@/services/customersService'
import type {
  Customer,
  PaymentStatus,
  ShipmentStatus,
  ShippingMethod,
  ShipmentWithCustomer,
} from '@/types'
import { SHIPMENT_STATUSES, SHIPPING_METHODS, PAYMENT_STATUSES } from '@/types'
import { STATUS_LABEL, STATUS_ICON, SHIPPING_METHOD_LABEL, isShipmentDelayed } from '@/utils/status'
import { formatDate } from '@/utils/date'
import { formatWeight, formatCurrency, initials } from '@/utils/format'

const PAGE_SIZE = 10
const FILTER_KEY = 'fns.shipments.filters'

type StatusFilter = ShipmentStatus | 'all'
type MethodFilter = ShippingMethod | 'all'
type PaymentFilter = PaymentStatus | 'all'

const STATUS_PILLS = [
  { value: 'all' as StatusFilter, label: 'All' },
  ...SHIPMENT_STATUSES.map((s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s], icon: STATUS_ICON[s] })),
]
const METHOD_PILLS = [
  { value: 'all' as MethodFilter, label: 'All methods' },
  ...SHIPPING_METHODS.map((m) => ({ value: m as MethodFilter, label: SHIPPING_METHOD_LABEL[m] })),
]
const PAYMENT_PILLS = [
  { value: 'all' as PaymentFilter, label: 'All payments' },
  ...PAYMENT_STATUSES.map((p) => ({ value: p as PaymentFilter, label: p })),
]

function isStatus(v: string | null): v is ShipmentStatus {
  return !!v && (SHIPMENT_STATUSES as readonly string[]).includes(v)
}
function isMethod(v: string | null): v is ShippingMethod {
  return !!v && (SHIPPING_METHODS as readonly string[]).includes(v)
}
function isPayment(v: string | null): v is PaymentStatus {
  return !!v && (PAYMENT_STATUSES as readonly string[]).includes(v)
}

export default function Shipments() {
  useDocumentTitle('Shipments | FNS Cargo')
  const toast = useToast()
  const [searchParams] = useSearchParams()

  // Initial filter state: URL query (deep-link) wins, then the last saved
  // filters from localStorage (survive refresh), then defaults.
  const initial = useMemo(() => {
    let saved: { status?: string; method?: string; payment?: string; search?: string } = {}
    try {
      saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}')
    } catch {
      /* ignore */
    }
    const urlStatus = searchParams.get('status')
    const urlMethod = searchParams.get('method')
    const urlPayment = searchParams.get('payment')
    const urlQ = searchParams.get('q')
    return {
      status: (isStatus(urlStatus) ? urlStatus : isStatus(saved.status ?? null) ? saved.status : 'all') as StatusFilter,
      method: (isMethod(urlMethod) ? urlMethod : isMethod(saved.method ?? null) ? saved.method : 'all') as MethodFilter,
      payment: (isPayment(urlPayment)
        ? urlPayment
        : isPayment(saved.payment ?? null)
          ? saved.payment
          : 'all') as PaymentFilter,
      // The delayed view is only ever entered by deep link from a metric tile,
      // so it is deliberately not persisted between visits.
      delayed: searchParams.get('delayed') === '1',
      search: urlQ ?? saved.search ?? '',
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [rows, setRows] = useState<ShipmentWithCustomer[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState(initial.search)
  const [status, setStatus] = useState<StatusFilter>(initial.status)
  const [method, setMethod] = useState<MethodFilter>(initial.method)
  const [payment, setPayment] = useState<PaymentFilter>(initial.payment)
  const [delayedOnly, setDelayedOnly] = useState(initial.delayed)
  const debouncedSearch = useDebouncedValue(search)

  const [customerOptions, setCustomerOptions] = useState<Pick<Customer, 'id' | 'full_name'>[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShipmentWithCustomer | null>(null)
  const [deleting, setDeleting] = useState<ShipmentWithCustomer | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listShipments({
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch,
        status,
        method,
        payment,
        delayedOnly,
      })
      setRows(result.rows)
      setCount(result.count)
    } catch {
      toast.error('Unable to load shipments', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, status, method, payment, delayedOnly, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listCustomerOptions()
      .then(setCustomerOptions)
      .catch(() => setCustomerOptions([]))
  }, [])

  // Persist filters so they survive a refresh; reset to first page on change.
  useEffect(() => {
    localStorage.setItem(FILTER_KEY, JSON.stringify({ status, method, payment, search }))
    setPage(1)
  }, [debouncedSearch, status, method, payment, delayedOnly, search])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const filtersActive = !!search || status !== 'all' || method !== 'all' || payment !== 'all' || delayedOnly

  function clearFilters() {
    setSearch('')
    setStatus('all')
    setMethod('all')
    setPayment('all')
    setDelayedOnly(false)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(shipment: ShipmentWithCustomer) {
    setEditing(shipment)
    setFormOpen(true)
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteShipment(deleting.id, deleting.tracking_number)
      toast.success('Shipment deleted', 'The shipment and its tracking history have been removed.')
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else load()
    } catch {
      toast.error('Unable to delete shipment', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shipments"
        description="Add, track, and manage every shipment in one place."
        actions={
          <Button variant="accent" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
            New shipment
          </Button>
        }
      />

      {/* Sticky filter bar — state persists across refresh */}
      <div className="sticky top-16 z-20 space-y-3 rounded-card border border-steel-100 bg-white p-3 shadow-elevation-1">
        <div className="sm:max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, customer, origin…"
            icon={<Search className="h-4 w-4" />}
            aria-label="Search shipments"
          />
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <PillGroup label="Filter by status" options={STATUS_PILLS} value={status} onChange={setStatus} />
          <PillGroup label="Filter by method" options={METHOD_PILLS} value={method} onChange={setMethod} />
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <PillGroup label="Filter by payment" options={PAYMENT_PILLS} value={payment} onChange={setPayment} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-pressed={delayedOnly}
              onClick={() => setDelayedOnly((v) => !v)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-badge border px-3 py-1.5 text-sm font-semibold transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1',
                delayedOnly
                  ? 'border-status-delayed bg-status-delayed text-white'
                  : 'border-steel-200 bg-white text-steel-600 hover:border-navy-300 hover:text-navy-800',
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Delayed only
            </button>
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-steel-100 bg-white shadow-elevation-1">
        <Table className="min-w-[1240px] border-0">
          <TableHead className="sticky top-0">
            <TableRow>
              <TableHeadCell>Tracking #</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Route</TableHeadCell>
              <TableHeadCell>Method</TableHeadCell>
              <TableHeadCell className="text-right">Weight</TableHeadCell>
              <TableHeadCell className="text-right">Value</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Payment</TableHeadCell>
              <TableHeadCell>Assigned</TableHeadCell>
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
                    title={filtersActive ? 'No matching shipments' : 'No shipments yet'}
                    description={
                      filtersActive
                        ? 'Try changing your search or filters.'
                        : 'Add your first shipment to get started.'
                    }
                    action={
                      filtersActive ? (
                        <Button variant="secondary" onClick={clearFilters}>
                          Clear filters
                        </Button>
                      ) : (
                        <Button variant="accent" icon={<Plus className="h-4 w-4" />} onClick={openCreate}>
                          New shipment
                        </Button>
                      )
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <TableRow key={s.id} className="group">
                  <TableCell>
                    <Link
                      to={`/dashboard/shipments/${s.id}`}
                      className="rounded font-mono text-sm font-semibold text-navy-900 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                    >
                      {s.tracking_number}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm font-medium text-navy-800">{s.customer_name}</TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {s.origin} → {s.destination}
                    {s.current_location && (
                      <span className="block text-xs text-steel-400">at {s.current_location}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {SHIPPING_METHOD_LABEL[s.shipping_method as ShippingMethod]}
                  </TableCell>
                  <TableCell className="text-right font-tabular text-sm text-steel-600">
                    {formatWeight(s.weight)}
                  </TableCell>
                  <TableCell className="text-right font-tabular text-sm text-steel-600">
                    {formatCurrency(s.total_price, 2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status as ShipmentStatus} />
                  </TableCell>
                  <TableCell>
                    <PaymentBadge status={s.payment_status} />
                  </TableCell>
                  <TableCell>
                    {s.assignee ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-navy-100 text-[10px] font-bold text-navy-700">
                          {initials(s.assignee.full_name)}
                        </span>
                        <span className="text-sm text-steel-600">{s.assignee.full_name}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-steel-400">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-tabular text-sm">
                    {isShipmentDelayed(s.status, s.estimated_delivery) ? (
                      <span className="inline-flex items-center gap-1.5 font-semibold text-status-delayed">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        {formatDate(s.estimated_delivery, '—')}
                      </span>
                    ) : (
                      <span className="text-steel-500">{formatDate(s.estimated_delivery, '—')}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity duration-180 focus-within:opacity-100 group-hover:opacity-100">
                      <Link
                        to={`/dashboard/shipments/${s.id}`}
                        className="rounded-control p-1.5 text-steel-500 hover:bg-steel-100 hover:text-navy-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                        aria-label={`View ${s.tracking_number}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => openEdit(s)}
                        className="rounded-control p-1.5 text-steel-500 hover:bg-steel-100 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
                        aria-label={`Edit ${s.tracking_number}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(s)}
                        className="rounded-control p-1.5 text-steel-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label={`Delete ${s.tracking_number}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
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
            This permanently removes shipment{' '}
            <span className="font-mono font-semibold text-navy-800">{deleting?.tracking_number}</span> and its
            tracking history. This action cannot be undone.
          </>
        }
      />
    </div>
  )
}
