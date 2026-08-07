import { supabase } from '@/lib/supabase'
import type { PublicTrackingResult } from '@/types'

export async function trackShipment(trackingNumber: string): Promise<PublicTrackingResult | null> {
  const normalized = trackingNumber.trim()
  if (normalized.length < 6) return null

  const { data, error } = await supabase.functions.invoke('track-shipment', {
    body: { tracking_number: normalized },
  })
  if (error) throw error
  if (!data) return null

  return data as unknown as PublicTrackingResult
}
