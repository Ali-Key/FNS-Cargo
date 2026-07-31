import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createInvoice, updateInvoice } from '@/services/financeService'
import { listShipments } from '@/services/shipmentsService'
import type { InvoiceStatus, InvoiceWithRelations, ShipmentWithCustomer } from '@/types'
import { formatCurrency } from '@/utils/format'

// Paid and Partially Paid are derived by the payments trigger from the ledger.
// Offering them here lets someone mark an invoice Paid with nothing collected,
// which leaves amount_paid at 0 and the shipment reading Unpaid.
const SELECTABLE_STATUSES: InvoiceStatus[] = ['Draft', 'Issued', 'Void']

const schema = z.object({
  shipment_id: z.string().min(1, 'Choose the shipment this invoice bills'),
  amount: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter an amount' }).nonnegative('Amount cannot be negative'),
  ),
  status: z.string().min(1),
  issued_at: z.string().min(1, 'Choose an issue date'),
  due_date: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

interface InvoiceFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice?: InvoiceWithRelations | null
  /** Pre-selects a shipment when raising an invoice from the shipment detail page. */
  presetShipment?: ShipmentWithCustomer | null
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const EMPTY: FormValues = {
  shipment_id: '',
  amount: '' as unknown as number,
  status: 'Issued',
  issued_at: today(),
  due_date: '',
  notes: '',
}

export function InvoiceFormModal({
  open,
  onClose,
  onSaved,
  invoice,
  presetShipment,
}: InvoiceFormModalProps) {
  const toast = useToast()
  const isEdit = !!invoice
  const [shipments, setShipments] = useState<ShipmentWithCustomer[]>([])

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const selectedShipmentId = watch('shipment_id')
  const selected = shipments.find((s) => s.id === selectedShipmentId) ?? presetShipment ?? null

  useEffect(() => {
    if (!open) return
    if (invoice) {
      reset({
        shipment_id: invoice.shipment_id,
        amount: invoice.amount as unknown as number,
        status: invoice.status,
        issued_at: invoice.issued_at.slice(0, 10),
        due_date: invoice.due_date ? invoice.due_date.slice(0, 10) : '',
        notes: invoice.notes ?? '',
      })
    } else {
      reset({
        ...EMPTY,
        shipment_id: presetShipment?.id ?? '',
        // Default the charge to what the shipment already prices out at.
        amount: (presetShipment?.total_price ?? '') as unknown as number,
      })
    }
  }, [open, invoice, presetShipment, reset])

  // A large page of recent shipments is enough to pick from; the picker is a
  // convenience, not a browser.
  useEffect(() => {
    if (!open || presetShipment) return
    listShipments({ page: 1, pageSize: 100 })
      .then((r) => setShipments(r.rows))
      .catch(() => setShipments([]))
  }, [open, presetShipment])

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values)
    const shipment = shipments.find((s) => s.id === parsed.shipment_id) ?? presetShipment ?? null

    const payload = {
      shipment_id: parsed.shipment_id,
      // customer_id is denormalised onto the invoice so a customer's billing
      // history survives the shipment being reassigned.
      customer_id: shipment?.customer_id ?? invoice?.customer_id ?? null,
      amount: parsed.amount,
      status: parsed.status as InvoiceStatus,
      issued_at: parsed.issued_at,
      due_date: parsed.due_date || null,
      notes: parsed.notes?.trim() || null,
    }

    try {
      if (isEdit && invoice) {
        await updateInvoice(invoice.id, payload)
        toast.success('Invoice updated', `${invoice.invoice_number} has been saved.`)
      } else {
        const created = await createInvoice(payload)
        toast.success('Invoice raised', `${created.invoice_number} is now on the ledger.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to save invoice', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  // Keep a trigger-derived status in the list when editing, otherwise saving an
  // already-Paid invoice would silently knock it back to Draft.
  const statusOptions = (
    invoice && !SELECTABLE_STATUSES.includes(invoice.status)
      ? [invoice.status, ...SELECTABLE_STATUSES]
      : SELECTABLE_STATUSES
  ).map((s) => ({ value: s, label: s }))

  const shipmentOptions = presetShipment
    ? [
        {
          value: presetShipment.id,
          label: `${presetShipment.tracking_number} — ${presetShipment.customer_name}`,
        },
      ]
    : [
        { value: '', label: 'Select a shipment' },
        ...shipments.map((s) => ({
          value: s.id,
          label: `${s.tracking_number} — ${s.customer_name}`,
        })),
      ]

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit invoice' : 'Raise invoice'}
      description={isEdit ? invoice?.invoice_number : 'Bill a shipment. Payments are recorded separately.'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Raise invoice'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Select
          label="Shipment"
          options={shipmentOptions}
          error={errors.shipment_id?.message}
          disabled={isEdit || !!presetShipment}
          {...register('shipment_id')}
        />

        {selected && (
          <div className="rounded-lg border border-steel-200 bg-steel-50 px-4 py-3 text-sm">
            <p className="text-steel-600">
              {selected.origin} → {selected.destination}
            </p>
            <p className="mt-1 text-xs text-steel-500">
              Shipment total {formatCurrency(selected.total_price, 2)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Select
            label="Status"
            options={statusOptions}
            hint="Paid and Partially Paid are set automatically from recorded payments."
            {...register('status')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Issued" type="date" error={errors.issued_at?.message} {...register('issued_at')} />
          <Input label="Due date" type="date" {...register('due_date')} />
        </div>

        <Textarea label="Notes" rows={3} placeholder="Payment terms, reference…" {...register('notes')} />
      </form>
    </Modal>
  )
}
