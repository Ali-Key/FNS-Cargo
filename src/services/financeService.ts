import { supabase } from '@/lib/supabase'
import type {
  Invoice,
  InvoiceDocumentData,
  InvoiceStatus,
  InvoiceWithRelations,
  Payment,
  PaymentMethod,
  PaymentLedgerRow,
  PaymentReceiptData,
  PaymentStatus,
  PaymentWithInvoice,
  TablesInsert,
  TablesUpdate,
} from '@/types'
import { logActivity } from './activityService'
import { getAdminSystemSettings } from './settingsService'
import { fetchAllRows } from '@/lib/exportBatch'
import { round2 } from '@/utils/vat'

// `balance` and `amount_paid` are derived in Postgres — amount_paid by the
// payments trigger, balance as a generated column. Sending either is either a
// hard error (balance) or silently overwritten (amount_paid), so both are Omit'd.
export type InvoiceInput = Omit<
  TablesInsert<'invoices'>,
  'id' | 'created_at' | 'updated_at' | 'balance' | 'amount_paid' | 'invoice_number'
>

export type InvoiceUpdate = Omit<
  TablesUpdate<'invoices'>,
  'id' | 'created_at' | 'updated_at' | 'balance' | 'amount_paid'
>

export type PaymentInput = Omit<TablesInsert<'payments'>, 'id' | 'created_at'>

/** A correction to a ledger entry. The invoice it settled cannot be reassigned. */
export type PaymentUpdate = Omit<TablesUpdate<'payments'>, 'id' | 'created_at' | 'invoice_id' | 'recorded_by'>

const INVOICE_SELECT =
  '*, shipment:shipments(id, tracking_number, origin, destination, status), customer:customers(id, full_name, email)'

export interface InvoiceListParams {
  page: number
  pageSize: number
  search?: string
  status?: InvoiceStatus | 'all'
  /** 'overdue' filters to unpaid invoices whose due date has passed. */
  view?: 'all' | 'outstanding' | 'overdue'
  /** Defaults to newest first; 'balance' surfaces the largest amounts owed first. */
  orderBy?: 'issued_at' | 'balance'
}

export interface InvoiceListResult {
  rows: InvoiceWithRelations[]
  count: number
}

function baseInvoiceQuery(orderBy: InvoiceListParams['orderBy']) {
  return supabase
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .order(orderBy === 'balance' ? 'balance' : 'issued_at', { ascending: false })
    .order('created_at', { ascending: false })
}

/** Shared filter application so the paginated list and the CSV export never drift apart. */
function applyInvoiceFilters(
  query: ReturnType<typeof baseInvoiceQuery>,
  { search, status, view }: Pick<InvoiceListParams, 'search' | 'status' | 'view'>,
) {
  let q = query
  if (status && status !== 'all') q = q.eq('status', status)

  if (view === 'outstanding') {
    q = q.gt('balance', 0).not('status', 'in', '("Void","Draft")')
  } else if (view === 'overdue') {
    q = q
      .gt('balance', 0)
      .not('status', 'in', '("Void","Draft")')
      .lt('due_date', new Date().toISOString().slice(0, 10))
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    q = q.or([`invoice_number.ilike.%${term}%`, `notes.ilike.%${term}%`].join(','))
  }
  return q
}

export async function listInvoices(params: InvoiceListParams): Promise<InvoiceListResult> {
  const { page, pageSize, orderBy, ...filters } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await applyInvoiceFilters(baseInvoiceQuery(orderBy), filters).range(from, to)
  if (error) throw error
  return { rows: (data as InvoiceWithRelations[]) ?? [], count: count ?? 0 }
}

/** Every invoice matching the given filters, unpaginated — for the CSV export. */
export async function listInvoicesForExport(
  filters: Pick<InvoiceListParams, 'search' | 'status' | 'view'>,
): Promise<InvoiceWithRelations[]> {
  return fetchAllRows(async (from, to) => {
    const { data, error, count } = await applyInvoiceFilters(baseInvoiceQuery(undefined), filters).range(from, to)
    if (error) throw error
    return { rows: (data as InvoiceWithRelations[]) ?? [], count: count ?? 0 }
  })
}

export async function getInvoice(id: string): Promise<InvoiceWithRelations | null> {
  const { data, error } = await supabase.from('invoices').select(INVOICE_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as InvoiceWithRelations) ?? null
}

// Fuller select than INVOICE_SELECT — the invoice PDF/preview needs cargo/pricing fields
// and customer phone/company/address that the list view has no use for.
const INVOICE_DOCUMENT_SELECT =
  '*, shipment:shipments(id, tracking_number, origin, destination, status, shipping_method, cargo_type, weight, price_per_kg, total_price, pieces, booking_contact, flight_number, created_at), customer:customers(id, full_name, email, phone, company, address), issuer:profiles!invoices_issued_by_fkey(full_name)'

/** Every field the invoice document (PDF/preview/email) needs, in one query. */
export async function getInvoiceForDocument(id: string): Promise<InvoiceDocumentData | null> {
  const { data, error } = await supabase.from('invoices').select(INVOICE_DOCUMENT_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as InvoiceDocumentData) ?? null
}

/** Everything a payment receipt needs: the payment plus its invoice, customer, and shipment. */
export async function getPaymentForReceipt(paymentId: string): Promise<PaymentReceiptData | null> {
  const { data, error } = await supabase
    .from('payments')
    .select(
      '*, invoice:invoices(id, invoice_number, customer:customers(full_name, email, phone), shipment:shipments(tracking_number))',
    )
    .eq('id', paymentId)
    .maybeSingle()
  if (error) throw error
  return (data as PaymentReceiptData) ?? null
}

/** Every invoice raised against one shipment, newest first. */
export async function listInvoicesForShipment(shipmentId: string): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createInvoice(payload: InvoiceInput): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').insert(payload).select().single()
  if (error) throw error
  await logActivity('invoice.created', 'invoice', data.id, {
    invoice_number: data.invoice_number,
    amount: data.amount,
  })
  return data
}

export async function updateInvoice(id: string, payload: InvoiceUpdate): Promise<Invoice> {
  const { data, error } = await supabase.from('invoices').update(payload).eq('id', id).select().single()
  if (error) throw error
  await logActivity('invoice.updated', 'invoice', id, { invoice_number: data.invoice_number })
  return data
}

export async function deleteInvoice(id: string, invoiceNumber: string): Promise<void> {
  const { error } = await supabase.from('invoices').delete().eq('id', id)
  if (error) throw error
  await logActivity('invoice.deleted', 'invoice', id, { invoice_number: invoiceNumber })
}

// ---- Receiver signature -----------------------------------------------------

const SIGNATURE_BUCKET = 'signature-proofs'

/**
 * Uploads a captured receiver signature (PNG) and stamps the invoice as signed.
 * The bucket is private, so what is persisted is the object path, not a URL —
 * read it back through `getReceiverSignatureUrl`, mirroring shipmentsService's
 * delivery-proof pattern.
 */
export async function uploadReceiverSignature(invoiceId: string, signature: Blob): Promise<string> {
  const path = `${invoiceId}/${crypto.randomUUID()}.png`

  const { error: uploadError } = await supabase.storage
    .from(SIGNATURE_BUCKET)
    .upload(path, signature, { cacheControl: '3600', upsert: false, contentType: 'image/png' })
  if (uploadError) throw uploadError

  const { error } = await supabase
    .from('invoices')
    .update({ receiver_signature_path: path, receiver_signed_at: new Date().toISOString() })
    .eq('id', invoiceId)
  if (error) throw error

  await logActivity('invoice.signed', 'invoice', invoiceId, { path })
  return path
}

/** Short-lived signed URL for a stored receiver signature. Null when not yet signed. */
export async function getReceiverSignatureUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(SIGNATURE_BUCKET).createSignedUrl(path, 300)
  if (error) throw error
  return data?.signedUrl ?? null
}

// ---- Payments --------------------------------------------------------------

export async function listPaymentsForInvoice(invoiceId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Recent payments across every invoice — the finance activity ledger. */
export async function listRecentPayments(limit = 12): Promise<PaymentWithInvoice[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(id, invoice_number, shipment_id)')
    .order('paid_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as PaymentWithInvoice[]) ?? []
}

export async function recordPayment(payload: PaymentInput): Promise<Payment> {
  const { data, error } = await supabase.from('payments').insert(payload).select().single()
  if (error) throw error
  await logActivity('payment.recorded', 'invoice', data.invoice_id, {
    amount: data.amount,
    method: data.method,
  })
  return data
}

/**
 * Corrects a ledger entry. `sync_invoice_totals()` recomputes the invoice's
 * `amount_paid`/`status` and the shipment's `payment_status` from the new row,
 * and `prevent_payment_overpayment` rejects an amount that would take the
 * invoice past its total — so neither is calculated here.
 */
export async function updatePayment(id: string, invoiceId: string, payload: PaymentUpdate): Promise<Payment> {
  const { data, error } = await supabase.from('payments').update(payload).eq('id', id).select().single()
  if (error) throw error
  await logActivity('payment.updated', 'invoice', invoiceId, {
    amount: data.amount,
    method: data.method,
  })
  return data
}

export async function deletePayment(id: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('id', id)
  if (error) throw error
  await logActivity('payment.deleted', 'invoice', invoiceId, {})
}

/** Payment history for a customer, newest first (CRM profile panel). */
export async function listCustomerInvoices(customerId: string): Promise<InvoiceWithRelations[]> {
  const { data, error } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('customer_id', customerId)
    .order('issued_at', { ascending: false })
  if (error) throw error
  return (data as InvoiceWithRelations[]) ?? []
}

/**
 * Every payment a customer has made, newest first — the Payment History panel
 * on the customer profile. Filtered through the customer's invoices, since a
 * payment only knows the invoice it settled.
 */
export async function listCustomerPayments(customerId: string): Promise<PaymentWithInvoice[]> {
  const { data: invoiceRows, error: invoiceError } = await supabase
    .from('invoices')
    .select('id')
    .eq('customer_id', customerId)
  if (invoiceError) throw invoiceError

  const ids = (invoiceRows ?? []).map((row) => row.id)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(id, invoice_number, shipment_id)')
    .in('invoice_id', ids)
    .order('paid_at', { ascending: false })
  if (error) throw error
  return (data as PaymentWithInvoice[]) ?? []
}

export interface PaymentListParams {
  page: number
  pageSize: number
  search?: string
  method?: PaymentMethod | 'all'
}

export interface PaymentListResult {
  rows: PaymentLedgerRow[]
  count: number
}

// The ledger names the shipment and the customer the money was for, and who
// took it. The invoice row is traversed only because `payments` has no
// `shipment_id` — no billing figure is read from it.
const PAYMENT_LEDGER_SELECT =
  '*, invoice:invoices(id, shipment_id, shipment:shipments(id, tracking_number, customer_name)), recorder:profiles!payments_recorded_by_fkey(full_name)'

function basePaymentQuery() {
  return supabase
    .from('payments')
    .select(PAYMENT_LEDGER_SELECT, { count: 'exact' })
    .order('paid_at', { ascending: false })
}

/** The `.or()` clause and method filter a ledger search resolves to. */
interface PaymentFilterClauses {
  method?: PaymentMethod
  or?: string
}

/**
 * In-flight lookups per search term. The Payments page resolves the same term
 * twice in the same tick (once for the list, once for the totals), so sharing
 * the pending request collapses that into one round trip. The entry is dropped
 * the moment it settles, so nothing is ever served from a stale cache.
 */
const pendingInvoiceIdLookups = new Map<string, Promise<string[]>>()

/**
 * Invoice ids whose shipment matches a tracking number or customer name.
 * A payment stores only `invoice_id`, so searching the ledger by shipment has
 * to resolve through invoices first; the cap keeps the `in.()` list bounded.
 */
function invoiceIdsMatchingShipment(term: string): Promise<string[]> {
  const pending = pendingInvoiceIdLookups.get(term)
  if (pending) return pending

  const lookup = (async () => {
    const { data, error } = await supabase
      .from('invoices')
      .select('id, shipment:shipments!inner(id)')
      .or([`tracking_number.ilike.%${term}%`, `customer_name.ilike.%${term}%`].join(','), {
        referencedTable: 'shipment',
      })
      .limit(500)
    if (error) throw error
    return (data ?? []).map((row) => row.id)
  })().finally(() => {
    pendingInvoiceIdLookups.delete(term)
  })

  pendingInvoiceIdLookups.set(term, lookup)
  return lookup
}

/** Shared filter resolution so the list, the totals and the CSV export never drift apart. */
async function paymentFilterClauses({
  search,
  method,
}: Pick<PaymentListParams, 'search' | 'method'>): Promise<PaymentFilterClauses> {
  const clauses: PaymentFilterClauses = {}
  if (method && method !== 'all') clauses.method = method

  const term = search?.trim().replace(/[%,()"]/g, '')
  if (term) {
    const invoiceIds = await invoiceIdsMatchingShipment(term)
    const or = [`reference.ilike.%${term}%`]
    if (invoiceIds.length > 0) or.push(`invoice_id.in.(${invoiceIds.join(',')})`)
    clauses.or = or.join(',')
  }
  return clauses
}

function applyPaymentClauses(query: ReturnType<typeof basePaymentQuery>, clauses: PaymentFilterClauses) {
  let q = query
  if (clauses.method) q = q.eq('method', clauses.method)
  if (clauses.or) q = q.or(clauses.or)
  return q
}

/** Paginated/searchable payments list — the Payments page's primary query. */
export async function listPayments(params: PaymentListParams): Promise<PaymentListResult> {
  const { page, pageSize, ...filters } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const clauses = await paymentFilterClauses(filters)
  const { data, error, count } = await applyPaymentClauses(basePaymentQuery(), clauses).range(from, to)
  if (error) throw error
  return { rows: (data as unknown as PaymentLedgerRow[]) ?? [], count: count ?? 0 }
}

/** Every payment matching the given filters, unpaginated — for the CSV export. */
export async function listPaymentsForExport(
  filters: Pick<PaymentListParams, 'search' | 'method'>,
): Promise<PaymentLedgerRow[]> {
  const clauses = await paymentFilterClauses(filters)
  return fetchAllRows(async (from, to) => {
    const { data, error, count } = await applyPaymentClauses(basePaymentQuery(), clauses).range(from, to)
    if (error) throw error
    return { rows: (data as unknown as PaymentLedgerRow[]) ?? [], count: count ?? 0 }
  })
}

export interface PaymentTotals {
  /** Sum of every payment matching the filters — the whole ledger when none are set. */
  collected: number
  /** The part of that which was taken in the current calendar month. */
  collectedThisMonth: number
  count: number
  /**
   * Mean payment. An empty ledger averages 0, not "unknown": nothing was
   * collected, which is a reading, and the page prints it as $0.00.
   */
  average: number
}

/**
 * What the ledger adds up to under the current filters. Read straight from
 * `payments` — the ledger of record — never from invoice totals.
 *
 * Every row here is money already taken: the table carries no pending/failed/
 * refunded state, a CHECK keeps `amount` above zero, and a reversal is a delete
 * rather than a status flip. So the whole result set is the set of collected
 * payments, and the mean is the sum over that count — computed here, once, so
 * the ledger and its average can never be derived from different row sets.
 *
 * Both the all-time and this-month sums come off the same fetched rows: two
 * figures cut from one row set can never disagree the way two queries can.
 */
export async function getPaymentTotals(
  filters: Pick<PaymentListParams, 'search' | 'method'>,
): Promise<PaymentTotals> {
  const clauses = await paymentFilterClauses(filters)
  const rows = await fetchAllRows<{ amount: number | null; paid_at: string | null }>(async (from, to) => {
    let q = supabase.from('payments').select('amount, paid_at', { count: 'exact' })
    if (clauses.method) q = q.eq('method', clauses.method)
    if (clauses.or) q = q.or(clauses.or)
    const { data, error, count } = await q.range(from, to)
    // Surfaced, not swallowed: a totals failure has to reach the page as an
    // error rather than as a plausible-looking zero.
    if (error) {
      console.error('[finance] payment totals query failed', error)
      throw error
    }
    return { rows: (data as { amount: number | null; paid_at: string | null }[]) ?? [], count: count ?? 0 }
  })

  // A row whose amount is null or unparseable is not a payment of nothing — it
  // is a row that cannot be counted as money, so it is left out of both sides of
  // the division instead of dragging the mean toward zero.
  const valid = rows
    .map((row) => ({ amount: Number(row.amount), paid_at: row.paid_at }))
    .filter((row) => Number.isFinite(row.amount) && row.amount > 0)

  // Month boundary taken on the reader's clock, so "this month" means the month
  // the person looking at the page is in.
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

  const collected = round2(valid.reduce((sum, row) => sum + row.amount, 0))
  const collectedThisMonth = round2(
    valid.reduce((sum, row) => {
      const at = row.paid_at ? new Date(row.paid_at).getTime() : NaN
      return Number.isFinite(at) && at >= monthStart ? sum + row.amount : sum
    }, 0),
  )

  return {
    collected,
    collectedThisMonth,
    count: valid.length,
    average: valid.length > 0 ? round2(collected / valid.length) : 0,
  }
}

/**
 * What the book is still owed: the balance left on every invoice that is
 * actually a debt. Void and Draft invoices are not owed and are excluded — the
 * same rule `dashboard_stats()` applies, so the Payments page and the Overview
 * can never quote two different outstanding figures.
 *
 * `balance` is a generated column (amount − amount_paid, kept current by the
 * payments trigger), so this is read, never recomputed here.
 */
export async function getOutstandingTotal(): Promise<number> {
  const rows = await fetchAllRows<{ balance: number | null }>(async (from, to) => {
    const { data, error, count } = await supabase
      .from('invoices')
      .select('balance', { count: 'exact' })
      .not('status', 'in', '("Void","Draft")')
      .range(from, to)
    // A failure here has to reach the page as a failure; an unread book is not
    // a book with nothing owed on it.
    if (error) {
      console.error('[finance] outstanding balance query failed', error)
      throw error
    }
    return { rows: (data as { balance: number | null }[]) ?? [], count: count ?? 0 }
  })

  // A settled invoice carries a balance of 0 and belongs in the sum as 0.
  // Negative balances (an overpayment) are left in too: the book owes that back.
  return round2(
    rows.reduce((sum, row) => {
      const balance = Number(row.balance)
      return Number.isFinite(balance) ? sum + balance : sum
    }, 0),
  )
}

export interface SendInvoiceEmailInput {
  invoiceId: string
  invoiceNumber: string
  to: string
  subject: string
  message: string
  pdfBase64: string
  filename: string
  /** Customer replies land here — the company's own inbox, not the (unverified) send domain. */
  replyTo?: string | null
}

/** Emails the invoice PDF to a customer via the send-invoice-email edge function (admin-gated). */
export async function sendInvoiceEmail(input: SendInvoiceEmailInput): Promise<void> {
  const { invoiceId, invoiceNumber, ...body } = input
  const { error } = await supabase.functions.invoke('send-invoice-email', { body })
  if (error) {
    let message = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const errBody = await ctx.json()
        if (errBody?.error) message = errBody.error
      }
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  await logActivity('invoice.emailed', 'invoice', invoiceId, { invoice_number: invoiceNumber, to: body.to })
}

// ---- Counter payment flow ---------------------------------------------------
// The counter takes money against a *shipment*, not against an invoice number
// nobody at the desk knows. These three functions back that flow: find the
// shipment, read what it owes, and raise the invoice silently if it has none.

/** A shipment the counter can take money for, with what it currently owes. */
export interface PayableShipment {
  id: string
  tracking_number: string
  customer_name: string
  customer_id: string | null
  total_price: number | null
  payment_status: PaymentStatus
}

/**
 * Shipments that still owe money, newest first — the Record Payment picker.
 * Fully-paid shipments are excluded so the list only ever shows work to do;
 * `search` matches tracking number or customer name.
 */
export async function listPayableShipments(search?: string, limit = 20): Promise<PayableShipment[]> {
  let query = supabase
    .from('shipments')
    .select('id, tracking_number, customer_name, customer_id, total_price, payment_status')
    .in('payment_status', ['Unpaid', 'Partially Paid'])
    .order('created_at', { ascending: false })
    .limit(limit)

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or([`tracking_number.ilike.%${term}%`, `customer_name.ilike.%${term}%`].join(','))
  }

  const { data, error } = await query
  if (error) throw error
  return (data as PayableShipment[]) ?? []
}

/** One shipment in payable shape, for opening the till against a known row. */
export async function getPayableShipment(shipmentId: string): Promise<PayableShipment | null> {
  const { data, error } = await supabase
    .from('shipments')
    .select('id, tracking_number, customer_name, customer_id, total_price, payment_status')
    .eq('id', shipmentId)
    .maybeSingle()
  if (error) throw error
  return (data as PayableShipment) ?? null
}

/** What one shipment has been billed, has paid, and still owes. */
export interface ShipmentBilling {
  /** Non-void invoices raised against the shipment, newest first. */
  invoices: Invoice[]
  /** The invoice a new payment should land on — the oldest one still owing. */
  payable: Invoice | null
  charged: number
  paid: number
  outstanding: number
}

/**
 * Billing position of a shipment, rolled up from its invoices. Void invoices are
 * excluded, mirroring sync_shipment_payment_status() so this never disagrees
 * with the payment badge the shipment already shows.
 */
export async function getShipmentBilling(shipmentId: string): Promise<ShipmentBilling> {
  const all = await listInvoicesForShipment(shipmentId)
  const invoices = all.filter((inv) => inv.status !== 'Void')

  const charged = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paid = invoices.reduce((sum, inv) => sum + inv.amount_paid, 0)

  // Oldest invoice with a balance: money received settles the longest-standing
  // debt first, which is what a paper ledger would do.
  const payable =
    [...invoices].reverse().find((inv) => (inv.balance ?? inv.amount - inv.amount_paid) > 0) ?? null

  return { invoices, payable, charged, paid, outstanding: round2(charged - paid) }
}

/**
 * The invoice a counter payment should be applied to, raising one silently when
 * the shipment has never been billed. Staff record money received; deciding
 * whether an invoice exists is not their job (see the Record Payment flow).
 */
export async function ensureInvoiceForShipment(
  shipment: Pick<PayableShipment, 'id' | 'customer_id' | 'total_price'>,
  issuedBy: string | null,
  /** VAT rate and discount taken at the counter; both fall back to the Settings rate / no discount. */
  terms?: { vat_rate?: number | null; discount?: number | null },
): Promise<{ invoice: Invoice; created: boolean; billing: ShipmentBilling }> {
  const billing = await getShipmentBilling(shipment.id)
  if (billing.payable) return { invoice: billing.payable, created: false, billing }

  const charge = round2(shipment.total_price ?? 0)
  if (charge <= 0) {
    throw new Error('This shipment has no charge yet. Add a weight and price per kg before taking payment.')
  }

  const settings = terms?.vat_rate == null ? await getAdminSystemSettings().catch(() => null) : null
  const vatRate = terms?.vat_rate ?? settings?.vat_rate ?? 0
  const vatAmount = round2((charge * vatRate) / 100)
  const discount = round2(terms?.discount ?? 0)

  const invoice = await createInvoice({
    shipment_id: shipment.id,
    customer_id: shipment.customer_id,
    // Net payable total — see InvoiceMoney in utils/vat.
    amount: round2(charge + vatAmount - discount),
    vat_amount: vatAmount,
    vat_rate: vatRate,
    discount,
    status: 'Issued',
    issued_at: new Date().toISOString().slice(0, 10),
    due_date: null,
    notes: null,
    issued_by: issuedBy,
  })

  return { invoice, created: true, billing: await getShipmentBilling(shipment.id) }
}
