// admin-set-email
// Sets a dashboard user's sign-in address directly, with no confirmation email.
//
// The normal flow is supabase.auth.updateUser({ email }), and it should stay the
// normal flow: it proves the person controls both addresses. But it cannot help
// when the mail path itself is the thing that is broken -- if GoTrue refuses to
// send to the *current* address, the confirm-from-both handshake can never
// complete, and no amount of retrying changes that (it only spends the project's
// mail quota). The Admin API is the supported way out: it writes auth.users.email
// and auth.identities.identity_data together, which raw SQL does not, and sends
// nothing, so it is immune to both the address validation and the rate limit.
//
// Admin-only: the caller's JWT is checked against is_admin() before the
// service-role client touches anything. The service-role key stays here; it is
// never exposed to the browser.
//
// Body: { profile_id, email }  ->  { email }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Only these origins may read the response from a browser. Anything else still
// gets a response (auth is the real boundary, not CORS), but the browser will
// refuse to expose it to page script.
const ALLOWED_ORIGINS = new Set([
  'https://FSNcargo.com',
  'https://www.FSNcargo.com',
  'http://localhost:5173',
  'http://localhost:4173',
])
function corsFor(req: Request) {
  const origin = req.headers.get('Origin') ?? ''
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://FSNcargo.com'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization' }, 401)

  // 1) Verify the caller is a signed-in admin.
  const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } })
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_admin')
  if (adminErr || !isAdmin) return json({ error: 'Not authorized' }, 403)

  // 2) Validate input.
  let body: { profile_id?: string; email?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const profileId = (body.profile_id ?? '').trim()
  // GoTrue stores addresses lowercased; normalising here keeps profiles.email
  // and auth.users.email byte-identical rather than differing only in case.
  const email = (body.email ?? '').trim().toLowerCase()

  if (!profileId) return json({ error: 'Missing profile.' }, 400)
  if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address.' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 3) Resolve the auth account from the profile. The profile id is what the
  //    console knows; auth_user_id is never sent by the client, so a caller
  //    cannot aim this at an arbitrary auth row.
  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, auth_user_id, email')
    .eq('id', profileId)
    .maybeSingle()
  if (profileErr) return json({ error: 'Could not read the profile.' }, 400)
  if (!profile?.auth_user_id) return json({ error: 'That profile has no sign-in account.' }, 404)

  // 4) Refuse an address another account already holds. GoTrue would reject it
  //    anyway, but its message leaks whether the address is registered.
  const { data: taken } = await admin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .neq('id', profileId)
    .maybeSingle()
  if (taken) return json({ error: 'Another account already uses that address.' }, 400)

  // 5) email_confirm marks the new address verified in the same write, so the
  //    user is not left signed in against an unconfirmed address. This also
  //    clears any pending email_change, since the change it described is moot.
  const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(
    profile.auth_user_id,
    { email, email_confirm: true },
  )
  if (updateErr || !updated?.user) {
    const msg = /already registered|exists/i.test(updateErr?.message ?? '')
      ? 'Another account already uses that address.'
      : (updateErr?.message ?? 'Could not update the address.')
    return json({ error: msg }, 400)
  }

  // 6) The on_auth_user_email_updated trigger syncs profiles.email already;
  //    this is belt-and-braces so the console never shows the old address if
  //    that trigger is ever dropped.
  await admin.from('profiles').update({ email }).eq('id', profileId)

  return json({ email: updated.user.email ?? email })
})
