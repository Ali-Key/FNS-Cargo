// admin-create-user
// Creates a dashboard user. Service-role gated and admin-only: the caller's JWT
// is verified to belong to an admin before the service-role client provisions
// the auth account and the admin_users row. The service role key never leaves
// this trusted server context.
//
// Request body: { email: string, password: string, role: 'admin' | 'staff' }
// Response:     { user_id: string }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, json } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization' }, 401)

  // 1) Verify the caller is a signed-in admin (RLS-scoped client with their JWT).
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: isAdmin, error: adminErr } = await caller.rpc('is_admin_user')
  if (adminErr || !isAdmin) return json({ error: 'Not authorized' }, 403)

  // 2) Validate input.
  let body: { email?: string; password?: string; role?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid request body' }, 400)
  }
  const email = (body.email ?? '').trim().toLowerCase()
  const password = body.password ?? ''
  const role = body.role ?? ''

  if (!EMAIL_RE.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
  if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400)
  if (role !== 'admin' && role !== 'staff') return json({ error: 'Role must be admin or staff.' }, 400)

  // 3) Provision with the service role.
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created?.user) {
    const msg = /already registered|exists/i.test(createErr?.message ?? '')
      ? 'A user with that email already exists.'
      : 'Could not create the user.'
    return json({ error: msg }, 400)
  }

  const userId = created.user.id
  const { error: linkErr } = await admin.from('admin_users').insert({ user_id: userId, role })
  if (linkErr) {
    // Roll back the orphaned auth account so a retry is clean.
    await admin.auth.admin.deleteUser(userId)
    return json({ error: 'Could not assign the dashboard role.' }, 400)
  }

  return json({ user_id: userId }, 201)
})
