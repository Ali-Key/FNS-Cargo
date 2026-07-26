import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Pencil,
  Plus,
  Trash2,
  MapPin,
  Package,
  User,
  Calendar,
  Weight,
} from 'lucide-react'
import { Button, StatusBadge, Spinner, EmptyState } from '@/components/ui'
import { ConfirmDialog } from '@/components/dashboard'
import { ShipmentFormModal } from '@/components/dashboard/ShipmentFormModal'
import { TrackingEventFormModal } from '@/components/dashboard/TrackingEventFormModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { getShipment } from '@/services/shipmentsService'
import {
  listTrackingHistory,
  deleteTrackingEvent,
} from '@/services/trackingHistoryService'
import { listCustomerOptions } from '@/services/customersService'
import type {
  Customer,
  ShipmentStatus,
  ShipmentTrackingHistory,
  ShipmentWithCustomer,
  ShippingMethod,
} from '@/types'
import { STATUS_ICON, STATUS_STYLES, SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatDate, formatDateTime } from '@/utils/date'
import { formatWeight, formatCurrency } from '@/utils/format'

export default function ShipmentDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()

  const [shipment, setShipment] = useState<ShipmentWithCustomer | null>(null)
  const [history, setHistory] = useState<ShipmentTrackingHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [customerOptions, setCustomerOptions] = useState<Pick<Customer, 'id' | 'full_name'>[]>([])

  const [editOpen, setEditOpen] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<ShipmentTrackingHistory | null>(null)
  const [deletingEvent, setDeletingEvent] = useState<ShipmentTrackingHistory | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  useDocumentTitle(shipment ? `${shipment.tracking_number} · FNS Cargo` : 'Shipment · FNS Cargo')

  const load = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([getShipment(id), listTrackingHistory(id)])
      setShipment(s)
      setHistory(h)
    } catch {
      toast.error('Unable to load shipment', 'Please go back and try again.')
    } finally {
      setLoading(false)
    }
  }, [id, toast])

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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-navy-700" />
      </div>
    )
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
      <div>
        <Link
          to="/dashboard/shipments"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-steel-500 hover:text-navy-800"
        >
          <ArrowLeft className="h-4 w-4" /> All shipments
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-mono text-2xl font-bold text-navy-900">{shipment.tracking_number}</h1>
            <StatusBadge status={status} />
          </div>
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditOpen(true)}>
            Edit shipment
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <InfoCard icon={MapPin} title="Route">
            <Row label="Origin" value={shipment.origin} />
            <Row label="Destination" value={shipment.destination} />
            <Row label="Method" value={SHIPPING_METHOD_LABEL[shipment.shipping_method as ShippingMethod]} />
          </InfoCard>

          <InfoCard icon={Weight} title="Cargo">
            <Row label="Weight" value={formatWeight(shipment.weight_kg)} mono />
            <Row label="Pieces" value={String(shipment.pieces)} mono />
            <Row label="Declared value" value={formatCurrency(shipment.declared_value)} mono />
          </InfoCard>

          <InfoCard icon={Calendar} title="Dates">
            <Row label="Created" value={formatDate(shipment.created_at)} mono />
            <Row label="Est. delivery" value={formatDate(shipment.estimated_delivery)} mono />
            <Row label="Last updated" value={formatDate(shipment.updated_at)} mono />
          </InfoCard>

          <InfoCard icon={User} title="Parties">
            <Row label="Sender" value={shipment.sender_name} />
            {shipment.sender_phone && <Row label="Sender phone" value={shipment.sender_phone} />}
            <Row label="Receiver" value={shipment.receiver_name} />
            {shipment.receiver_phone && <Row label="Receiver phone" value={shipment.receiver_phone} />}
            {shipment.customers?.full_name && <Row label="Customer" value={shipment.customers.full_name} />}
          </InfoCard>

          {shipment.notes && (
            <div className="rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-1">
              <h3 className="text-sm font-bold text-navy-900">Internal notes</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-steel-600">{shipment.notes}</p>
            </div>
          )}
        </div>

        {/* Tracking history */}
        <div className="rounded-2xl border border-steel-100 bg-white shadow-elevation-1 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-steel-100 px-6 py-4">
            <h2 className="font-bold text-navy-900">Tracking history</h2>
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
          </div>

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
                          <p className="font-tabular text-xs text-steel-400">{formatDateTime(event.event_time)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingEvent(event)
                              setEventOpen(true)
                            }}
                            className="rounded-control p-1.5 text-steel-400 hover:bg-steel-100 hover:text-navy-800"
                            aria-label="Edit event"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingEvent(event)}
                            className="rounded-control p-1.5 text-steel-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="Delete event"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
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
        </div>
      </div>

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

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-1">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-accent-500" />
        <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      </div>
      <dl className="space-y-2">{children}</dl>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-steel-500">{label}</dt>
      <dd className={`text-right font-medium text-navy-800 ${mono ? 'font-tabular' : ''}`}>{value}</dd>
    </div>
  )
}
