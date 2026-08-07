// =============================================================================
// FNS Cargo — track-shipment edge function
//
// The ONLY path to public shipment tracking. track_shipment()'s direct
// PostgREST RPC grant was revoked from anon/authenticated (see migration
// 20260805090000_secure_public_tracking_and_harden_rpcs.sql), so this
// function -- using the service-role key -- is the sole caller left.
//
// Responsibilities beyond the plain RPC call:
//  - Validates the tracking number shape before touching the database.
//  - Rate-limits lookups per IP (tracking_lookup_attempts table) to slow
//    down enumeration attempts against the (now randomized) tracking format.
//  - Never surfaces a Postgres error message to the client.
//
// Body: { tracking_number }  ->  200 + tracking result JSON, or 200 + null
// when nothing matches. Non-2xx only for malformed requests, rate limiting,
// or an unexpected failure -- callers should not distinguish "not found"
// from "blocked" by status code, only by body shape, to avoid leaking which
// tracking numbers are close to real ones.
// =============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Only these origins may read the response from a browser. Anything else
// still gets a response (there is no auth boundary here beyond rate limiting
// -- this endpoint is meant to be public), but the browser will refuse to
// expose it to page script from an untrusted origin.
const ALLOWED_ORIGINS = new Set([
  'https://fnscargo.com',
  'https://www.fnscargo.com',
  'http://localhost:5173',
  'http://localhost:4173',
]);
function corsFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://fnscargo.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

// Same shape as the shipments.tracking_number check constraint.
const TRACKING_RE = /^[A-Z0-9][A-Z0-9-]{5,31}$/;

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 15;
const PRUNE_OLDER_THAN_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { tracking_number?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const raw = (body.tracking_number ?? '').trim().toUpperCase();
  if (raw.length < 6 || raw.length > 32 || !TRACKING_RE.test(raw)) {
    // Same response shape as "no match" -- do not reveal why it was rejected.
    return json(null, 200);
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

    const { count, error: countErr } = await admin
      .from('tracking_lookup_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('ip', ip)
      .gte('requested_at', windowStart);
    if (countErr) throw countErr;

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return json({ error: 'Too many requests. Please try again in a few minutes.' }, 429);
    }

    await admin.from('tracking_lookup_attempts').insert({ ip });
    // Opportunistic prune so this table never grows unbounded -- no pg_cron
    // dependency needed for a lookup this low-volume.
    await admin
      .from('tracking_lookup_attempts')
      .delete()
      .lt('requested_at', new Date(Date.now() - PRUNE_OLDER_THAN_MS).toISOString());

    const { data, error } = await admin.rpc('track_shipment', { p_tracking_number: raw });
    if (error) throw error;

    return json(data ?? null, 200);
  } catch (err) {
    console.error('track-shipment failed', err);
    return json({ error: 'Tracking is temporarily unavailable. Please try again shortly.' }, 500);
  }
});
