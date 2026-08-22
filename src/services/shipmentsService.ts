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
 * Values already in use across shipments, so the form's remaining free-text
 * fields can offer the existing spellings instead of letting every operator
 * invent one.
 *
 * Branch codes are deliberately absent. They are not free text any more: a
 * shipment's branch is the warehouse handling it, the code belongs to that
 * warehouse, and offering the strings older bookings happen to carry would
 * only invite one to be typed over the assignment.
 */
export interface ShipmentFieldSuggestions {
  warehouses: string[]
  origins: string[]
  destinations: string[]
}

export async function listShipmentFieldSuggestions(): Promise<ShipmentFieldSuggestions> {
  const { data, error } = await supabase
    .from('shipments')
    .select('warehouse, origin, destination')
    .order('created_at', { ascending: false })
    .limit(1000)
  if (error) throw error

  const collect = (key: 'warehouse' | 'origin' | 'destination') => {
    const seen = new Set<string>()
    for (const row of data ?? []) {
      const value = row[key]?.trim()
      if (value) seen.add(value)
    }
    return [...seen].sort((a, b) => a.localeCompare(b))
  }

  return {
    warehouses: collect('warehouse'),
    origins: collect('origin'),
    destinations: collect('destination'),
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
 * so both are owned by the database too. `tracking_number` and `cn_number` are
 * issued by the assign_shipment_numbers() trigger, which is what makes them
 * unique under concurrent bookings — sending either would defeat that.
 * `warehouse` and `branch_code` are the two labels the branch link produces,
 * both stamped by sync_shipment_warehouse_link() from `warehouse_id` — sending
 * either could only contradict the relationship.
 */
export type ShipmentInput = Omit<
  TablesInsert<'shipments'>,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'total_price'
  | 'payment_status'
  | 'delivered_at'
  | 'tracking_number'
  | 'cn_number'
  | 'warehouse'
  | 'branch_code'
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
  payload: Omit<
    TablesUpdate<'shipments'>,
    'total_price' | 'payment_status' | 'delivered_at' | 'tracking_number' | 'cn_number'
  >,
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

/** The pair of numbers a new booking will be given: FSN-<year>-000001 / CN-<year>-000001. */
export interface ShipmentNumberPreview {
  trackingNumber: string
  cnNumber: string
}

/**
 * What the next booking will be numbered, so the form can show it before the
 * shipment exists. Only a preview: the numbers are claimed by the database when
 * the row is inserted, so an abandoned form burns none and two operators with
 * the form open still get different numbers.
 */
export async function previewShipmentNumbers(): Promise<ShipmentNumberPreview> {
  const { data, error } = await supabase.rpc('preview_shipment_numbers')
  if (error) throw error
  const numbers = (data ?? {}) as { tracking_number?: string; cn_number?: string }
  return {
    trackingNumber: numbers.tracking_number ?? '',
    cnNumber: numbers.cn_number ?? '',
  }
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
