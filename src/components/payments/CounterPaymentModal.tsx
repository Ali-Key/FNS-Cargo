import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { Button, Input, Modal, Select, Spinner, Textarea } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { getAdminSystemSettings } from '@/services/settingsService'
import {
  ensureInvoiceForShipment,
  getShipmentBilling,
  listPayableShipments,
  recordPayment,
  type PayableShipment,
} from '@/services/financeService'
import { RECORDABLE_PAYMENT_METHODS } from '@/types'
import type { PaymentMethod } from '@/types'
import { formatCurrency } from '@/utils/format'
import { round2 } from '@/utils/vat'

interface CounterPaymentModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

const METHOD_OPTIONS = [
  { value: '', label: 'Select a method' },
  ...RECORDABLE_PAYMENT_METHODS.map((m) => ({ value: m, label: m })),
]

const EMPTY_FORM = {
  amount: '',
  vat_rate: '',
  discount: '',
  method: '' as PaymentMethod | '',
  reference: '',
  paid_at: '',
  notes: '',
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Takes money at the counter: pick the shipment the customer names, then record
 * what was received. The invoice the payment lands on is resolved (and raised if
 * the shipment has never been billed) by `ensureInvoiceForShipment`, so the
 * ledger never asks staff for an invoice number.
 */
export function CounterPaymentModal({ open, onClose, onSaved }: CounterPaymentModalProps) {
  const toast = useToast()
  const { profile } = useAuth()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)
  const [options, setOptions] = useState<PayableShipment[]>([])
  const [searching, setSearching] = useState(false)

  const [shipment, setShipment] = useState<PayableShipment | null>(null)
  const [outstanding, setOutstanding] = useState<number | null>(null)
  // An already-billed shipment has its VAT and discount frozen on the invoice;
  // they are only editable while the counter is about to raise the first one.
  const [billed, setBilled] = useState(false)
  const [defaultVatRate, setDefaultVatRate] = useState(0)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setSearch('')
    setOptions([])
    setShipment(null)
    setOutstanding(null)
    setBilled(false)
    setError(null)
    setForm({ ...EMPTY_FORM, paid_at: today() })
    getAdminSystemSettings()
      .then((settings) => setDefaultVatRate(settings?.vat_rate ?? 0))
      .catch(() => setDefaultVatRate(0))
  }, [open])

  useEffect(() => {
    if (!open || shipment) return
    let cancelled = false
    setSearching(true)
    listPayableShipments(debouncedSearch)
      .then((rows) => {
        if (!cancelled) setOptions(rows)
      })
      .catch(() => {
        if (!cancelled) setOptions([])
      })
      .finally(() => {
        if (!cancelled) setSearching(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, shipment, debouncedSearch])

  const charge = round2(shipment?.total_price ?? 0)
  const vatRateNum = Number(form.vat_rate) || 0
  const vatAmount = round2((charge * vatRateNum) / 100)
  const discountNum = Number(form.discount) || 0
  // Already billed: the invoice decides what is owed. Not billed yet: the counter
  // is raising it, so VAT and discount here are what the customer will be billed.
  const due = billed ? (outstanding ?? 0) : round2(charge + vatAmount - discountNum)

  function setTerms(patch: Partial<typeof EMPTY_FORM>) {
    setForm((f) => {
      const next = { ...f, ...patch }
      const nextVat = round2((charge * (Number(next.vat_rate) || 0)) / 100)
      const nextDue = round2(charge + nextVat - (Number(next.discount) || 0))
      return { ...next, amount: nextDue > 0 ? String(nextDue) : '' }
    })
  }

  async function selectShipment(next: PayableShipment) {
    setShipment(next)
    setError(null)
    const price = round2(next.total_price ?? 0)
    try {
      const billing = await getShipmentBilling(next.id)
      const hasInvoice = billing.invoices.length > 0
      setBilled(hasInvoice)
      if (hasInvoice) {
        setOutstanding(billing.outstanding)
        setForm((f) => ({
          ...f,
          vat_rate: '',
          discount: '',
          amount: billing.outstanding > 0 ? String(billing.outstanding) : '',
        }))
        return
      }
      // Never billed: the invoice this payment raises picks up the default rate.
      const owed = round2(price + round2((price * defaultVatRate) / 100))
      setOutstanding(owed)
      setForm((f) => ({
        ...f,
        vat_rate: String(defaultVatRate),
        discount: '',
        amount: owed > 0 ? String(owed) : '',
      }))
    } catch {
      setBilled(false)
      setOutstanding(price)
      setForm((f) => ({ ...f, vat_rate: String(defaultVatRate), discount: '', amount: price > 0 ? String(price) : '' }))
    }
  }

  async function submit() {
    if (!shipment) {
      setError('Choose the shipment this payment is for.')
      return
    }
    const amount = Number(form.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than 0.')
      return
    }
    if (!form.method) {
      setError('Choose how the payment was received.')
      return
    }
    if (!form.paid_at) {
      setError('Choose the date the payment was received.')
      return
    }
    if (!billed && discountNum > charge + vatAmount) {
      setError('Discount cannot be more than the shipment charge.')
      return
    }
    if (due > 0 && amount > due) {
      setError(`Amount cannot exceed the ${formatCurrency(due, 2)} owed on this shipment.`)
      return
    }

    setSaving(true)
    setError(null)
    try {
      const { invoice } = await ensureInvoiceForShipment(
        shipment,
        profile?.id ?? null,
        billed ? undefined : { vat_rate: vatRateNum, discount: discountNum },
      )
      await recordPayment({
        invoice_id: invoice.id,
        amount,
        method: form.method,
        reference: form.reference.trim() || null,
        paid_at: new Date(form.paid_at).toISOString(),
        recorded_by: profile?.id ?? null,
        notes: form.notes.trim() || null,
      })
      toast.success('Payment recorded', `${formatCurrency(amount, 2)} received for ${shipment.tracking_number}.`)
      onSaved()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again in a moment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Record payment"
      description="Record a payment received for a shipment."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          {shipment && (
            <Button variant="deck" onClick={() => void submit()} loading={saving}>
              Record payment
            </Button>
          )}
        </>
      }
    >
      {error && (
        <p className="mb-4 rounded-deck-sm border border-status-delayed/30 bg-status-delayed/10 px-3 py-2 text-[13px] text-status-delayed-ink">
          {error}
        </p>
      )}

      {!shipment ? (
        <div className="space-y-3">
          <Input
            label="Shipment"
            placeholder="Search tracking number or customer"
            icon={<Search className="h-4 w-4" aria-hidden="true" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <div className="max-h-72 divide-y divide-deck-100 overflow-y-auto rounded-deck-sm border border-deck-150">
            {searching && options.length === 0 && (
              <p className="flex items-center gap-2 px-3 py-4 text-[13px] text-deck-500">
                <Spinner className="h-4 w-4" /> Searching
              </p>
            )}
            {!searching && options.length === 0 && (
              <p className="px-3 py-4 text-[13px] text-deck-500">No shipments are waiting on payment.</p>
            )}
            {options.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => void selectShipment(option)}
                className="deck-focus flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-deck-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-mono text-[13px] text-deck-900">{option.tracking_number}</span>
                  <span className="block truncate text-[12px] text-deck-500">{option.customer_name}</span>
                </span>
                <span className="font-tabular shrink-0 text-[13px] font-semibold text-deck-700">
                  {formatCurrency(option.total_price, 2)}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Shipment, then what is still owed — the two facts that decide the amount. */}
          <div className="rounded-deck-sm border border-deck-150">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] text-deck-900">{shipment.tracking_number}</p>
                <p className="truncate text-[12px] text-deck-500">{shipment.customer_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShipment(null)} disabled={saving}>
                Change
              </Button>
            </div>
            {!billed && (
              <div className="space-y-1 border-t border-deck-100 px-4 py-3 text-[13px]">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-deck-500">Charge</span>
                  <span className="font-tabular text-deck-800">{formatCurrency(charge, 2)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-deck-500">VAT ({vatRateNum}%)</span>
                  <span className="font-tabular text-deck-800">{formatCurrency(vatAmount, 2)}</span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-deck-500">Discount</span>
                  <span className="font-tabular text-deck-800">-{formatCurrency(discountNum, 2)}</span>
                </div>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-3 border-t border-deck-100 bg-deck-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-deck-500">
                {billed ? 'Still owed' : 'Total due'}
              </p>
              <p className="font-tabular text-[22px] font-bold leading-none text-deck-900">
                {outstanding === null ? '—' : formatCurrency(due, 2)}
              </p>
            </div>
          </div>

          {!billed && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="VAT (%)"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                hint="Defaults to the rate in Settings."
                value={form.vat_rate}
                onChange={(e) => setTerms({ vat_rate: e.target.value })}
              />
              <Input
                label="Discount ($)"
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                placeholder="0.00"
                value={form.discount}
                onChange={(e) => setTerms({ discount: e.target.value })}
              />
            </div>
          )}

          <Input
            label="Amount ($)"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Method"
              options={METHOD_OPTIONS}
              value={form.method}
              onChange={(e) => setForm((f) => ({ ...f, method: e.target.value as PaymentMethod }))}
            />
            <Input
              label="Received"
              type="date"
              value={form.paid_at}
              onChange={(e) => setForm((f) => ({ ...f, paid_at: e.target.value }))}
            />
          </div>

          <Input
            label="Reference"
            placeholder="Transfer ref, receipt # (optional)"
            value={form.reference}
            onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
          />

          <Textarea
            label="Notes"
            rows={2}
            placeholder="Optional"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
      )}
    </Modal>
  )
}
