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

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  const { page, pageSize, search } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('customers')
    .select(CUSTOMER_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or([`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`].join(','))
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data as Customer[]) ?? [], count: count ?? 0 }
}

/** Lightweight list for the shipment customer <select> (active customers only). */
export async function listCustomerOptions(): Promise<Pick<Customer, 'id' | 'full_name'>[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name')
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

/** Order count and lifetime value for one customer, for the CRM profile header. */
export interface CustomerSummary {
  shipments: number
  delivered: number
  lifetimeValue: number
}

export async function getCustomerSummary(customerId: string): Promise<CustomerSummary> {
  const { data, error } = await supabase
    .from('shipments')
    .select('status, total_price')
    .eq('customer_id', customerId)
  if (error) throw error

  const rows = data ?? []
  return {
    shipments: rows.length,
    delivered: rows.filter((r) => r.status === 'Delivered').length,
    lifetimeValue: rows.reduce((sum, r) => sum + (r.total_price ?? 0), 0),
  }
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
