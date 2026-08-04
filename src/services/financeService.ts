import { supabase } from '@/lib/supabase'
import type {
  Invoice,
  InvoiceDocumentData,
  InvoiceStatus,
  InvoiceWithRelations,
  Payment,
  PaymentMethod,
  PaymentReceiptData,
  PaymentWithInvoice,
  TablesInsert,
  TablesUpdate,
} from '@/types'
import { logActivity } from './activityService'
import { fetchAllRows } from '@/lib/exportBatch'

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

const INVOICE_SELECT =
  '*, shipment:shipments(id, tracking_number, origin, destination, status), customer:customers(id, full_name, email)'

export interface InvoiceListParams {
  page: number
  pageSize: number
  search?: string
  status?: InvoiceStatus | 'all'
  /** 'overdue' filters to unpaid invoices whose due date has passed. */
  view?: 'all' | 'outstanding' | 'overdue'
}

export interface InvoiceListResult {
  rows: InvoiceWithRelations[]
  count: number
}

export async function listInvoices(params: InvoiceListParams): Promise<InvoiceListResult> {
  const { page, pageSize, search, status, view } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('invoices')
    .select(INVOICE_SELECT, { count: 'exact' })
    .order('issued_at', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') query = query.eq('status', status)

  if (view === 'outstanding') {
    query = query.gt('balance', 0).not('status', 'in', '("Void","Draft")')
  } else if (view === 'overdue') {
    query = query
      .gt('balance', 0)
      .not('status', 'in', '("Void","Draft")')
      .lt('due_date', new Date().toISOString().slice(0, 10))
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or([`invoice_number.ilike.%${term}%`, `notes.ilike.%${term}%`].join(','))
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data as InvoiceWithRelations[]) ?? [], count: count ?? 0 }
}

/** Every invoice matching the given view, unpaginated — for the Outstanding Balance report. */
export async function listInvoicesForExport(view: NonNullable<InvoiceListParams['view']>): Promise<InvoiceWithRelations[]> {
  return fetchAllRows(async (from, to) => {
    let query = supabase
      .from('invoices')
      .select(INVOICE_SELECT, { count: 'exact' })
      .order('due_date', { ascending: true })
      .range(from, to)

    if (view === 'outstanding') {
      query = query.gt('balance', 0).not('status', 'in', '("Void","Draft")')
    } else if (view === 'overdue') {
      query = query
        .gt('balance', 0)
        .not('status', 'in', '("Void","Draft")')
        .lt('due_date', new Date().toISOString().slice(0, 10))
    }

    const { data, error, count } = await query
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
  '*, shipment:shipments(id, tracking_number, origin, destination, status, shipping_method, cargo_type, weight, price_per_kg, total_price), customer:customers(id, full_name, email, phone, company, address)'

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

export interface PaymentExportFilters {
  from?: string
  to?: string
  method?: PaymentMethod | 'all'
}

export interface PaymentListParams {
  page: number
  pageSize: number
  search?: string
  method?: PaymentMethod | 'all'
}

export interface PaymentListResult {
  rows: PaymentWithInvoice[]
  count: number
}

/** Paginated/searchable payments list — the Payments page's primary query. */
export async function listPayments(params: PaymentListParams): Promise<PaymentListResult> {
  const { page, pageSize, search, method } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('payments')
    .select('*, invoice:invoices(id, invoice_number, shipment_id)', { count: 'exact' })
    .order('paid_at', { ascending: false })
    .range(from, to)

  if (method && method !== 'all') query = query.eq('method', method)
  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or([`reference.ilike.%${term}%`, `notes.ilike.%${term}%`].join(','))
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data as PaymentWithInvoice[]) ?? [], count: count ?? 0 }
}

/** Every payment matching the given date/method filters, unpaginated — for the Excel export. */
export async function listPaymentsForExport(filters: PaymentExportFilters): Promise<PaymentWithInvoice[]> {
  return fetchAllRows(async (from, to) => {
    let query = supabase
      .from('payments')
      .select('*, invoice:invoices(id, invoice_number, shipment_id)', { count: 'exact' })
      .order('paid_at', { ascending: false })
      .range(from, to)

    if (filters.from) query = query.gte('paid_at', filters.from)
    if (filters.to) query = query.lte('paid_at', filters.to)
    if (filters.method && filters.method !== 'all') query = query.eq('method', filters.method)

    const { data, error, count } = await query
    if (error) throw error
    return { rows: (data as PaymentWithInvoice[]) ?? [], count: count ?? 0 }
  })
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
