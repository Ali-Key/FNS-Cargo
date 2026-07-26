import { supabase } from '@/lib/supabase'
import type { Customer, TablesInsert, TablesUpdate } from '@/types'
import { logActivity } from './activityService'

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
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or(
      [`full_name.ilike.%${term}%`, `email.ilike.%${term}%`, `phone.ilike.%${term}%`, `city.ilike.%${term}%`].join(
        ',',
      ),
    )
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: data ?? [], count: count ?? 0 }
}

/** Lightweight list for populating the shipment customer <select>. */
export async function listCustomerOptions(): Promise<Pick<Customer, 'id' | 'full_name'>[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name')
    .eq('is_active', true)
    .order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export type CustomerInput = Omit<TablesInsert<'customers'>, 'id' | 'created_at' | 'updated_at'>

export async function createCustomer(payload: CustomerInput): Promise<Customer> {
  const { data, error } = await supabase.from('customers').insert(payload).select().single()
  if (error) throw error
  await logActivity('customer.created', 'customer', data.id, { full_name: data.full_name })
  return data
}

export async function updateCustomer(id: string, payload: TablesUpdate<'customers'>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logActivity('customer.updated', 'customer', id, { full_name: data.full_name })
  return data
}

export async function deleteCustomer(id: string, fullName: string): Promise<void> {
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw error
  await logActivity('customer.deleted', 'customer', id, { full_name: fullName })
}
