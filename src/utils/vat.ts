/** Cents-rounded, mirroring the DB's `balance` generated column expression. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * The money columns of an invoice. `amount` is the **net payable total** — what
 * the customer owes and what payments are capped against by
 * `prevent_payment_overpay()` — with `vat_amount` and `discount` kept alongside
 * it purely as the breakdown that produced it.
 */
export interface InvoiceMoney {
  amount: number
  vat_amount: number
  discount: number
  vat_rate?: number | null
}

/** The charge before VAT and discount, derived back out of the net total. */
export function invoiceSubtotal(invoice: InvoiceMoney): number {
  return round2(invoice.amount - invoice.vat_amount + invoice.discount)
}

/**
 * The VAT rate actually applied to an invoice. Prefers the stored per-invoice
 * override (`vat_rate`); falls back to deriving it from the frozen `vat_amount`
 * for invoices raised before the override column existed, so the form and the
 * printed document never compute this differently.
 */
export function deriveVatRatePercent(invoice: InvoiceMoney): number {
  if (invoice.vat_rate != null) return invoice.vat_rate
  const subtotal = invoiceSubtotal(invoice)
  return subtotal > 0 ? round2((invoice.vat_amount / subtotal) * 100) : 0
}
