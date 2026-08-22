import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Combobox, Input, Select, Modal, FieldGroup, StatusBadge } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import {
  createShipment,
  updateShipment,
  previewShipmentNumbers,
  type ShipmentNumberPreview,
} from '@/services/shipmentsService'
import type { CustomerOption } from '@/services/customersService'
import { useActiveCountries } from '@/hooks/useCountries'
import { useWarehouseAssignment } from '@/hooks/useWarehouses'
import { resolveBranchCode } from '@/utils/warehouse'
import { WarehouseField } from './WarehouseField'
import { BranchCodeField } from './BranchCodeField'
import type { ShipmentWithCustomer, ShippingMethod, CargoType, ShipmentStatus } from '@/types'
import { SHIPPING_METHODS, CARGO_TYPES } from '@/types'
import { SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatCurrency } from '@/utils/format'

/** Every shipment enters the pipeline here; later stages come from tracking events. */
const INITIAL_STATUS: ShipmentStatus = 'Received'

const schema = z
  .object({
    customer_id: z.string().optional(),
    customer_name: z.string().trim().optional(),
    // Which countries are selectable is data, not code: the options come from
    // the `countries` table, so the schema only asks that one was picked.
    origin: z.string().trim().min(1, 'Select an origin country'),
    destination: z.string().trim().min(1, 'Select a destination country'),
    shipping_method: z.string().min(1),
    cargo_type: z.string().min(1),
    weight: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ invalid_type_error: 'Enter a weight' }).positive('Weight must be greater than 0').optional(),
    ),
    price_per_kg: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ invalid_type_error: 'Enter a rate' }).nonnegative('Rate cannot be negative').optional(),
    ),
    estimated_delivery: z.string().optional(),
    // The warehouse is derived from the origin rather than typed, so the schema
    // only carries the relationship. Whether one is required depends on how many
    // warehouses the chosen origin has, which only the resolver knows — that
    // check lives in `onSubmit`.
    warehouse_id: z.string().optional(),
    pieces: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ invalid_type_error: 'Enter the number of pieces' }).int().positive('Must be at least 1'),
    ),
    booking_contact: z.string().optional(),
    // No `branch_code`. The branch is the warehouse handling the cargo and the
    // code is the branch's own, stamped onto the row by the database from
    // `warehouse_id` — there is nothing for the form to submit or validate.
    flight_number: z.string().optional(),
  })
  // `shipments.customer_name` is NOT NULL. A linked customer supplies it; a
  // walk-in booking has to type it.
  .superRefine((values, ctx) => {
    if (values.origin && values.origin === values.destination) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destination'],
        message: 'Destination must differ from origin',
      })
    }
    if (!values.customer_id && (values.customer_name ?? '').trim().length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customer_name'],
        message: 'Pick a customer or enter a name',
      })
    }
  })

/** Total = weight x price per kg, rounded to cents. Mirrors the generated column in Postgres. */
function calcTotal(weight: unknown, pricePerKg: unknown): number | null {
  const w = Number(weight)
  const p = Number(pricePerKg)
  if (!weight || !pricePerKg || Number.isNaN(w) || Number.isNaN(p)) return null
  return Math.round(w * p * 100) / 100
}

/** The booking contact is the linked customer's own name and phone, never re-typed. */
function contactFromCustomer(customer: CustomerOption | null | undefined): string {
  if (!customer) return ''
  return [customer.full_name, customer.phone].filter(Boolean).join(' · ')
}

type FormValues = z.input<typeof schema>

interface ShipmentFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  shipment?: ShipmentWithCustomer | null
  customerOptions: CustomerOption[]
}

const EMPTY: FormValues = {
  customer_id: '',
  customer_name: '',
  origin: '',
  destination: '',
  shipping_method: 'Air Freight',
  cargo_type: 'General Goods',
  weight: '' as unknown as number,
  price_per_kg: '' as unknown as number,
  estimated_delivery: '',
  warehouse_id: '',
  pieces: 1,
  booking_contact: '',
  flight_number: '',
}

/** Section heading inside the dialog, so the long form reads as several short ones. */
function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="border-b border-deck-100 pb-2">
        <h3 className="text-[13px] font-semibold text-deck-900">{title}</h3>
        {description && <p className="mt-0.5 text-[12px] text-deck-500">{description}</p>}
      </div>
      {children}
    </section>
  )
}

/** Read-only display that matches the height and framing of a real control. */
function ReadOnlyValue({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500">{label}</span>
      <div
        aria-live="polite"
        className="flex min-h-10 items-center rounded-deck-sm border border-deck-150 bg-deck-50 px-3 text-sm font-medium text-deck-800"
      >
        {value}
      </div>
      {hint && <p className="text-[12px] text-deck-500">{hint}</p>}
    </div>
  )
}

export function ShipmentFormModal({ open, onClose, onSaved, shipment, customerOptions }: ShipmentFormModalProps) {
  const toast = useToast()
  const { profile } = useAuth()
  const isEdit = !!shipment
  // What a new booking will be numbered. Shown only — the database issues the
  // real pair when the row is inserted.
  const [numbers, setNumbers] = useState<ShipmentNumberPreview | null>(null)
  // Shared across every consumer of the country list, so opening this dialog
  // repeatedly costs no extra request.
  const { countries, loading: countriesLoading, error: countriesError } = useActiveCountries()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    clearErrors,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const [watchedWeight, watchedRate, watchedCustomerId, origin, destination, warehouseId] = useWatch({
    control,
    name: ['weight', 'price_per_kg', 'customer_id', 'origin', 'destination', 'warehouse_id'],
  })
  const total = calcTotal(watchedWeight, watchedRate)
  const linkedCustomer = customerOptions.find((c) => c.id === watchedCustomerId) ?? null

  /**
   * The origin decides the warehouse. This keeps `warehouse_id` correct for
   * whatever the origin currently is — assigning the only candidate, or
   * clearing a value the new origin has made invalid — so the dispatcher never
   * has to think about it and a stale warehouse cannot reach the database.
   */
  const assignWarehouse = useCallback(
    (id: string) => setValue('warehouse_id', id, { shouldDirty: true }),
    [setValue],
  )
  const warehouse = useWarehouseAssignment({
    origin,
    value: warehouseId,
    onChange: assignWarehouse,
    enabled: open,
    existingWarehouseId: shipment?.warehouse_id ?? null,
  })

  /**
   * The branch code, read off the assigned branch. A shipment being edited that
   * predates branch codes falls back to the one it was booked with, so saving
   * it never blanks what is printed on its waybill.
   */
  const branch = resolveBranchCode(warehouse.status, warehouse.selected, shipment?.branch_code)

  // "Warehouse is required" is raised at submit time rather than by the zod
  // resolver, so it is cleared here rather than on the next submit — including
  // when the origin changes and the field resolves itself.
  useEffect(() => {
    if (warehouseId || warehouse.status !== 'choice') clearErrors('warehouse_id')
  }, [warehouseId, warehouse.status, clearErrors])

  useEffect(() => {
    if (!open) return
    if (shipment) {
      reset({
        customer_id: shipment.customer_id ?? '',
        customer_name: shipment.customer_name,
        origin: shipment.origin ?? '',
        destination: shipment.destination ?? '',
        shipping_method: shipment.shipping_method,
        cargo_type: shipment.cargo_type,
        weight: (shipment.weight ?? '') as unknown as number,
        price_per_kg: (shipment.price_per_kg ?? '') as unknown as number,
        estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.slice(0, 10) : '',
        warehouse_id: shipment.warehouse_id ?? '',
        pieces: shipment.pieces,
        booking_contact: shipment.booking_contact ?? '',
        flight_number: shipment.flight_number ?? '',
      })
    } else {
      reset(EMPTY)
    }
  }, [open, shipment, reset])

  // The numbers a new booking is about to receive, so the operator sees them
  // while filling the form in. An edit shows what the shipment already carries.
  useEffect(() => {
    if (!open || shipment) return
    let cancelled = false
    setNumbers(null)
    previewShipmentNumbers()
      .then((next) => {
        if (!cancelled) setNumbers(next)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open, shipment])

  /** The linked customer owns the name and the booking contact; neither is retyped. */
  function handleCustomerChange(customerId: string) {
    setValue('customer_id', customerId, { shouldValidate: true })
    const customer = customerOptions.find((c) => c.id === customerId)
    if (!customer) return
    setValue('customer_name', customer.full_name, { shouldValidate: true })
    setValue('booking_contact', contactFromCustomer(customer))
  }

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values)
    // Several warehouses serve this origin and none was picked. Automatic
    // assignment cannot guess between them, so the booking waits.
    if (warehouse.status === 'choice' && !parsed.warehouse_id) {
      setError('warehouse_id', { type: 'manual', message: 'Warehouse is required.' })
      return
    }
    // No branch, no branch code. Saving anyway would put a shipment on the
    // books with no facility accountable for it and a blank waybill, so it is
    // refused with the reason rather than created quietly.
    if (!branch.code) {
      const message =
        branch.status === 'pending'
          ? 'Waiting for the branch to be assigned. Try again in a moment.'
          : `No branch code can be issued${parsed.origin ? ` for ${parsed.origin}` : ''}. Assign a warehouse to this origin first.`
      setError('warehouse_id', { type: 'manual', message })
      toast.error('Branch code missing', message)
      return
    }
    const linked = customerOptions.find((c) => c.id === parsed.customer_id)
    // No tracking or cargo number here: both are issued by the database, on
    // insert, and an edit must never rewrite them.
    const payload = {
      customer_id: parsed.customer_id || null,
      customer_name: (linked?.full_name ?? parsed.customer_name ?? '').trim(),
      origin: parsed.origin,
      destination: parsed.destination,
      shipping_method: parsed.shipping_method as ShippingMethod,
      cargo_type: parsed.cargo_type as CargoType,
      // Status is set on creation only; once tracking events exist, they are
      // the sole source of truth (sync_shipment_status() trigger) and manual
      // edits here would just get silently overwritten by the next event.
      // `assigned_to` is likewise stamped once, from the signed-in operator —
      // it is a record of who booked the cargo, not a field to pick.
      ...(isEdit ? {} : { status: INITIAL_STATUS, assigned_to: profile?.id ?? null }),
      weight: parsed.weight ?? null,
      price_per_kg: parsed.price_per_kg ?? null,
      estimated_delivery: parsed.estimated_delivery ? parsed.estimated_delivery : null,
      // `warehouse` (the label) is maintained by the database from this id, so
      // sending it here could only ever contradict the relationship.
      warehouse_id: parsed.warehouse_id || null,
      pieces: parsed.pieces,
      booking_contact: (linked ? contactFromCustomer(linked) : parsed.booking_contact?.trim()) || null,
      // `branch_code` is stamped by the database from `warehouse_id`, exactly
      // as `warehouse` is. Sending it could only contradict the branch.
      flight_number: parsed.flight_number?.trim() || null,
    }

    try {
      if (isEdit && shipment) {
        await updateShipment(shipment.id, payload)
        toast.success('Shipment updated', `Changes to ${shipment.tracking_number} have been saved.`)
      } else {
        // The numbers on screen were a preview; the created row carries the
        // ones actually issued, so the toast quotes those.
        const created = await createShipment(payload)
        toast.success('Shipment created', `${created.tracking_number} is now live and ready to track.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      toast.error('Unable to save shipment', message)
    }
  }

  const countryOptions = useMemo(() => {
    const options = countries.map((c) => ({ value: c.name, label: c.name }))
    const known = new Set(options.map((o) => o.value))
    // Editing a shipment booked before a country was retired must not silently
    // blank its route, so whatever it already carries stays selectable.
    for (const existing of [shipment?.origin, shipment?.destination]) {
      if (existing && !known.has(existing)) {
        known.add(existing)
        options.push({ value: existing, label: `${existing} (no longer offered)` })
      }
    }
    return options
  }, [countries, shipment?.origin, shipment?.destination])

  /** One line explaining an empty picker, rather than a silently empty list. */
  const countryNote = countriesLoading
    ? 'Loading countries…'
    : countriesError
      ? 'Unable to load countries. Please try again.'
      : countryOptions.length === 0
        ? 'No active countries yet. Add one in Settings → Countries.'
        : undefined

  // Both numbers belong to the database. On an edit they are read back from the
  // shipment; on a new booking they are the preview, until the insert issues
  // the real pair.
  const PENDING = 'Assigned when the shipment is created'
  const trackingNumber = isEdit ? shipment!.tracking_number : (numbers?.trackingNumber ?? PENDING)
  const cnNumber = isEdit ? (shipment!.cn_number ?? 'Not set') : (numbers?.cnNumber ?? PENDING)
  const numberHint = isEdit ? 'Issued automatically when the shipment was created.' : 'Automatically assigned'

  const customerSelectOptions = useMemo(
    () => [
      { value: '', label: 'Walk-in booking (no linked customer)' },
      ...customerOptions.map((c) => ({
        value: c.id,
        label: c.full_name,
        hint: [c.company, c.email, c.phone].filter(Boolean).join(' · '),
      })),
    ],
    [customerOptions],
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={isEdit ? 'Edit shipment' : 'New shipment'}
      description={
        isEdit
          ? shipment?.tracking_number
          : 'Create a shipment, assign its customer, and prepare it for tracking.'
      }
      footer={
        <div className="flex  justify-stretch gap-2">
          <Button variant="ghost" className='text-center ' onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Create shipment'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Section title="Shipment">
          <FieldGroup>
            <ReadOnlyValue
              label="Tracking number"
              value={<span className="font-mono">{trackingNumber}</span>}
              hint={numberHint}
            />
            <ReadOnlyValue
              label="Cargo number (CN)"
              value={<span className="font-mono">{cnNumber}</span>}
              hint={numberHint}
            />
          </FieldGroup>
        </Section>

        <Section title="Customer">
          <FieldGroup>
            <Controller
              control={control}
              name="customer_id"
              render={({ field }) => (
                <Combobox
                  label="Customer"
                  options={customerSelectOptions}
                  value={field.value ?? ''}
                  onChange={handleCustomerChange}
                  placeholder="Search by name, email or phone"
                  emptyMessage="No matching customer"
                  hint={
                    linkedCustomer
                      ? [linkedCustomer.phone, linkedCustomer.email].filter(Boolean).join('  ·  ') ||
                        'No contact on file'
                      : undefined
                  }
                />
              )}
            />
            {!linkedCustomer && (
              <Input
                label="Customer name"
                placeholder="Name on the booking"
                hint="Only needed for a walk-in booking with no customer record."
                error={errors.customer_name?.message}
                {...register('customer_name')}
              />
            )}
          </FieldGroup>
        </Section>

        <Section title="Cargo">
          <FieldGroup columns={3}>
            <Controller
              control={control}
              name="cargo_type"
              render={({ field }) => (
                <Combobox
                  label="Cargo type"
                  options={CARGO_TYPES.map((c) => ({ value: c, label: c }))}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  error={errors.cargo_type?.message}
                  placeholder="Search cargo types"
                />
              )}
            />
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
              suffix="kg"
              error={errors.weight?.message}
              {...register('weight')}
            />
          </FieldGroup>
        </Section>

        <Section title="Route">
          <FieldGroup>
            <Controller
              control={control}
              name="origin"
              render={({ field }) => (
                <Combobox
                  label="Origin"
                  options={countryOptions.filter((c) => c.value !== destination)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Search countries"
                  emptyMessage="No matching country"
                  disabled={countriesLoading}
                  hint={countryNote}
                  error={errors.origin?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="destination"
              render={({ field }) => (
                <Combobox
                  label="Destination"
                  options={countryOptions.filter((c) => c.value !== origin)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Search countries"
                  emptyMessage="No matching country"
                  disabled={countriesLoading}
                  hint={countryNote}
                  error={errors.destination?.message}
                />
              )}
            />
          </FieldGroup>
        </Section>

        {/* Directly after the route, because the origin is what decides it. */}
        <Section title="Warehouse">
          <FieldGroup>
            <WarehouseField
              assignment={warehouse}
              origin={origin}
              value={warehouseId ?? ''}
              onChange={assignWarehouse}
              error={errors.warehouse_id?.message}
              legacyLabel={shipment?.warehouse_id ? null : shipment?.warehouse}
            />
          </FieldGroup>
        </Section>

        <Section title="Shipping">
          <FieldGroup>
            <Select
              label="Shipping method"
              options={SHIPPING_METHODS.map((m) => ({ value: m, label: SHIPPING_METHOD_LABEL[m] }))}
              {...register('shipping_method')}
            />
            <Input label="Estimated delivery" type="date" {...register('estimated_delivery')} />
          </FieldGroup>
        </Section>

        <Section title="Status and location">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500">Status</span>
            <div className="flex min-h-10 items-center rounded-deck-sm border border-deck-150 bg-deck-50 px-3">
              <StatusBadge status={isEdit ? shipment!.status : INITIAL_STATUS} />
            </div>
            <p className="text-[12px] text-deck-500">
              {isEdit
                ? 'Status changes through tracking events.'
                : 'New shipments start as Received. Status changes through tracking events.'}
            </p>
          </div>
          <FieldGroup>
            <ReadOnlyValue
              label="Current location"
              value={shipment?.current_location ?? 'Not set yet'}
              hint="Updated automatically by tracking events."
            />
          </FieldGroup>
        </Section>

        <Section title="Booking information" description="Printed on the waybill label and the invoice.">
          <FieldGroup>
            {linkedCustomer ? (
              <ReadOnlyValue
                label="Booking contact"
                value={contactFromCustomer(linkedCustomer) || 'No contact on file'}
                hint="Filled automatically from the linked customer."
              />
            ) : (
              <Input
                label="Booking contact"
                placeholder="Contact person and phone"
                hint="Filled automatically when a customer is linked."
                {...register('booking_contact')}
              />
            )}
          </FieldGroup>
          <FieldGroup>
            <BranchCodeField branch={branch} branchName={warehouse.selected?.name} origin={origin} />
            <Input label="Flight number" placeholder="F77" {...register('flight_number')} />
          </FieldGroup>
        </Section>

        <Section title="Pricing">
          <div className="rounded-deck-sm border border-deck-150 bg-deck-50 p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
              <Input
                label="Price per kg (USD)"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                error={errors.price_per_kg?.message}
                {...register('price_per_kg')}
              />
              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500">Total charge</span>
                <div
                  aria-live="polite"
                  className="flex h-10 items-center rounded-deck-sm border border-deck-150 bg-panel px-3 font-mono text-lg font-bold tabular-nums text-deck-900"
                >
                  {total === null ? '—' : formatCurrency(total, 2)}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[12px] text-deck-500">
              Weight x price per kg, calculated automatically. It cannot be edited by hand.
            </p>
          </div>
        </Section>
      </form>
    </Modal>
  )
}
