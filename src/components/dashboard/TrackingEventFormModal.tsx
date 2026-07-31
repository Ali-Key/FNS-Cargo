import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createTrackingEvent, updateTrackingEvent } from '@/services/trackingHistoryService'
import { updateShipment } from '@/services/shipmentsService'
import type { ShipmentStatus, TrackingUpdate } from '@/types'
import { SHIPMENT_STATUSES } from '@/types'
import { STATUS_LABEL } from '@/utils/status'

const schema = z.object({
  status: z.string().min(1),
  date: z.string().min(1, 'Choose a date'),
  time: z.string().min(1, 'Choose a time'),
  country: z.string().trim().min(2, 'Enter a country'),
  city: z.string().trim().min(2, 'Enter a city'),
  location: z.string().trim().min(2, 'Enter a location'),
  description: z.string().trim().optional(),
  sync_status: z.boolean().optional(),
})

type FormValues = z.infer<typeof schema>

function todayInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function nowTimeInput(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface TrackingEventFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  shipmentId: string
  currentStatus?: ShipmentStatus
  event?: TrackingUpdate | null
}

export function TrackingEventFormModal({
  open,
  onClose,
  onSaved,
  shipmentId,
  currentStatus,
  event,
}: TrackingEventFormModalProps) {
  const toast = useToast()
  const isEdit = !!event

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    if (event) {
      reset({
        status: event.status,
        date: event.date,
        time: event.time.slice(0, 5),
        country: event.country,
        city: event.city,
        location: event.location,
        description: event.description ?? '',
        sync_status: false,
      })
    } else {
      reset({
        status: currentStatus ?? 'Received',
        date: todayInput(),
        time: nowTimeInput(),
        country: '',
        city: '',
        location: '',
        description: '',
        sync_status: true,
      })
    }
  }, [open, event, currentStatus, reset])

  async function onSubmit(values: FormValues) {
    const status = values.status as ShipmentStatus
    try {
      if (isEdit && event) {
        await updateTrackingEvent(event.id, {
          status,
          date: values.date,
          time: values.time,
          country: values.country,
          city: values.city,
          location: values.location,
          description: values.description || null,
        })
        toast.success('Tracking event updated', 'The timeline entry has been saved.')
      } else {
        await createTrackingEvent({
          shipment_id: shipmentId,
          status,
          date: values.date,
          time: values.time,
          country: values.country,
          city: values.city,
          location: values.location,
          description: values.description || null,
        })
        if (values.sync_status) {
          await updateShipment(shipmentId, { status })
        }
        toast.success('Tracking event added', 'Customers will now see this update on their tracking page.')
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to save event', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={isEdit ? 'Edit tracking event' : 'Add tracking event'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add event'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Status"
          options={SHIPMENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
          {...register('status')}
        />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Time" type="time" error={errors.time?.message} {...register('time')} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Country" placeholder="e.g. China" error={errors.country?.message} {...register('country')} />
          <Input label="City" placeholder="e.g. Guangzhou" error={errors.city?.message} {...register('city')} />
        </div>
        <Input
          label="Location"
          placeholder="e.g. Guangzhou Port terminal"
          error={errors.location?.message}
          {...register('location')}
        />
        <Textarea
          label="Description (optional)"
          rows={3}
          placeholder="Add any detail visible to the customer on the tracking page"
          {...register('description')}
        />
        {!isEdit && (
          <label className="flex items-center gap-2.5 text-sm text-steel-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-500"
              {...register('sync_status')}
            />
            Set the shipment’s current status to match this event
          </label>
        )}
      </form>
    </Modal>
  )
}
