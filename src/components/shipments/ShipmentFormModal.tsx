import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RefreshCw } from 'lucide-react'
import { Button, Combobox, Input, Select, Modal, FieldGroup, StatusBadge } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import {
  createShipment,
  updateShipment,
  suggestTrackingNumber,
  nextTrackingNumberFallback,
  listShipmentFieldSuggestions,
  type ShipmentFieldSuggestions,
} from '@/services/shipmentsService'
import type { CustomerOption } from '@/services/customersService'
import type { ShipmentWithCustomer, ShippingMethod, CargoType, ShipmentStatus } from '@/types'
import { SHIPPING_METHODS, CARGO_TYPES } from '@/types'
import { SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatCurrency } from '@/utils/format'

/** Every shipment enters the pipeline here; later stages come from tracking events. */
const INITIAL_STATUS: ShipmentStatus = 'Received'

/** The countries FSN Cargo moves freight between. Either end of a route can be any of them. */
const ROUTE_COUNTRIES = ['Somalia', 'China', 'Turkey', 'Sweden', 'Finland', 'Norway', 'Denmark'] as const
const COUNTRY_OPTIONS = ROUTE_COUNTRIES.map((c) => ({ value: c, label: c }))
const isRouteCountry = (value: string | null | undefined): boolean =>
  ROUTE_COUNTRIES.includes((value ?? '') as (typeof ROUTE_COUNTRIES)[number])

const schema = z
  .object({
    tracking_number: z.string().trim().min(6, 'Tracking number is too short'),
    customer_id: z.string().optional(),
    customer_name: z.string().trim().optional(),
    origin: z.enum(ROUTE_COUNTRIES, { errorMap: () => ({ message: 'Select an origin country' }) }),
    destination: z.enum(ROUTE_COUNTRIES, { errorMap: () => ({ message: 'Select a destination country' }) }),
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
    warehouse: z.string().optional(),
    pieces: z.preprocess(
      (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
      z.number({ invalid_type_error: 'Enter the number of pieces' }).int().positive('Must be at least 1'),
    ),
    booking_contact: z.string().optional(),
    cn_number: z
      .string()
      .trim()
      .regex(/^\d{6,10}$/, 'Cargo number is 6 to 10 digits, no letters')
      .or(z.literal(''))
      .optional(),
    branch_code: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{2,4}\d{4}$/, 'Branch code looks like GZ2025 (2 to 4 letters + year)')
      .or(z.literal(''))
      .optional(),
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
  tracking_number: '',
  customer_id: '',
  customer_name: '',
  origin: '' as unknown as FormValues['origin'],
  destination: '' as unknown as FormValues['destination'],
  shipping_method: 'Air Freight',
  cargo_type: 'General Goods',
  weight: '' as unknown as number,
  price_per_kg: '' as unknown as number,
  estimated_delivery: '',
  warehouse: '',
  pieces: 1,
  booking_contact: '',
  cn_number: '',
  branch_code: '',
  flight_number: '',
}

const NO_SUGGESTIONS: ShipmentFieldSuggestions = {
  warehouses: [],
  branchCodes: [],
  origins: [],
  destinations: [],
  latestBranchCode: null,
  nextCnNumber: null,
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

const toOptions = (values: string[]) => values.map((v) => ({ value: v, label: v }))

export function ShipmentFormModal({ open, onClose, onSaved, shipment, customerOptions }: ShipmentFormModalProps) {
  const toast = useToast()
  const { profile } = useAuth()
  const isEdit = !!shipment
  const [suggestions, setSuggestions] = useState<ShipmentFieldSuggestions>(NO_SUGGESTIONS)
  const [generating, setGenerating] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const [watchedWeight, watchedRate, watchedCustomerId, origin, destination] = useWatch({
    control,
    name: ['weight', 'price_per_kg', 'customer_id', 'origin', 'destination'],
  })
  const total = calcTotal(watchedWeight, watchedRate)
  const linkedCustomer = customerOptions.find((c) => c.id === watchedCustomerId) ?? null

  /** Server sequence first; the local fallback continues the same series. */
  const generateTrackingNumber = useCallback(async (): Promise<string> => {
    try {
      const suggestion = await suggestTrackingNumber()
      if (suggestion) return suggestion
    } catch {
      // RPC unreachable — fall through to the client-side continuation.
    }
    return nextTrackingNumberFallback()
  }, [])

  useEffect(() => {
    if (!open) return
    if (shipment) {
      reset({
        tracking_number: shipment.tracking_number,
        customer_id: shipment.customer_id ?? '',
        customer_name: shipment.customer_name,
        origin: (isRouteCountry(shipment.origin) ? shipment.origin : '') as FormValues['origin'],
        destination: (isRouteCountry(shipment.destination) ? shipment.destination : '') as FormValues['destination'],
        shipping_method: shipment.shipping_method,
        cargo_type: shipment.cargo_type,
        weight: (shipment.weight ?? '') as unknown as number,
        price_per_kg: (shipment.price_per_kg ?? '') as unknown as number,
        estimated_delivery: shipment.estimated_delivery ? shipment.estimated_delivery.slice(0, 10) : '',
        warehouse: shipment.warehouse ?? '',
        pieces: shipment.pieces,
        booking_contact: shipment.booking_contact ?? '',
        cn_number: shipment.cn_number ?? '',
        branch_code: shipment.branch_code ?? '',
        flight_number: shipment.flight_number ?? '',
      })
    } else {
      reset(EMPTY)
    }
  }, [open, shipment, reset])

  // A new shipment gets its number before the operator sees the form; they can
  // still regenerate or overwrite it.
  useEffect(() => {
    if (!open || shipment) return
    let cancelled = false
    setGenerating(true)
    generateTrackingNumber()
      .then((number) => {
        if (!cancelled) setValue('tracking_number', number, { shouldValidate: true })
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setGenerating(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, shipment, setValue, generateTrackingNumber])

  // Reference lists are only needed while the dialog is open. A new booking also
  // inherits the next cargo number and the branch it is being booked at, both
  // still editable — an edit keeps whatever is already on the shipment.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    listShipmentFieldSuggestions()
      .then((next) => {
        if (cancelled) return
        setSuggestions(next)
        if (isEdit) return
        if (next.nextCnNumber) setValue('cn_number', next.nextCnNumber)
        if (next.latestBranchCode) setValue('branch_code', next.latestBranchCode)
      })
      .catch(() => {
        if (!cancelled) setSuggestions(NO_SUGGESTIONS)
      })
    return () => {
      cancelled = true
    }
  }, [open, isEdit, setValue])

  async function handleRegenerate() {
    setGenerating(true)
    try {
      setValue('tracking_number', await generateTrackingNumber(), { shouldValidate: true })
    } catch {
      toast.error('Could not generate a number', 'Enter one by hand or try again.')
    } finally {
      setGenerating(false)
    }
  }

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
    const linked = customerOptions.find((c) => c.id === parsed.customer_id)
    const payload = {
      tracking_number: parsed.tracking_number.toUpperCase(),
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
      warehouse: parsed.warehouse?.trim() || null,
      pieces: parsed.pieces,
      booking_contact: (linked ? contactFromCustomer(linked) : parsed.booking_contact?.trim()) || null,
      cn_number: parsed.cn_number?.trim() || null,
      branch_code: parsed.branch_code?.trim().toUpperCase() || null,
      flight_number: parsed.flight_number?.trim() || null,
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
          <div className="flex flex-col gap-1.5">
            <label htmlFor="tracking_number" className="text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500">
              Tracking number
            </label>
            <div className="flex gap-2">
              <Input
                id="tracking_number"
                className="font-mono"
                placeholder="FSN-2026-000001"
                containerClassName="flex-1"
                {...register('tracking_number')}
              />
              {!isEdit && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleRegenerate}
                  loading={generating}
                  icon={<RefreshCw className="h-4 w-4" />}
                >
                  Suggest
                </Button>
              )}
            </div>
            <p className="text-[12px] text-deck-500">
              {errors.tracking_number ? (
                <span className="font-medium text-status-delayed-ink">{errors.tracking_number.message}</span>
              ) : (
                'Automatically generated. Use a custom number only when matching a pre-printed waybill.'
              )}
            </p>
          </div>
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

        <Section title="Route and delivery">
          <FieldGroup>
            <Controller
              control={control}
              name="origin"
              render={({ field }) => (
                <Combobox
                  label="Origin"
                  options={COUNTRY_OPTIONS.filter((c) => c.value !== destination)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Search countries"
                  emptyMessage="No matching country"
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
                  options={COUNTRY_OPTIONS.filter((c) => c.value !== origin)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Search countries"
                  emptyMessage="No matching country"
                  error={errors.destination?.message}
                />
              )}
            />
          </FieldGroup>

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
            <Controller
              control={control}
              name="warehouse"
              render={({ field }) => (
                <Combobox
                  label="Warehouse"
                  allowCustom
                  options={toOptions(suggestions.warehouses)}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder="Guangzhou Hub"
                />
              )}
            />
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
            <Input
              label="Cargo number (CN)"
              className="font-mono"
              inputMode="numeric"
              maxLength={10}
              placeholder="1352503"
              hint="Numbered automatically; overwrite it to match the paper waybill."
              error={errors.cn_number?.message}
              {...register('cn_number')}
            />
          </FieldGroup>
          <FieldGroup>
            <Controller
              control={control}
              name="branch_code"
              render={({ field }) => (
                <Combobox
                  label="Branch code"
                  allowCustom
                  options={toOptions(suggestions.branchCodes)}
                  value={field.value ?? ''}
                  onChange={(value) => field.onChange(value.toUpperCase())}
                  placeholder="GZ2025"
                  error={errors.branch_code?.message}
                />
              )}
            />
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
