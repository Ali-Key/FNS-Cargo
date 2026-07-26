import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Plus, Package, Eye, Pencil, Trash2, Search } from 'lucide-react'
import {
  Button,
  Input,
  StatusBadge,
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
import type { Customer, ShipmentStatus, ShippingMethod, ShipmentWithCustomer } from '@/types'
import { SHIPMENT_STATUSES, SHIPPING_METHODS } from '@/types'
import { STATUS_LABEL, STATUS_ICON, SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatDate } from '@/utils/date'
import { formatWeight, formatCurrency } from '@/utils/format'

const PAGE_SIZE = 10
const FILTER_KEY = 'fns.shipments.filters'

type StatusFilter = ShipmentStatus | 'all'
type MethodFilter = ShippingMethod | 'all'

const STATUS_PILLS = [
  { value: 'all' as StatusFilter, label: 'All' },
  ...SHIPMENT_STATUSES.map((s) => ({ value: s as StatusFilter, label: STATUS_LABEL[s], icon: STATUS_ICON[s] })),
]
const METHOD_PILLS = [
  { value: 'all' as MethodFilter, label: 'All methods' },
  ...SHIPPING_METHODS.map((m) => ({ value: m as MethodFilter, label: SHIPPING_METHOD_LABEL[m] })),
]

function isStatus(v: string | null): v is ShipmentStatus {
  return !!v && (SHIPMENT_STATUSES as string[]).includes(v)
}
function isMethod(v: string | null): v is ShippingMethod {
  return !!v && (SHIPPING_METHODS as string[]).includes(v)
}

export default function Shipments() {
  useDocumentTitle('Shipments · FNS Cargo')
  const toast = useToast()
  const [searchParams] = useSearchParams()

  // Initial filter state: URL query (deep-link) wins, then the last saved
  // filters from localStorage (survive refresh), then defaults.
  const initial = useMemo(() => {
    let saved: { status?: string; method?: string; search?: string } = {}
    try {
      saved = JSON.parse(localStorage.getItem(FILTER_KEY) ?? '{}')
    } catch {
      /* ignore */
    }
    const urlStatus = searchParams.get('status')
    const urlMethod = searchParams.get('method')
    const urlQ = searchParams.get('q')
    return {
      status: (isStatus(urlStatus) ? urlStatus : isStatus(saved.status ?? null) ? saved.status : 'all') as StatusFilter,
      method: (isMethod(urlMethod) ? urlMethod : isMethod(saved.method ?? null) ? saved.method : 'all') as MethodFilter,
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
  const debouncedSearch = useDebouncedValue(search)

  const [customerOptions, setCustomerOptions] = useState<Pick<Customer, 'id' | 'full_name'>[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShipmentWithCustomer | null>(null)
  const [deleting, setDeleting] = useState<ShipmentWithCustomer | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listShipments({ page, pageSize: PAGE_SIZE, search: debouncedSearch, status, method })
      setRows(result.rows)
      setCount(result.count)
    } catch {
      toast.error('Unable to load shipments', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, status, method, toast])

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
    localStorage.setItem(FILTER_KEY, JSON.stringify({ status, method, search }))
    setPage(1)
  }, [debouncedSearch, status, method, search])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))
  const filtersActive = !!search || status !== 'all' || method !== 'all'

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
    <div className="space-y-5">
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
      <div className="sticky top-16 z-20 space-y-3 rounded-2xl border border-steel-100 bg-white p-3 shadow-elevation-1">
        <div className="sm:max-w-xs">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tracking #, sender, receiver…"
            icon={<Search className="h-4 w-4" />}
            aria-label="Search shipments"
          />
        </div>
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <PillGroup label="Filter by status" options={STATUS_PILLS} value={status} onChange={setStatus} />
          <PillGroup label="Filter by method" options={METHOD_PILLS} value={method} onChange={setMethod} />
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-elevation-1">
        <Table className="min-w-[1180px] border-0">
          <TableHead className="sticky top-0">
            <TableRow>
              <TableHeadCell>Tracking #</TableHeadCell>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Sender</TableHeadCell>
              <TableHeadCell>Receiver</TableHeadCell>
              <TableHeadCell>Origin</TableHeadCell>
              <TableHeadCell>Destination</TableHeadCell>
              <TableHeadCell>Method</TableHeadCell>
              <TableHeadCell>Weight</TableHeadCell>
              <TableHeadCell>Value</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Est. Delivery</TableHeadCell>
              <TableHeadCell>Created</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={13} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={13}>
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
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setSearch('')
                            setStatus('all')
                            setMethod('all')
                          }}
                        >
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
                  <TableCell className="text-sm text-steel-600">{s.customers?.full_name ?? '—'}</TableCell>
                  <TableCell className="text-sm text-steel-600">{s.sender_name}</TableCell>
                  <TableCell className="text-sm font-medium text-navy-800">{s.receiver_name}</TableCell>
                  <TableCell className="text-sm text-steel-600">{s.origin}</TableCell>
                  <TableCell className="text-sm text-steel-600">{s.destination}</TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {SHIPPING_METHOD_LABEL[s.shipping_method as ShippingMethod]}
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-steel-600">{formatWeight(s.weight_kg)}</TableCell>
                  <TableCell className="font-tabular text-sm font-medium text-navy-800">
                    {formatCurrency(s.declared_value)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status as ShipmentStatus} />
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-steel-500">
                    {formatDate(s.estimated_delivery, '—')}
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-steel-500">{formatDate(s.created_at)}</TableCell>
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
