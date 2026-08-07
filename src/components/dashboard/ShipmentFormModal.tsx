import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Wand2 } from 'lucide-react'
import { Button, Input, Select, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import {
  createShipment,
  updateShipment,
  suggestTrackingNumber,
  listAssignableStaff,
  type AssignableStaff,
} from '@/services/shipmentsService'
import type { Customer, ShipmentWithCustomer, ShippingMethod, CargoType, ShipmentStatus } from '@/types'
import { SHIPMENT_STATUSES, SHIPPING_METHODS, CARGO_TYPES } from '@/types'
import { STATUS_LABEL, SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatCurrency } from '@/utils/format'

const schema = z.object({
  tracking_number: z.string().trim().min(6, 'Tracking number is too short'),
  customer_id: z.string().optional(),
  customer_name: z.string().trim().min(2, 'Enter the customer name'),
  origin: z.string().trim().min(2, 'Enter an origin'),
  destination: z.string().trim().min(2, 'Enter a destination'),
  shipping_method: z.string().min(1),
  cargo_type: z.string().min(1),
  status: z.string().min(1),
  weight: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter a weight' }).positive('Weight must be greater than 0').optional(),
  ),
  price_per_kg: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z
      .number({ invalid_type_error: 'Enter a rate' })
      .nonnegative('Rate cannot be negative')
      .optional(),
  ),
  estimated_delivery: z.string().optional(),
  warehouse: z.string().optional(),
  current_location: z.string().optional(),
  assigned_to: z.string().optional(),
  pieces: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter the number of pieces' }).int().positive('Must be at least 1'),
  ),
  booking_contact: z.string().optional(),
  cn_number: z.string().optional(),
  branch_code: z.string().optional(),
})

/** Total = weight x price per kg, rounded to cents. Mirrors the generated column in Postgres. */
function calcTotal(weight: unknown, pricePerKg: unknown): number | null {
  const w = Number(weight)
  const p = Number(pricePerKg)
  if (!weight || !pricePerKg || Number.isNaN(w) || Number.isNaN(p)) return null
  return Math.round(w * p * 100) / 100
}

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
  customer_name: '',
  origin: 'China',
  destination: 'Somalia',
  shipping_method: 'Air Freight',
  cargo_type: 'General Goods',
  status: 'Received',
  weight: '' as unknown as number,
  price_per_kg: '' as unknown as number,
  estimated_delivery: '',
  warehouse: '',
  current_location: '',
  assigned_to: '',
  pieces: 1,
  booking_contact: '',
  cn_number: '',
  branch_code: '',
}

export function ShipmentFormModal({ open, onClose, onSaved, shipment, customerOptions }: ShipmentFormModalProps) {
  const toast = useToast()
  const isEdit = !!shipment
  const [staff, setStaff] = useState<AssignableStaff[]>([])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const [watchedWeight, watchedRate] = useWatch({ control, name: ['weight', 'price_per_kg'] })
  const total = calcTotal(watchedWeight, watchedRate)

  useEffect(() => {
    if (!open) return
    if (shipment) {
      reset({
        tracking_number: shipment.tracking_number,
        customer_id: shipment.customer_id ?? '',
        customer_name: shipment.customer_name,
        origin: shipment.origin,
        destination: shipment.destination,
        shipping_method: shipment.shipping_method,
        cargo_type: shipment.cargo_type,
        status: shipment.status,
        weight: (shipment.weight ?? '') as unknown as number,
        price_per_kg: (shipment.price_per_kg ?? '') as unknown as number,
        estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.slice(0, 10) : '',
        warehouse: shipment.warehouse ?? '',
        current_location: shipment.current_location ?? '',
        assigned_to: shipment.assigned_to ?? '',
        pieces: shipment.pieces,
        booking_contact: shipment.booking_contact ?? '',
        cn_number: shipment.cn_number ?? '',
        branch_code: shipment.branch_code ?? '',
      })
    } else {
      reset(EMPTY)
    }
  }, [open, shipment, reset])

  // Staff list is only needed while the dialog is open.
  useEffect(() => {
    if (!open) return
    listAssignableStaff()
      .then(setStaff)
      .catch(() => setStaff([]))
  }, [open])

  async function handleSuggest() {
    try {
      const suggestion = await suggestTrackingNumber('CN')
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
      customer_name: parsed.customer_name,
      origin: parsed.origin,
      destination: parsed.destination,
      shipping_method: parsed.shipping_method as ShippingMethod,
      cargo_type: parsed.cargo_type as CargoType,
      // Status is set on creation only; once tracking events exist, they are
      // the sole source of truth (sync_shipment_status() trigger) and manual
      // edits here would just get silently overwritten by the next event.
      ...(isEdit ? {} : { status: parsed.status as ShipmentStatus }),
      weight: parsed.weight ?? null,
      price_per_kg: parsed.price_per_kg ?? null,
      estimated_delivery: parsed.estimated_delivery ? parsed.estimated_delivery : null,
      warehouse: parsed.warehouse?.trim() || null,
      current_location: parsed.current_location?.trim() || null,
      assigned_to: parsed.assigned_to || null,
      pieces: parsed.pieces,
      booking_contact: parsed.booking_contact?.trim() || null,
      cn_number: parsed.cn_number?.trim() || null,
      branch_code: parsed.branch_code?.trim() || null,
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
                placeholder="FNS-CN-000123"
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
              <p className="text-xs font-medium text-status-delayed">{errors.tracking_number.message}</p>
            )}
          </div>
          <Select label="Linked customer" options={customerSelectOptions} {...register('customer_id')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Customer name" error={errors.customer_name?.message} {...register('customer_name')} />
          <Select
            label="Cargo type"
            options={CARGO_TYPES.map((c) => ({ value: c, label: c }))}
            {...register('cargo_type')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Origin" error={errors.origin?.message} {...register('origin')} />
          <Input label="Destination" error={errors.destination?.message} {...register('destination')} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Select
            label="Method"
            options={SHIPPING_METHODS.map((m) => ({ value: m, label: SHIPPING_METHOD_LABEL[m] }))}
            {...register('shipping_method')}
          />
          <div className="flex flex-col gap-1.5">
            <Select
              label="Status"
              disabled={isEdit}
              options={SHIPMENT_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
              {...register('status')}
            />
            {isEdit && (
              <p className="text-xs text-text-secondary">Set automatically by tracking events.</p>
            )}
          </div>
          <Input label="Est. delivery" type="date" {...register('estimated_delivery')} />
        </div>

        {/* Operations: who owns this shipment and where it physically sits. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Warehouse" placeholder="Guangzhou Hub" {...register('warehouse')} />
          <Input
            label="Current location"
            placeholder="Set from tracking events"
            {...register('current_location')}
          />
          <Select
            label="Assigned to"
            options={[
              { value: '', label: 'Unassigned' },
              ...staff.map((p) => ({ value: p.id, label: `${p.full_name} (${p.role})` })),
            ]}
            {...register('assigned_to')}
          />
        </div>

        {/* Waybill label fields: printed on the label alongside the tracking number/barcode. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Booking contact"
            type="tel"
            placeholder="+252 6xx xxx xxx"
            {...register('booking_contact')}
          />
          <Input label="CN number" placeholder="1352503" {...register('cn_number')} />
          <Input label="Branch code" placeholder="GZ2025" {...register('branch_code')} />
        </div>

        <div className="rounded-lg border border-gray-300 bg-surface p-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4 sm:items-start">
            <Input
              label="Pieces"
              type="number"
              step="1"
              min="1"
              inputMode="numeric"
              placeholder="1"
              error={errors.pieces?.message}
              {...register('pieces')}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              error={errors.weight?.message}
              {...register('weight')}
            />
            <Input
              label="Price per kg ($)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              placeholder="0.00"
              error={errors.price_per_kg?.message}
              {...register('price_per_kg')}
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-navy-800">Total price</span>
              <div
                aria-live="polite"
                className="flex h-11 items-center rounded-lg border border-navy-100 bg-white px-3 font-mono text-lg font-bold tabular-nums text-navy-700"
              >
                {total === null ? '—' : formatCurrency(total, 2)}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs text-text-secondary">
            Calculated automatically as weight x price per kg. It cannot be edited by hand.
          </p>
        </div>
      </form>
    </Modal>
  )
}
