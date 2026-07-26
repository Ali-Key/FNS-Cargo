import { supabase } from '@/lib/supabase'
import type {
  Shipment,
  ShipmentWithCustomer,
  ShipmentStatus,
  ShippingMethod,
  TablesInsert,
  TablesUpdate,
} from '@/types'
import { logActivity } from './activityService'

export interface ShipmentListParams {
  page: number
  pageSize: number
  search?: string
  status?: ShipmentStatus | 'all'
  method?: ShippingMethod | 'all'
}

export interface ShipmentListResult {
  rows: ShipmentWithCustomer[]
  count: number
}

const LIST_SELECT = '*, customers(id, full_name)'

export async function listShipments(params: ShipmentListParams): Promise<ShipmentListResult> {
  const { page, pageSize, search, status, method } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase
    .from('shipments')
    .select(LIST_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (status && status !== 'all') query = query.eq('status', status)
  if (method && method !== 'all') query = query.eq('shipping_method', method)

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    query = query.or(
      [
        `tracking_number.ilike.%${term}%`,
        `sender_name.ilike.%${term}%`,
        `receiver_name.ilike.%${term}%`,
        `origin.ilike.%${term}%`,
        `destination.ilike.%${term}%`,
      ].join(','),
    )
  }

  const { data, error, count } = await query
  if (error) throw error
  return { rows: (data as ShipmentWithCustomer[]) ?? [], count: count ?? 0 }
}

export async function getShipment(id: string): Promise<ShipmentWithCustomer | null> {
  const { data, error } = await supabase.from('shipments').select(LIST_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as ShipmentWithCustomer) ?? null
}

export type ShipmentInput = Omit<TablesInsert<'shipments'>, 'id' | 'created_at' | 'updated_at'>

export async function createShipment(payload: ShipmentInput): Promise<Shipment> {
  const { data, error } = await supabase.from('shipments').insert(payload).select().single()
  if (error) throw error
  await logActivity('shipment.created', 'shipment', data.id, {
    tracking_number: data.tracking_number,
    status: data.status,
  })
  return data
}

export async function updateShipment(
  id: string,
  payload: TablesUpdate<'shipments'>,
): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logActivity('shipment.updated', 'shipment', id, { tracking_number: data.tracking_number })
  return data
}

export async function deleteShipment(id: string, trackingNumber: string): Promise<void> {
  const { error } = await supabase.from('shipments').delete().eq('id', id)
  if (error) throw error
  await logActivity('shipment.deleted', 'shipment', id, { tracking_number: trackingNumber })
}

/** True if a tracking number is already taken (optionally excluding one shipment id). */
export async function trackingNumberExists(trackingNumber: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('shipments').select('id').eq('tracking_number', trackingNumber).limit(1)
  if (excludeId) query = query.neq('id', excludeId)
  const { data, error } = await query
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Suggests the next tracking number in the FNS-YYYY-NNNNNN sequence for the current year. */
export async function suggestTrackingNumber(year: number): Promise<string> {
  const prefix = `FNS-${year}-`
  const { data, error } = await supabase
    .from('shipments')
    .select('tracking_number')
    .ilike('tracking_number', `${prefix}%`)
    .order('tracking_number', { ascending: false })
    .limit(1)
  if (error) throw error

  let next = 1
  const last = data?.[0]?.tracking_number
  if (last) {
    const seq = Number.parseInt(last.slice(prefix.length), 10)
    if (!Number.isNaN(seq)) next = seq + 1
  }
  return `${prefix}${String(next).padStart(6, '0')}`
}
