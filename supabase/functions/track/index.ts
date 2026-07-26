// track
// Rate-limited public tracking endpoint (the "Preferred" option from the spec).
// Hashes the client IP, enforces a per-IP-per-minute cap against tracking_lookups,
// then calls the locked-down track_shipment() RPC. Never returns PII; unknown
// numbers return { result: null }.
//
// To enforce rate limiting on the live site, point trackingService.ts at this
// function instead of calling supabase.rpc('track_shipment') directly:
//   const { data } = await supabase.functions.invoke('track', { body: { tracking_number } })
//
// Request body: { tracking_number: string }
// Response:     { result: <safe tracking object> | null }  | 429 when throttled

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const IP_SALT = Deno.env.get('TRACKING_IP_SALT') ?? 'fns-cargo-default-salt'

const MAX_PER_MINUTE = 10

async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(`${IP_SALT}:${ip}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  let body: { tracking_number?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const trackingNumber = (body.tracking_number ?? '').trim()
  if (trackingNumber.length < 6) return json({ result: null })

  const fwd = req.headers.get('x-forwarded-for') ?? ''
  const ip = fwd.split(',')[0].trim() || 'unknown'
  const ipHash = await hashIp(ip)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Sliding one-minute window per IP.
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await admin
    .from('tracking_lookups')
    .select('*', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('looked_up_at', since)

  if ((count ?? 0) >= MAX_PER_MINUTE) {
    return json({ error: 'Too many tracking requests. Please wait a moment and try again.' }, 429)
  }

  // Record this lookup (fire-and-forget; a failed insert must not block tracking).
  await admin.from('tracking_lookups').insert({ tracking_number: trackingNumber, ip_hash: ipHash })

  const { data, error } = await admin.rpc('track_shipment', { p_tracking_number: trackingNumber })
  if (error) return json({ error: 'Unable to look up that shipment right now.' }, 500)

  return json({ result: data ?? null })
})
