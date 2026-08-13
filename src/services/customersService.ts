import { supabase } from '@/lib/supabase'
import type { Customer, UserStatus } from '@/types'
import { logActivity } from './activityService'

// Customers live in their own table; `profiles` is dashboard accounts only.
const CUSTOMER_COLUMNS =
  'id, full_name, email, phone, company, address, notes, status, created_at, updated_at'

export interface CustomerListParams {
  page: number
  pageSize: number
  search?: string
}

export interface CustomerListResult {
  rows: Customer[]
  count: number
}

function baseCustomerQuery(search?: string) {
  let query = supabase.from('customers').select(CUSTOMER_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false })
  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or([`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`].join(','))
  }
  return query
}

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  const { page, pageSize, search } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await baseCustomerQuery(search).range(from, to)
  if (error) throw error
  return { rows: (data as Customer[]) ?? [], count: count ?? 0 }
}

/** One customer record, for the customer profile page. */
export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select(CUSTOMER_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as Customer) ?? null
}

export interface CustomerBalance {
  customer_id: string
  shipment_count: number
  /** Null for non-admin callers — the RPC withholds money figures from Staff/Dispatcher. */
  total_paid: number | null
  balance_owed: number | null
}

/**
 * Shipment count + payment totals for the given customers, via the RLS-aware
 * customer_balances_overview() RPC. Scoped to one page of ids at a time so the
 * paginated Customers list never scans every customer's shipments/invoices.
 */
export async function getCustomerBalances(customerIds: string[]): Promise<CustomerBalance[]> {
  if (customerIds.length === 0) return []
  const { data, error } = await supabase.rpc('customer_balances_overview', { p_customer_ids: customerIds })
  // supabase-js hands back a plain PostgrestError object here, not an Error
  // instance, so an `err instanceof Error` caller would lose the real message.
  if (error) throw new Error(error.message)
  return (data as CustomerBalance[]) ?? []
}

/**
 * Lightweight list for the shipment customer picker (active customers only).
 * Carries email/phone/company so the shipment form can fill the customer name
 * and booking contact from the selection instead of asking for them twice.
 */
export type CustomerOption = Pick<Customer, 'id' | 'full_name' | 'email' | 'phone' | 'company'>

export async function listCustomerOptions(): Promise<CustomerOption[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, email, phone, company')
    .eq('status', 'Active')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface CustomerInput {
  full_name: string
  email: string
  phone?: string | null
  company?: string | null
  address?: string | null
  /** Internal staff notes. Never rendered on the public site. */
  notes?: string | null
  status?: UserStatus
}

export async function createCustomer(payload: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert(payload)
    .select(CUSTOMER_COLUMNS)
    .single()
  if (error) throw error
  await logActivity('customer.created', 'customer', data.id, { full_name: data.full_name })
  return data as Customer
}

export async function updateCustomer(id: string, payload: Partial<CustomerInput>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update(payload)
    .eq('id', id)
    .select(CUSTOMER_COLUMNS)
    .single()
  if (error) throw error
  await logActivity('customer.updated', 'customer', id, { full_name: data.full_name })
  return data as Customer
}

export async function deleteCustomer(id: string, fullName: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
  await logActivity('customer.deleted', 'customer', id, { full_name: fullName })
}
