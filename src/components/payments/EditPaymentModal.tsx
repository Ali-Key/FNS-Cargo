import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { updatePayment } from '@/services/financeService'
import type { PaymentLedgerRow, PaymentMethod } from '@/types'
import { RECORDABLE_PAYMENT_METHODS } from '@/types'
import { formatCurrency } from '@/utils/format'

const schema = z.object({
  amount: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter an amount' }).positive('Amount must be greater than 0'),
  ),
  method: z.string().min(1, 'Choose how the payment was received'),
  reference: z.string().optional(),
  paid_at: z.string().min(1, 'Choose a date'),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

interface EditPaymentModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  payment: PaymentLedgerRow | null
}

/** `datetime-local` wants local wall-clock time, not the stored UTC instant. */
function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

/**
 * Corrects an existing ledger entry. Which invoice the money settled is not
 * editable — that would move a payment between balances, which is a delete and
 * a re-record, not an edit.
 */
export function EditPaymentModal({ open, onClose, onSaved, payment }: EditPaymentModalProps) {
  const toast = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open || !payment) return
    reset({
      amount: payment.amount as unknown as number,
      method: payment.method ?? '',
      reference: payment.reference ?? '',
      paid_at: toLocalInput(payment.paid_at),
      notes: payment.notes ?? '',
    })
  }, [open, payment, reset])

  async function onSubmit(values: FormValues) {
    if (!payment) return
    const parsed = schema.parse(values)

    try {
      await updatePayment(payment.id, payment.invoice_id, {
        amount: parsed.amount,
        method: parsed.method as PaymentMethod,
        reference: parsed.reference?.trim() || null,
        paid_at: new Date(parsed.paid_at).toISOString(),
        notes: parsed.notes?.trim() || null,
      })
      toast.success('Payment updated', `The ledger entry is now ${formatCurrency(parsed.amount, 2)}.`)
      onSaved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again.'
      // The invoice balance is not on the ledger row, so overpayment is caught
      // by the `prevent_payment_overpayment` trigger rather than client-side.
      if (/overpay|exceed/i.test(message)) {
        setError('amount', { message: 'That amount would take the invoice past its total.' })
        return
      }
      toast.error('Unable to update payment', message)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Edit payment"
      description={
        payment?.invoice?.shipment?.tracking_number
          ? `Against ${payment.invoice.shipment.tracking_number}`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Alert variant="info">
          Changing the amount re-derives the invoice total and the shipment&apos;s payment status.
        </Alert>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            error={errors.amount?.message}
            {...register('amount')}
          />
          <Select
            label="Method"
            options={[
              { value: '', label: 'Select a method' },
              ...RECORDABLE_PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
            ]}
            error={errors.method?.message}
            {...register('method')}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Received"
            type="datetime-local"
            error={errors.paid_at?.message}
            {...register('paid_at')}
          />
          <Input label="Reference" placeholder="Transfer ref, receipt #" {...register('reference')} />
        </div>

        <Textarea label="Notes" rows={2} {...register('notes')} />
      </form>
    </Modal>
  )
}
