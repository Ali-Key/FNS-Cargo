import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wand2 } from 'lucide-react'
import { Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import {
  createShipment,
  updateShipment,
  suggestTrackingNumber,
} from '@/services/shipmentsService'
import type { Customer, ShipmentWithCustomer } from '@/types'
import { SHIPMENT_STATUSES, SHIPPING_METHODS } from '@/types'
import { STATUS_LABEL, SHIPPING_METHOD_LABEL } from '@/utils/status'

const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
  z.number({ invalid_type_error: 'Enter a number' }).nonnegative('Must be 0 or more').optional(),
)

const schema = z.object({
  tracking_number: z.string().trim().min(6, 'Tracking number is too short'),
  customer_id: z.string().optional(),
  sender_name: z.string().trim().min(2, 'Enter the sender name'),
  sender_phone: z.string().trim().optional(),
  receiver_name: z.string().trim().min(2, 'Enter the receiver name'),
  receiver_phone: z.string().trim().optional(),
  origin: z.string().trim().min(2, 'Enter an origin'),
  destination: z.string().trim().min(2, 'Enter a destination'),
  shipping_method: z.enum(['air', 'sea', 'road']),
  status: z.enum(['pending', 'in_transit', 'delivered', 'delayed', 'cancelled']),
  weight_kg: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter a weight' }).positive('Weight must be greater than 0'),
  ),
  pieces: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? 1 : Number(v)),
    z.number().int('Whole number only').min(1, 'At least 1 piece'),
  ),
  declared_value: optionalNumber,
  estimated_delivery: z.string().optional(),
  notes: z.string().trim().optional(),
})

type FormValues = z.input<typeof schema>

interface ShipmentFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  shipment?: ShipmentWithCustomer | null
  customerOptions: Pick<Customer, 'id' | 'full_name'>[]
}

const EMPTY: FormValues = {
  tracking_number: '',
  customer_id: '',
  sender_name: '',
  sender_phone: '',
  receiver_name: '',
  receiver_phone: '',
  origin: 'China',
  destination: 'Somalia',
  shipping_method: 'sea',
  status: 'pending',
  weight_kg: '' as unknown as number,
  pieces: 1,
  declared_value: '' as unknown as number,
  estimated_delivery: '',
  notes: '',
}

export function ShipmentFormModal({ open, onClose, onSaved, shipment, customerOptions }: ShipmentFormModalProps) {
  const toast = useToast()
  const isEdit = !!shipment

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (!open) return
    if (shipment) {
      reset({
        tracking_number: shipment.tracking_number,
        customer_id: shipment.customer_id ?? '',
        sender_name: shipment.sender_name,
        sender_phone: shipment.sender_phone ?? '',
        receiver_name: shipment.receiver_name,
        receiver_phone: shipment.receiver_phone ?? '',
        origin: shipment.origin,
        destination: shipment.destination,
        shipping_method: shipment.shipping_method as FormValues['shipping_method'],
        status: shipment.status as FormValues['status'],
        weight_kg: shipment.weight_kg,
        pieces: shipment.pieces,
        declared_value: (shipment.declared_value ?? '') as unknown as number,
        estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.slice(0, 10) : '',
        notes: shipment.notes ?? '',
      })
    } else {
      reset(EMPTY)
    }
  }, [open, shipment, reset])

  async function handleSuggest() {
    try {
      const suggestion = await suggestTrackingNumber(new Date().getFullYear())
      setValue('tracking_number', suggestion, { shouldValidate: true })
    } catch {
      toast.error('Could not generate a number', 'Please enter a tracking number manually and try again.')
    }
  }

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values)
    const payload = {
      tracking_number: parsed.tracking_number.toUpperCase(),
      customer_id: parsed.customer_id || null,
      sender_name: parsed.sender_name,
      sender_phone: parsed.sender_phone || null,
      receiver_name: parsed.receiver_name,
      receiver_phone: parsed.receiver_phone || null,
      origin: parsed.origin,
      destination: parsed.destination,
      shipping_method: parsed.shipping_method,
      status: parsed.status,
      weight_kg: parsed.weight_kg,
      pieces: parsed.pieces,
      declared_value: parsed.declared_value ?? null,
      estimated_delivery: parsed.estimated_delivery ? parsed.estimated_delivery : null,
      notes: parsed.notes || null,
    }

    try {
      if (isEdit && shipment) {
        await updateShipment(shipment.id, payload)
        toast.success('Shipment updated', `Changes to ${payload.tracking_number} have been saved.`)
      } else {
        await createShipment(payload)
        toast.success('Shipment created', `${payload.tracking_number} is now live and ready to track.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      if (/duplicate|unique/i.test(message)) {
        toast.error('Duplicate tracking number', 'Another shipment already uses this number. Please choose a unique one.')
      } else {
        toast.error('Unable to save shipment', message)
      }
    }
  }

  const customerSelectOptions = [
    { value: '', label: 'No linked customer' },
    ...customerOptions.map((c) => ({ value: c.id, label: c.full_name })),
  ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Edit shipment' : 'New shipment'}
      description={isEdit ? shipment?.tracking_number : 'Create a shipment and its initial status.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create shipment'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tracking_number" className="text-sm font-semibold text-navy-800">
              Tracking number
            </label>
            <div className="flex gap-2">
              <Input
                id="tracking_number"
                className="font-mono"
                placeholder="FNS-2026-000123"
                error={errors.tracking_number?.message}
                containerClassName="flex-1"
                {...register('tracking_number')}
              />
              {!isEdit && (
                <Button type="button" variant="secondary" onClick={handleSuggest} icon={<Wand2 className="h-4 w-4" />}>
                  Suggest
                </Button>
              )}
            </div>
            {errors.tracking_number && (
              <p className="text-xs font-medium text-red-600">{errors.tracking_number.message}</p>
            )}
          </div>
          <Select label="Linked customer" options={customerSelectOptions} {...register('customer_id')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Sender name" error={errors.sender_name?.message} {...register('sender_name')} />
          <Input label="Sender phone (optional)" {...register('sender_phone')} />
          <Input label="Receiver name" error={errors.receiver_name?.message} {...register('receiver_name')} />
          <Input label="Receiver phone (optional)" {...register('receiver_phone')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Origin" error={errors.origin?.message} {...register('origin')} />
          <Input label="Destination" error={errors.destination?.message} {...register('destination')} />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Select
            label="Method"
            options={SHIPPING_METHODS.map((m) => ({ value: m, label: SHIPPING_METHOD_LABEL[m] }))}
            {...register('shipping_method')}
          />
          <Select
            label="Status"
            options={SHIPMENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
            {...register('status')}
          />
          <Input
            label="Weight (kg)"
            type="number"
            step="0.01"
            error={errors.weight_kg?.message}
            {...register('weight_kg')}
          />
          <Input label="Pieces" type="number" error={errors.pieces?.message} {...register('pieces')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Declared value (USD, optional)"
            type="number"
            step="0.01"
            error={errors.declared_value?.message}
            {...register('declared_value')}
          />
          <Input label="Estimated delivery (optional)" type="date" {...register('estimated_delivery')} />
        </div>

        <Textarea label="Internal notes (optional)" rows={3} {...register('notes')} />
      </form>
    </Modal>
  )
}
