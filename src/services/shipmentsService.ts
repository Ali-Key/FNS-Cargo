import { supabase } from '@/lib/supabase'
import type {
  Profile,
  Shipment,
  ShipmentWithCustomer,
  ShipmentStatus,
  ShippingMethod,
  PaymentStatus,
  TablesInsert,
  TablesUpdate,
} from '@/types'
import { logActivity } from './activityService'
import { fetchAllRows } from '@/lib/exportBatch'

export interface ShipmentFilters {
  search?: string
  status?: ShipmentStatus | 'all'
  method?: ShippingMethod | 'all'
  payment?: PaymentStatus | 'all'
  /** Profile id of the assigned dispatcher, or 'unassigned'. */
  assignee?: string | 'all' | 'unassigned'
  /** Only shipments past their estimated delivery date and not yet delivered. */
  delayedOnly?: boolean
  /** Customer record the shipment is linked to. */
  customer?: string | 'all'
  /** Warehouse the cargo is held at. */
  warehouse?: string | 'all'
  /** Booked no earlier than this date (YYYY-MM-DD). */
  bookedFrom?: string
}

export interface ShipmentListParams extends ShipmentFilters {
  page: number
  pageSize: number
}

export interface ShipmentListResult {
  rows: ShipmentWithCustomer[]
  count: number
}

const LIST_SELECT =
  '*, customer:customers(id, full_name, email), assignee:profiles!shipments_assigned_to_fkey(id, full_name, avatar_url)'

function baseShipmentQuery() {
  return supabase.from('shipments').select(LIST_SELECT, { count: 'exact' }).order('created_at', { ascending: false })
}

/** Shared filter application so the paginated list and the export sweep never drift apart. */
function applyShipmentFilters(
  query: ReturnType<typeof baseShipmentQuery>,
  { search, status, method, payment, assignee, delayedOnly, customer, warehouse, bookedFrom }: ShipmentFilters,
) {
  let q = query
  if (status && status !== 'all') q = q.eq('status', status)
  if (method && method !== 'all') q = q.eq('shipping_method', method)
  if (payment && payment !== 'all') q = q.eq('payment_status', payment)
  if (customer && customer !== 'all') q = q.eq('customer_id', customer)
  if (warehouse && warehouse !== 'all') q = q.eq('warehouse', warehouse)
  if (bookedFrom) q = q.gte('created_at', bookedFrom)

  if (assignee === 'unassigned') q = q.is('assigned_to', null)
  else if (assignee && assignee !== 'all') q = q.eq('assigned_to', assignee)

  if (delayedOnly) {
    q = q.neq('status', 'Delivered').lt('estimated_delivery', new Date().toISOString().slice(0, 10))
  }

  if (search && search.trim()) {
    const term = search.trim().replace(/[%,]/g, '')
    q = q.or(
      [
        `tracking_number.ilike.%${term}%`,
        `customer_name.ilike.%${term}%`,
        `origin.ilike.%${term}%`,
        `destination.ilike.%${term}%`,
        `warehouse.ilike.%${term}%`,
        `current_location.ilike.%${term}%`,
      ].join(','),
    )
  }
  return q
}

export async function listShipments(params: ShipmentListParams): Promise<ShipmentListResult> {
  const { page, pageSize, ...filters } = params
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await applyShipmentFilters(baseShipmentQuery(), filters).range(from, to)
  if (error) throw error
  return { rows: (data as ShipmentWithCustomer[]) ?? [], count: count ?? 0 }
}

/** Every shipment matching the given filters, unpaginated — for the PDF shipment report. */
export async function listShipmentsForExport(filters: ShipmentFilters): Promise<ShipmentWithCustomer[]> {
  return fetchAllRows(async (from, to) => {
    const { data, error, count } = await applyShipmentFilters(baseShipmentQuery(), filters).range(from, to)
    if (error) throw error
    return { rows: (data as ShipmentWithCustomer[]) ?? [], count: count ?? 0 }
  })
}

/**
 * Values already in use across shipments, so the form's free-text fields can
 * offer the existing spellings instead of letting every operator invent one.
 * Read from `shipments` itself (there is no warehouse/branch lookup table), so
 * the suggestions can only ever be values that already match something.
 */
export interface ShipmentFieldSuggestions {
  warehouses: string[]
  branchCodes: string[]
  origins: string[]
  destinations: string[]
  /** Branch code on the newest shipment — the default a new booking inherits. */
  latestBranchCode: string | null
  /** One past the highest cargo number in use, padded to the house 7-digit format. */
  nextCnNumber: string | null
}

/** Cargo numbers are a plain 7-digit counter, printed on the waybill as "CN No". */
export const CN_NUMBER_LENGTH = 7

export async function listShipmentFieldSuggestions(): Promise<ShipmentFieldSuggestions> {
  const { data, error } = await supabase
    .from('shipments')
    .select('warehouse, branch_code, origin, destination, cn_number')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const collect = (key: 'warehouse' | 'branch_code' | 'origin' | 'destination') => {
    const seen = new Set<string>()
    for (const row of data ?? []) {
      const value = row[key]?.trim()
      if (value) seen.add(value)
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }

  // Rows arrive newest-first, so the first branch code seen is the current one.
  let latestBranchCode: string | null = null
  let highestCn = 0
  for (const row of data ?? []) {
    const branch = row.branch_code?.trim()
    if (branch && !latestBranchCode) latestBranchCode = branch.toUpperCase()
    const digits = row.cn_number?.replace(/\D/g, '')
    if (digits) highestCn = Math.max(highestCn, Number(digits))
  }

  return {
    warehouses: collect('warehouse'),
    branchCodes: collect('branch_code'),
    origins: collect('origin'),
    destinations: collect('destination'),
    latestBranchCode,
    nextCnNumber: highestCn ? String(highestCn + 1).padStart(CN_NUMBER_LENGTH, '0') : null,
  }
}

export async function getShipment(id: string): Promise<ShipmentWithCustomer | null> {
  const { data, error } = await supabase.from('shipments').select(LIST_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return (data as ShipmentWithCustomer) ?? null
}

/**
 * `total_price` is a generated column in Postgres (weight x price_per_kg) — never send it.
 * `payment_status` is derived from invoices and `delivered_at` is stamped by trigger,
 * so both are owned by the database too.
 */
export type ShipmentInput = Omit<
  TablesInsert<'shipments'>,
  'id' | 'created_at' | 'updated_at' | 'total_price' | 'payment_status' | 'delivered_at'
>

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
  payload: Omit<TablesUpdate<'shipments'>, 'total_price' | 'payment_status' | 'delivered_at'>,
): Promise<Shipment> {
  const { data, error } = await supabase
    .from('shipments')
    .update(payload)
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

/** Server-side next number in the sequence: FSN-<year>-000001, 000002, ... */
export async function suggestTrackingNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('suggest_tracking_number')
  if (error) throw error
  return (data as string) ?? ''
}

/**
 * Client-side continuation of the same sequence, used only when the RPC is
 * unreachable. It reads the highest number issued this year and adds one, so a
 * fallback number still looks like every other one; the unique index on
 * `tracking_number` remains the real guard against a collision.
 */
export async function nextTrackingNumberFallback(): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `FSN-${year}-`
  const { data, error } = await supabase
    .from('shipments')
    .select('tracking_number')
    .ilike('tracking_number', `${prefix}%`)
    .order('tracking_number', { ascending: false })
    .limit(1)
  if (error) throw error

  const latest = data?.[0]?.tracking_number ?? ''
  const seq = Number(latest.slice(prefix.length)) || 0
  return `${prefix}${String(seq + 1).padStart(6, '0')}`
}

// ---- Operations ------------------------------------------------------------

export type AssignableStaff = Pick<Profile, 'id' | 'full_name' | 'role' | 'avatar_url'>

/** Active dashboard accounts a shipment can be assigned to. */
export async function listAssignableStaff(): Promise<AssignableStaff[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, avatar_url')
    .eq('status', 'Active')
    .order('full_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Assign (or with null, unassign) the dispatcher responsible for a shipment. */
export async function assignShipment(id: string, profileId: string | null): Promise<void> {
  const { error } = await supabase.from('shipments').update({ assigned_to: profileId }).eq('id', id)
  if (error) throw error
  await logActivity('shipment.assigned', 'shipment', id, { assigned_to: profileId })
}

/** Every shipment for one customer, newest first (CRM profile panel). */
export async function listShipmentsForCustomer(customerId: string): Promise<ShipmentWithCustomer[]> {
  const { data, error } = await supabase
    .from('shipments')
    .select(LIST_SELECT)
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data as ShipmentWithCustomer[]) ?? []
}
