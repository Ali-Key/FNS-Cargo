import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { recordPayment } from '@/services/financeService'
import type { Invoice, PaymentMethod } from '@/types'
import { RECORDABLE_PAYMENT_METHODS } from '@/types'
import { formatCurrency } from '@/utils/format'

type PayableInvoice = Pick<Invoice, 'id' | 'invoice_number' | 'amount' | 'amount_paid' | 'balance'>

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

interface RecordPaymentModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice: PayableInvoice | null
}

export function RecordPaymentModal({ open, onClose, onSaved, invoice }: RecordPaymentModalProps) {
  const toast = useToast()
  const { profile } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const balance = invoice?.balance ?? 0

  useEffect(() => {
    if (!open || !invoice) return
    reset({
      // Default to settling the invoice in full — the common case.
      amount: (balance > 0 ? balance : '') as unknown as number,
      method: '',
      reference: '',
      paid_at: new Date().toISOString().slice(0, 16),
      notes: '',
    })
  }, [open, invoice, balance, reset])

  async function onSubmit(values: FormValues) {
    if (!invoice) return
    const parsed = schema.parse(values)

    if (parsed.amount > balance) {
      setError('amount', { message: `Amount cannot exceed the balance of ${formatCurrency(balance, 2)}` })
      return
    }

    try {
      await recordPayment({
        invoice_id: invoice.id,
        amount: parsed.amount,
        method: parsed.method as PaymentMethod,
        reference: parsed.reference?.trim() || null,
        paid_at: new Date(parsed.paid_at).toISOString(),
        recorded_by: profile?.id ?? null,
        notes: parsed.notes?.trim() || null,
      })
      toast.success(
        'Payment recorded',
        `${formatCurrency(parsed.amount, 2)} applied to ${invoice.invoice_number}.`,
      )
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to record payment', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Record payment"
      description={invoice ? `Against ${invoice.invoice_number}` : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Record payment
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {invoice && (
          <div className="grid grid-cols-3 gap-3 rounded-deck-sm border border-deck-150 bg-deck-50 px-4 py-3 text-center">
            <div>
              <p className="text-xs font-medium text-deck-500">Invoiced</p>
              <p className="font-tabular text-sm font-bold text-deck-900">
                {formatCurrency(invoice.amount, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-deck-500">Paid</p>
              <p className="font-tabular text-sm font-bold text-status-delivered">
                {formatCurrency(invoice.amount_paid, 2)}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-deck-500">Balance</p>
              <p className="font-tabular text-sm font-bold text-deck-900">{formatCurrency(balance, 2)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0"
            max={balance > 0 ? balance : undefined}
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
