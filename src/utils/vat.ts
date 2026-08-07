/** Cents-rounded, mirroring the DB's `balance` generated column expression. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * The VAT rate actually applied to an invoice. Prefers the stored per-invoice
 * override (`vat_rate`); falls back to deriving it from the frozen `vat_amount`
 * for invoices raised before the override column existed, so the form and the
 * printed document never compute this differently.
 */
export function deriveVatRatePercent(amount: number, vatAmount: number, storedRate?: number | null): number {
  if (storedRate != null) return storedRate
  return amount > 0 ? round2((vatAmount / amount) * 100) : 0
}
