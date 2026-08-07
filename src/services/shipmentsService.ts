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
  { search, status, method, payment, assignee, delayedOnly }: ShipmentFilters,
) {
  let q = query
  if (status && status !== 'all') q = q.eq('status', status)
  if (method && method !== 'all') q = q.eq('shipping_method', method)
  if (payment && payment !== 'all') q = q.eq('payment_status', payment)

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

/** True if a tracking number is already taken (optionally excluding one shipment id). */
export async function trackingNumberExists(trackingNumber: string, excludeId?: string): Promise<boolean> {
  let query = supabase.from('shipments').select('id').ilike('tracking_number', trackingNumber).limit(1)
  if (excludeId) query = query.neq('id', excludeId)
  const { data, error } = await query
  if (error) throw error
  return (data?.length ?? 0) > 0
}

/** Server-side next tracking number in the FNS-... sequence for a country code. */
export async function suggestTrackingNumber(countryCode = 'CN'): Promise<string> {
  const { data, error } = await supabase.rpc('suggest_tracking_number', { p_country_code: countryCode })
  if (error) throw error
  return (data as string) ?? ''
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

const PROOF_BUCKET = 'delivery-proofs'

/**
 * Uploads a proof-of-delivery file and stores its object path on the shipment.
 * The bucket is private, so what is persisted is the path, not a URL — read it
 * back through `getDeliveryProofUrl`.
 */
export async function uploadDeliveryProof(shipmentId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const path = `${shipmentId}/${crypto.randomUUID()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from(PROOF_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError

  const { error } = await supabase
    .from('shipments')
    .update({ delivery_proof_url: path })
    .eq('id', shipmentId)
  if (error) throw error

  await logActivity('shipment.proof_uploaded', 'shipment', shipmentId, { path })
  return path
}

/** Short-lived signed URL for a stored proof path. Null when there is no proof. */
export async function getDeliveryProofUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 300)
  if (error) throw error
  return data?.signedUrl ?? null
}

export async function removeDeliveryProof(shipmentId: string, path: string): Promise<void> {
  const { error: storageError } = await supabase.storage.from(PROOF_BUCKET).remove([path])
  if (storageError) throw storageError
  const { error } = await supabase
    .from('shipments')
    .update({ delivery_proof_url: null })
    .eq('id', shipmentId)
  if (error) throw error
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
