import { supabase } from '@/lib/supabase'
import type { TrackingUpdate, TrackingUpdateWithShipment, TablesInsert, TablesUpdate } from '@/types'
import { logActivity } from './activityService'

export async function listTrackingHistory(shipmentId: string): Promise<TrackingUpdate[]> {
  const { data, error } = await supabase
    .from('tracking_updates')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('date', { ascending: false })
    .order('time', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Cross-shipment recent event feed for the Tracking Updates page. */
export async function listRecentTrackingEvents(limit = 20): Promise<TrackingUpdateWithShipment[]> {
  const { data, error } = await supabase
    .from('tracking_updates')
    .select('*, shipment:shipments(id, tracking_number)')
    .order('date', { ascending: false })
    .order('time', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as TrackingUpdateWithShipment[]) ?? []
}

export type TrackingEventInput = Omit<TablesInsert<'tracking_updates'>, 'id' | 'created_at'>

export async function createTrackingEvent(payload: TrackingEventInput): Promise<TrackingUpdate> {
  const { data, error } = await supabase.from('tracking_updates').insert(payload).select().single()
  if (error) throw error
  await logActivity('tracking_event.created', 'shipment', payload.shipment_id, {
    status: payload.status,
    location: payload.location,
  })
  return data
}

export async function updateTrackingEvent(
  id: string,
  payload: TablesUpdate<'tracking_updates'>,
): Promise<TrackingUpdate> {
  const { data, error } = await supabase
    .from('tracking_updates')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logActivity('tracking_event.updated', 'shipment', data.shipment_id, { status: data.status })
  return data
}

export async function deleteTrackingEvent(id: string, shipmentId: string): Promise<void> {
  const { error } = await supabase.from('tracking_updates').delete().eq('id', id)
  if (error) throw error
  await logActivity('tracking_event.deleted', 'shipment', shipmentId, {})
}

/** Distinct recently-used locations, newest first — powers the quick-update autocomplete. */
export async function listRecentLocations(limit = 100): Promise<string[]> {
  const { data, error } = await supabase
    .from('tracking_updates')
    .select('location')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  const seen = new Set<string>()
  for (const row of data ?? []) {
    const loc = row.location?.trim()
    if (loc) seen.add(loc)
  }
  return [...seen]
}

/** Look up a shipment by exact tracking number (quick-add flow). */
export async function findShipmentByTracking(trackingNumber: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select('id, tracking_number, status, origin, destination')
    .ilike('tracking_number', trackingNumber.trim())
    .maybeSingle()
  if (error) throw error
  return data
}
