import { supabase } from '@/lib/supabase'
import type {
  ShipmentTrackingHistory,
  TrackingEventWithShipment,
  TablesInsert,
  TablesUpdate,
} from '@/types'
import { logActivity } from './activityService'

export async function listTrackingHistory(shipmentId: string): Promise<ShipmentTrackingHistory[]> {
  const { data, error } = await supabase
    .from('shipment_tracking_history')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('event_time', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** Cross-shipment recent event feed for the Tracking Updates page. */
export async function listRecentTrackingEvents(limit = 20): Promise<TrackingEventWithShipment[]> {
  const { data, error } = await supabase
    .from('shipment_tracking_history')
    .select('*, shipments(id, tracking_number)')
    .order('event_time', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data as TrackingEventWithShipment[]) ?? []
}

export type TrackingEventInput = Omit<TablesInsert<'shipment_tracking_history'>, 'id' | 'created_at'>

export async function createTrackingEvent(
  payload: TrackingEventInput,
): Promise<ShipmentTrackingHistory> {
  const { data, error } = await supabase
    .from('shipment_tracking_history')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  await logActivity('tracking_event.created', 'shipment', payload.shipment_id, {
    status: payload.status,
    location: payload.location,
  })
  return data
}

export async function updateTrackingEvent(
  id: string,
  payload: TablesUpdate<'shipment_tracking_history'>,
): Promise<ShipmentTrackingHistory> {
  const { data, error } = await supabase
    .from('shipment_tracking_history')
    .update(payload)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  await logActivity('tracking_event.updated', 'shipment', data.shipment_id, { status: data.status })
  return data
}

export async function deleteTrackingEvent(id: string, shipmentId: string): Promise<void> {
  const { error } = await supabase.from('shipment_tracking_history').delete().eq('id', id)
  if (error) throw error
  await logActivity('tracking_event.deleted', 'shipment', shipmentId, {})
}

/** Distinct recently-used locations, newest first — powers the quick-update autocomplete. */
export async function listRecentLocations(limit = 100): Promise<string[]> {
  const { data, error } = await supabase
    .from('shipment_tracking_history')
    .select('location, event_time')
    .order('event_time', { ascending: false })
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
    .eq('tracking_number', trackingNumber.trim())
    .maybeSingle()
  if (error) throw error
  return data
}
