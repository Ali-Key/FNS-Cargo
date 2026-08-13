import { useCallback, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Calendar,
  CheckCircle2,
  Eye,
  MapPin,
  Package,
  Pencil,
  PenLine,
  Plus,
  Receipt,
  Trash2,
  User,
  Warehouse,
  Weight,
} from 'lucide-react'
import {
  Button,
  CopyButton,
  DetailRow,
  EmptyState,
  InvoiceBadge,
  Panel,
  PanelHeader,
  PaymentBadge,
  RowActions,
  SectionCard,
  Skeleton,
  SkeletonText,
  StatusBadge,
} from '@/components/ui'
import { PageHeader, ConfirmDialog, ExportMenu } from '@/components/dashboard'
import { ShipmentFormModal, TrackingEventFormModal, WorkflowStepper } from '@/components/shipments'
import {
  InvoiceFormModal,
  InvoicePreviewModal,
  RecordPaymentModal,
  ReceiverSignatureModal,
} from '@/components/payments'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCachedResource, invalidateCachedResources } from '@/hooks/useCachedResource'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getShipment } from '@/services/shipmentsService'
import { listInvoicesForShipment } from '@/services/financeService'
import { listTrackingHistory, deleteTrackingEvent } from '@/services/trackingHistoryService'
import { listCustomerOptions, type CustomerOption } from '@/services/customersService'
import { downloadWaybillLabel, printWaybillLabel } from '@/lib/exports/labelExports'
import type {
  Invoice,
  ShipmentStatus,
  TrackingUpdate,
  ShipmentWithCustomer,
  ShippingMethod,
} from '@/types'
import {
  STATUS_ICON,
  STATUS_STYLES,
  SHIPPING_METHOD_LABEL,
  isInvoiceOverdue,
  isShipmentDelayed,
} from '@/utils/status'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatWeight, formatCurrency } from '@/utils/format'

interface ShipmentDetailView {
  /** The id this payload belongs to, so a cached previous shipment is never shown. */
  id: string
  shipment: ShipmentWithCustomer | null
  history: TrackingUpdate[]
  invoices: Invoice[]
}

/** Stable identity, so the fallback never re-triggers a dependent render. */
const NO_CUSTOMER_OPTIONS: CustomerOption[] = []

export default function ShipmentDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin } = useAuth()


  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [previewingInvoiceId, setPreviewingInvoiceId] = useState<string | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [signing, setSigning] = useState<Invoice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TrackingUpdate | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<TrackingUpdate | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)


  const fetchDetail = useCallback(async (): Promise<ShipmentDetailView> => {
    // All three reads are independent, so they go out together rather than
    // waiting on each other. Invoices are admin-only at the RLS layer; asking
    // as a dispatcher would just return an empty set, so skip that round trip.
    const [shipment, history, invoices] = await Promise.all([
      getShipment(id),
      listTrackingHistory(id),
      isAdmin ? listInvoicesForShipment(id) : Promise.resolve([] as Invoice[]),
    ])
    return { id, shipment, history, invoices }
  }, [id, isAdmin])

  const {
    data,
    loading,
    error,
    reload: load,
  } = useCachedResource<ShipmentDetailView>(
    `shipment:${id}:${isAdmin ? 'admin' : 'ops'}`,
    fetchDetail,
  )

  /**
   * Used after a write. A mutation here also changes what the overview, list
   * and detail views show, so every cached page is marked stale before this
   * one refetches — they still paint instantly next visit, but revalidate
   * straight away instead of waiting out the freshness window.
   */
  const refresh = useCallback(() => {
    invalidateCachedResources()
    load()
  }, [load])

  // The cache still holds the previously viewed shipment while a new id loads,
  // so the view is pinned to the id in the URL — never the last one opened.
  const view = data?.id === id ? data : null
  const shipment = view?.shipment ?? null
  const history = view?.history ?? []
  const invoices = view?.invoices ?? []

  useDocumentTitle(shipment ? `${shipment.tracking_number} | FSN Cargo` : 'Shipment | FSN Cargo')

  const { data: options } = useCachedResource('customer-options', listCustomerOptions, {
    staleTime: 5 * 60_000,
  })
  const customerOptions = options ?? NO_CUSTOMER_OPTIONS

  async function confirmDeleteEvent() {
    if (!deletingEvent) return
    setDeleteLoading(true)
    try {
      await deleteTrackingEvent(deletingEvent.id, id)
      toast.success('Tracking event removed', 'It no longer appears on the customer timeline.')
      setDeletingEvent(null)
      refresh()
    } catch {
      toast.error('Unable to remove event', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading && !view) return <ShipmentDetailSkeleton />

  if (!shipment) {
    return (
      <Panel>
        <EmptyState
          icon={<Package className="h-5 w-5" />}
          title={error ? 'Could not load this shipment' : 'Shipment not found'}
          description={
            error ?? 'This consignment no longer exists, or it may have been deleted.'
          }
          action={
            error ? (
              <Button variant="deck" size="sm" onClick={load}>
                Try again
              </Button>
            ) : (
              <Button variant="deck" size="sm" onClick={() => navigate('/dashboard/shipments')}>
                Back to shipment
              </Button>
            )
          }
        />
      </Panel>
    )
  }

  const status = shipment.status as ShipmentStatus
  const delayed = isShipmentDelayed(status, shipment.estimated_delivery)

  return (
    <div>
      <PageHeader
        back={{ to: '/dashboard/shipments', label: 'All shipments' }}
        crumbs={[
          { label: 'Operate' },
          { label: 'Shipments', to: '/dashboard/shipments' },
          { label: shipment.tracking_number },
        ]}
        title={
          <span className="inline-flex items-center gap-2 font-mono">
            {shipment.tracking_number}
            <CopyButton value={shipment.tracking_number} label="tracking number" />
          </span>
        }
        meta={
          <>
            <StatusBadge status={status} delayed={delayed} />
            <PaymentBadge status={shipment.payment_status} />
            <span className="text-[12px] text-deck-500">
              {shipment.origin} <span className="text-deck-300">→</span> {shipment.destination}
            </span>
          </>
        }
        actions={
          <>
            <ExportMenu
              label="Waybill"
              items={[
                { label: 'Print waybill label', onClick: () => printWaybillLabel(id, '100x150') },
                { label: 'Download label (100×150mm)', onClick: () => downloadWaybillLabel(id, '100x150') },
                { label: 'Download label (A6)', onClick: () => downloadWaybillLabel(id, 'A6') },
              ]}
            />
            <Button variant="deck" size="sm" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Edit shipment
            </Button>
          </>
        }
      />

      <WorkflowStepper
        className="mb-5"
        steps={[
          { label: 'Received', done: true },
          { label: 'Weighed', done: shipment.weight != null && shipment.price_per_kg != null },
          { label: 'Waybill', done: !!shipment.cn_number && !!shipment.branch_code },
          ...(isAdmin
            ? [
                { label: 'Invoiced', done: invoices.length > 0 },
                { label: 'Paid', done: shipment.payment_status === 'Paid' },
                { label: 'Signed', done: invoices.some((inv) => !!inv.receiver_signature_path) },
              ]
            : []),
          { label: 'Delivered', done: status === 'Delivered' },
        ]}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Facts column — one panel per question an operator asks about a box. */}
        <div className="space-y-4 xl:col-span-1">
          <SectionCard icon={MapPin} title="Route" variant="compact">
            <DetailRow label="Origin" value={shipment.origin} />
            <DetailRow label="Destination" value={shipment.destination} />
            <DetailRow label="Method" value={SHIPPING_METHOD_LABEL[shipment.shipping_method as ShippingMethod]} />
            <DetailRow label="Current location" value={shipment.current_location ?? 'Not set'} />
          </SectionCard>

          <SectionCard icon={Weight} title="Cargo & pricing" variant="compact">
            <DetailRow label="Cargo type" value={shipment.cargo_type} />
            <DetailRow label="Pieces" value={shipment.pieces} mono />
            <DetailRow label="Weight" value={formatWeight(shipment.weight)} mono />
            <DetailRow label="Price per kg" value={formatCurrency(shipment.price_per_kg, 2)} mono />
            <DetailRow label="Total price" value={formatCurrency(shipment.total_price, 2)} mono divider />
          </SectionCard>

          <SectionCard icon={User} title="Customer" variant="compact">
            <DetailRow label="Name" value={shipment.customer_name} />
            {shipment.customer?.email && <DetailRow label="Email" value={shipment.customer.email} />}
            <DetailRow label="Booking contact" value={shipment.booking_contact ?? 'Not set'} />
          </SectionCard>

          <SectionCard icon={Warehouse} title="Operations" variant="compact">
            <DetailRow label="Warehouse" value={shipment.warehouse ?? 'Not set'} />
            <DetailRow label="Handled by" value={shipment.assignee?.full_name ?? 'Unassigned'} />
            <DetailRow label="Cargo number (CN)" value={shipment.cn_number ?? 'Not set'} mono />
            <DetailRow label="Branch code" value={shipment.branch_code ?? 'Not set'} mono />
            <DetailRow label="Flight number" value={shipment.flight_number ?? 'Not set'} mono />
          </SectionCard>

          <SectionCard icon={Calendar} title="Dates" variant="compact">
            <DetailRow label="Created" value={formatDate(shipment.created_at)} mono />
            <DetailRow label="Est. delivery" value={formatDate(shipment.estimated_delivery)} mono />
            {shipment.delivered_at && <DetailRow label="Delivered" value={formatDateTime(shipment.delivered_at)} mono />}
            <DetailRow label="Last updated" value={formatDate(shipment.updated_at)} mono />
          </SectionCard>
        </div>

        {/* Timeline — the customer-visible story of the consignment. */}
        <Panel className="xl:col-span-2">
          <PanelHeader
            title="Tracking timeline"
            description="Exactly what the customer sees on the public tracking page."
            icon={MapPin}
            action={
              <Button
                variant="deck"
                size="xs"
                icon={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setEditingEvent(null)
                  setEventOpen(true)
                }}
              >
                Add event
              </Button>
            }
          />
          {history.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-5 w-5" />}
              title="No tracking events yet"
              description="Post the first update to start the timeline your customer follows."
              action={
                <Button
                  variant="deck"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setEditingEvent(null)
                    setEventOpen(true)
                  }}
                >
                  Add event
                </Button>
              }
            />
          ) : (
            <ol className="relative space-y-5 px-5 py-5">
              {history.map((event, i) => {
                const eStatus = event.status as ShipmentStatus
                const Icon = STATUS_ICON[eStatus]
                const style = STATUS_STYLES[eStatus]
                const latest = i === 0
                return (
                  <li key={event.id} className="relative flex gap-4">
                    {i < history.length - 1 && (
                      <span
                        className="absolute left-[17px] top-10 h-[calc(100%+0.75rem)] w-px bg-deck-150"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={`relative z-10 flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text} ${
                        latest ? `ring-4 ${style.ring}` : ''
                      }`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold text-deck-900">{event.location}</p>
                          <p className="font-tabular mt-0.5 text-[11px] text-deck-400">
                            {formatDateTime(`${event.date}T${event.time}`)}
                            {latest && <span className="ml-2 font-semibold text-signal-600">Latest</span>}
                          </p>
                        </div>
                        <RowActions
                          label={`Actions for update at ${event.location}`}
                          items={[
                            {
                              label: 'Edit event',
                              icon: <Pencil className="h-4 w-4" />,
                              onClick: () => {
                                setEditingEvent(event)
                                setEventOpen(true)
                              },
                            },
                            ...(isAdmin
                              ? [
                                  {
                                    label: 'Delete event',
                                    icon: <Trash2 className="h-4 w-4" />,
                                    onClick: () => setDeletingEvent(event),
                                    danger: true,
                                  },
                                ]
                              : []),
                          ]}
                        />
                      </div>
                      {event.description && (
                        <p className="mt-1.5 text-[13px] leading-relaxed text-deck-600">{event.description}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </Panel>
      </div>

      {/* Billing — admin only, mirroring the invoices RLS policy. */}
      {isAdmin && (
        <Panel className="mt-5">
          <PanelHeader
            title="Billing"
            description="Invoices raised against this consignment and what has been collected."
            icon={Receipt}
            action={
              <Button variant="deck" size="xs" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setInvoiceOpen(true)}>
                Raise invoice
              </Button>
            }
          />
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-5 w-5" />}
              title="Not invoiced yet"
              description={`This shipment prices out at ${formatCurrency(shipment.total_price, 2)}. Raise an invoice to bill it.`}
              action={
                <Button variant="deck" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setInvoiceOpen(true)}>
                  Raise invoice
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-deck-100">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <div className="min-w-[160px] flex-1">
                    <p className="font-mono text-[13px] font-semibold text-deck-900">{inv.invoice_number}</p>
                    <p className="mt-0.5 text-[12px] text-deck-500">
                      Issued {formatDate(inv.issued_at)}
                      {inv.due_date && ` · due ${formatDate(inv.due_date)}`}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="font-tabular text-[14px] font-bold text-deck-900">{formatCurrency(inv.amount, 2)}</p>
                    <p className="font-tabular text-[11px] text-deck-500">{formatCurrency(inv.amount_paid, 2)} paid</p>
                  </div>
                  <InvoiceBadge status={inv.status} overdue={isInvoiceOverdue(inv.status, inv.due_date, inv.balance)} />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      size="xs"
                      variant="ghost"
                      icon={<Eye className="h-3.5 w-3.5" />}
                      onClick={() => setPreviewingInvoiceId(inv.id)}
                    >
                      Preview
                    </Button>
                    {(inv.balance ?? 0) > 0 && inv.status !== 'Void' && (
                      <Button size="xs" variant="subtle" onClick={() => setPaying(inv)}>
                        Record payment
                      </Button>
                    )}
                    {inv.status !== 'Void' && (
                      <Button
                        size="xs"
                        variant="ghost"
                        icon={
                          inv.receiver_signature_path ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-status-delivered" />
                          ) : (
                            <PenLine className="h-3.5 w-3.5" />
                          )
                        }
                        onClick={() => setSigning(inv)}
                      >
                        {inv.receiver_signature_path ? 'Signed' : 'Signature'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <InvoiceFormModal open={invoiceOpen} onClose={() => setInvoiceOpen(false)} onSaved={refresh} presetShipment={shipment} />

      <InvoicePreviewModal
        open={!!previewingInvoiceId}
        onClose={() => setPreviewingInvoiceId(null)}
        invoiceId={previewingInvoiceId}
      />

      <RecordPaymentModal open={!!paying} onClose={() => setPaying(null)} onSaved={refresh} invoice={paying} />

      <ReceiverSignatureModal open={!!signing} onClose={() => setSigning(null)} onSaved={refresh} invoice={signing} />

      <ShipmentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={refresh}
        shipment={shipment}
        customerOptions={customerOptions}
      />

      <TrackingEventFormModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        onSaved={refresh}
        shipmentId={id}
        currentStatus={status}
        event={editingEvent}
      />

      <ConfirmDialog
        open={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={confirmDeleteEvent}
        loading={deleteLoading}
        title="Remove this tracking event?"
        confirmLabel="Remove event"
        description="It will disappear from the customer's public tracking timeline."
      />
    </div>
  )
}

/** Mirrors the loaded layout's shape so the swap causes no layout shift. */
function ShipmentDetailSkeleton() {
  return (
    <div>
      <div className="mb-6 space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-5 w-52 rounded-badge" />
      </div>
      <Skeleton className="mb-5 h-16 w-full rounded-deck" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-deck bg-panel p-4 shadow-deck">
              <Skeleton className="mb-3 h-3 w-24" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
        <div className="rounded-deck bg-panel shadow-deck xl:col-span-2">
          <div className="border-b border-deck-100 px-5 py-4">
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="space-y-4 p-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
