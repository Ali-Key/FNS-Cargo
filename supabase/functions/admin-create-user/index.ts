// admin-create-user
// Creates a dashboard user (profiles.role = 'Admin', 'Dispatcher', or 'Staff'). Admin-only:
// the caller's JWT is verified against is_admin() before the service-role client
// provisions the auth account. The handle_new_auth_user trigger creates the
// profile from user_metadata, so we pass role + full_name there.
//
// Body: { email, password, full_name, role? }  ->  { profile_id }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Only these origins may read the response from a browser. Anything else
// still gets a response (auth is the real boundary, not CORS), but the
// browser will refuse to expose it to page script.
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
  let body: { email?: string; password?: string; full_name?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const fullName = (body.full_name ?? '').trim()
  // Reject anything unrecognized rather than defaulting to a role — silently
  // falling back to 'Admin' on an unexpected value would be a privilege escalation.
  const VALID_ROLES = new Set(['Admin', 'Dispatcher', 'Staff'])
  const role = body.role ?? ''

  if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (fullName.length < 2) return json({ error: 'Enter a name.' }, 400)
  if (!VALID_ROLES.has(role)) return json({ error: 'Select a valid role.' }, 400)

  // 3) Provision with the service role. The DB trigger creates the profile from metadata.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  })
  if (createErr || !created?.user) {
    const msg = /already registered|exists/i.test(createErr?.message ?? '')
      ? 'A user with that email already exists.'
      : 'Could not create the user.'
    return json({ error: msg }, 400)
  }

  const userId = created.user.id

  // 4) Ensure the profile exists with the right role (belt-and-suspenders vs the trigger).
  const { data: profile } = await admin
    .from('profiles')
    .upsert({ auth_user_id: userId, email, full_name: fullName, role, status: 'Active' }, { onConflict: 'auth_user_id' })
    .select('id')
    .single()

  return json({ profile_id: profile?.id ?? null }, 201)
})
