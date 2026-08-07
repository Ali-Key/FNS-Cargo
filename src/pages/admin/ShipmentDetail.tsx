import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Pencil,
  Plus,
  Trash2,
  MapPin,
  Package,
  User,
  Calendar,
  Weight,
  Warehouse,
  Receipt,
  Eye,
  PenLine,
  CheckCircle2,
} from 'lucide-react'
import {
  Button,
  StatusBadge,
  PaymentBadge,
  InvoiceBadge,
  EmptyState,
  SectionCard,
  DetailRow,
  RowActions,
  Skeleton,
  SkeletonText,
} from '@/components/ui'
import { PageHeader, ConfirmDialog, ExportMenu, WorkflowStepper } from '@/components/dashboard'
import { ShipmentFormModal } from '@/components/dashboard/ShipmentFormModal'
import { TrackingEventFormModal } from '@/components/dashboard/TrackingEventFormModal'
import { InvoiceFormModal } from '@/components/dashboard/InvoiceFormModal'
import { InvoicePreviewModal } from '@/components/dashboard/InvoicePreviewModal'
import { RecordPaymentModal } from '@/components/dashboard/RecordPaymentModal'
import { DeliveryProofCard } from '@/components/dashboard/DeliveryProofCard'
import { ReceiverSignatureModal } from '@/components/dashboard/ReceiverSignatureModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { getShipment } from '@/services/shipmentsService'
import { listInvoicesForShipment } from '@/services/financeService'
import {
  listTrackingHistory,
  deleteTrackingEvent,
} from '@/services/trackingHistoryService'
import { listCustomerOptions } from '@/services/customersService'
import { downloadWaybillLabel, printWaybillLabel } from '@/lib/exports/labelExports'
import type {
  Customer,
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

export default function ShipmentDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [shipment, setShipment] = useState<ShipmentWithCustomer | null>(null)
  const [history, setHistory] = useState<TrackingUpdate[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [customerOptions, setCustomerOptions] = useState<Pick<Customer, 'id' | 'full_name'>[]>([])

  const [invoiceOpen, setInvoiceOpen] = useState(false)
  const [previewingInvoiceId, setPreviewingInvoiceId] = useState<string | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [signing, setSigning] = useState<Invoice | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TrackingUpdate | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<TrackingUpdate | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useDocumentTitle(shipment ? `${shipment.tracking_number} | FNS Cargo` : 'Shipment | FNS Cargo')

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getShipment(id), listTrackingHistory(id)])
      setShipment(s)
      setHistory(h)
      // Invoices are admin-only at the RLS layer; asking as a dispatcher would
      // just return an empty set, so skip the round trip entirely.
      setInvoices(isAdmin ? await listInvoicesForShipment(id) : [])
    } catch {
      toast.error('Unable to load shipment', 'Please go back and try again.')
    } finally {
      setLoading(false)
    }
  }, [id, isAdmin, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    listCustomerOptions()
      .then(setCustomerOptions)
      .catch(() => setCustomerOptions([]))
  }, [])

  async function confirmDeleteEvent() {
    if (!deletingEvent) return
    setDeleteLoading(true)
    try {
      await deleteTrackingEvent(deletingEvent.id, id)
      toast.success('Tracking event removed', 'It no longer appears on the customer timeline.')
      setDeletingEvent(null)
      load()
    } catch {
      toast.error('Unable to remove event', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) {
    return <ShipmentDetailSkeleton />
  }

  if (!shipment) {
    return (
      <EmptyState
        icon={<Package className="h-6 w-6" />}
        title="Shipment not found"
        description="It may have been deleted."
        action={
          <Button variant="secondary" onClick={() => navigate('/dashboard/shipments')}>
            Back to shipments
          </Button>
        }
      />
    )
  }

  const status = shipment.status as ShipmentStatus

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ to: '/dashboard/shipments', label: 'All shipments' }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="font-mono">{shipment.tracking_number}</span>
            <StatusBadge status={status} delayed={isShipmentDelayed(status, shipment.estimated_delivery)} />
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <ExportMenu
              items={[
                {
                  label: 'Print waybill label',
                  onClick: () => printWaybillLabel(id, '100x150'),
                },
                {
                  label: 'Download label (100×150mm)',
                  onClick: () => downloadWaybillLabel(id, '100x150'),
                },
                {
                  label: 'Download label (A6)',
                  onClick: () => downloadWaybillLabel(id, 'A6'),
                },
              ]}
            />
            <Button variant="primary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
              Edit shipment
            </Button>
          </div>
        }
      />

      <WorkflowStepper
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <SectionCard icon={MapPin} title="Route" variant="compact">
            <DetailRow label="Origin" value={shipment.origin} />
            <DetailRow label="Destination" value={shipment.destination} />
            <DetailRow label="Method" value={SHIPPING_METHOD_LABEL[shipment.shipping_method as ShippingMethod]} />
          </SectionCard>

          <SectionCard icon={Weight} title="Cargo" variant="compact">
            <DetailRow label="Cargo type" value={shipment.cargo_type} />
            <DetailRow label="Pieces" value={shipment.pieces} mono />
            <DetailRow label="Weight" value={formatWeight(shipment.weight)} mono />
            <DetailRow label="Price per kg" value={formatCurrency(shipment.price_per_kg, 2)} mono />
            <DetailRow label="Total price" value={formatCurrency(shipment.total_price, 2)} mono />
          </SectionCard>

          <SectionCard icon={Calendar} title="Dates" variant="compact">
            <DetailRow label="Created" value={formatDate(shipment.created_at)} mono />
            <DetailRow label="Est. delivery" value={formatDate(shipment.estimated_delivery)} mono />
            <DetailRow label="Last updated" value={formatDate(shipment.updated_at)} mono />
          </SectionCard>

          <SectionCard icon={User} title="Customer" variant="compact">
            <DetailRow label="Name" value={shipment.customer_name} />
            {shipment.customer?.email && <DetailRow label="Account email" value={shipment.customer.email} />}
          </SectionCard>

          <SectionCard icon={Warehouse} title="Operations" variant="compact">
            <DetailRow label="Warehouse" value={shipment.warehouse ?? 'Not set'} />
            <DetailRow label="Current location" value={shipment.current_location ?? 'Not set'} />
            <DetailRow label="Assigned to" value={shipment.assignee?.full_name ?? 'Unassigned'} />
            <DetailRow label="Booking contact" value={shipment.booking_contact ?? 'Not set'} />
            <DetailRow label="CN number" value={shipment.cn_number ?? 'Not set'} mono />
            <DetailRow label="Branch code" value={shipment.branch_code ?? 'Not set'} mono />
            <DetailRow label="Flight number" value={shipment.flight_number ?? 'Not set'} mono />
            {shipment.delivered_at && (
              <DetailRow label="Delivered" value={formatDateTime(shipment.delivered_at)} mono />
            )}
            <DetailRow label="Payment">
              <PaymentBadge status={shipment.payment_status} />
            </DetailRow>
          </SectionCard>

          <DeliveryProofCard
            shipmentId={id}
            proofPath={shipment.delivery_proof_url}
            onChange={load}
            canDelete={isAdmin}
          />
        </div>

        {/* Tracking history */}
        <SectionCard
          title="Tracking history"
          flush
          className="lg:col-span-2"
          action={
            <Button
              variant="primary"
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
        >
          {history.length === 0 ? (
            <EmptyState
              icon={<MapPin className="h-6 w-6" />}
              title="No updates yet"
              description="Add the first update to start the timeline your customer sees."
            />
          ) : (
            <ol className="relative space-y-6 px-6 py-6">
              {history.map((event, i) => {
                const eStatus = event.status as ShipmentStatus
                const Icon = STATUS_ICON[eStatus]
                const style = STATUS_STYLES[eStatus]
                return (
                  <li key={event.id} className="relative flex gap-4">
                    {i < history.length - 1 && (
                      <span className="absolute left-[15px] top-9 h-[calc(100%+0.5rem)] w-px bg-steel-200" aria-hidden />
                    )}
                    <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-navy-900">{event.location}</p>
                          <p className="font-tabular text-xs text-steel-400">
                            {formatDateTime(`${event.date}T${event.time}`)}
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
                        <p className="mt-1 text-sm leading-relaxed text-steel-600">{event.description}</p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </SectionCard>
      </div>

      {/* Billing — admin only, mirroring the invoices RLS policy. */}
      {isAdmin && (
        <SectionCard
          title="Billing"
          description="Invoices raised against this shipment and what has been collected."
          flush
          action={
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setInvoiceOpen(true)}
            >
              Raise invoice
            </Button>
          }
        >
          {invoices.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" />}
              title="Not invoiced yet"
              description={`This shipment prices out at ${formatCurrency(shipment.total_price, 2)}. Raise an invoice to bill it.`}
            />
          ) : (
            <ul className="divide-y divide-steel-100">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-navy-900">{inv.invoice_number}</p>
                    <p className="text-xs text-text-secondary">
                      Issued {formatDate(inv.issued_at)}
                      {inv.due_date && ` · due ${formatDate(inv.due_date)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-right">
                      <p className="font-tabular text-sm font-bold text-navy-900">
                        {formatCurrency(inv.amount, 2)}
                      </p>
                      <p className="font-tabular text-xs text-text-secondary">
                        {formatCurrency(inv.amount_paid, 2)} paid
                      </p>
                    </div>
                    <InvoiceBadge
                      status={inv.status}
                      overdue={isInvoiceOverdue(inv.status, inv.due_date, inv.balance)}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Eye className="h-4 w-4" />}
                      onClick={() => setPreviewingInvoiceId(inv.id)}
                    >
                      Preview
                    </Button>
                    {(inv.balance ?? 0) > 0 && inv.status !== 'Void' && (
                      <Button size="sm" variant="secondary" onClick={() => setPaying(inv)}>
                        Record payment
                      </Button>
                    )}
                    {inv.status !== 'Void' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={
                          inv.receiver_signature_path ? (
                            <CheckCircle2 className="h-4 w-4 text-status-delivered" />
                          ) : (
                            <PenLine className="h-4 w-4" />
                          )
                        }
                        onClick={() => setSigning(inv)}
                      >
                        {inv.receiver_signature_path ? 'Signed' : 'Capture signature'}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      <InvoiceFormModal
        open={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
        onSaved={load}
        presetShipment={shipment}
      />

      <InvoicePreviewModal
        open={!!previewingInvoiceId}
        onClose={() => setPreviewingInvoiceId(null)}
        invoiceId={previewingInvoiceId}
      />

      <RecordPaymentModal
        open={!!paying}
        onClose={() => setPaying(null)}
        onSaved={load}
        invoice={paying}
      />

      <ReceiverSignatureModal
        open={!!signing}
        onClose={() => setSigning(null)}
        onSaved={load}
        invoice={signing}
      />

      <ShipmentFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={load}
        shipment={shipment}
        customerOptions={customerOptions}
      />

      <TrackingEventFormModal
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        onSaved={load}
        shipmentId={id}
        currentStatus={status}
        event={editingEvent}
      />

      <ConfirmDialog
        open={!!deletingEvent}
        onClose={() => setDeletingEvent(null)}
        onConfirm={confirmDeleteEvent}
        loading={deleteLoading}
        title="Remove tracking event?"
        confirmLabel="Remove"
        description="This event will no longer appear on the customer's tracking timeline."
      />
    </div>
  )
}

/** Mirrors the loaded layout's shape so the swap from skeleton to data causes no layout shift. */
function ShipmentDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-5">
        <Skeleton className="mb-3 h-4 w-28" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border border-gray-200 bg-white p-5 shadow-elevation-1">
              <Skeleton className="mb-3 h-4 w-24" />
              <SkeletonText lines={3} />
            </div>
          ))}
        </div>
        <div className="rounded-card border border-gray-200 bg-white shadow-elevation-1 lg:col-span-2">
          <div className="border-b border-gray-200 px-6 py-4">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="space-y-4 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
