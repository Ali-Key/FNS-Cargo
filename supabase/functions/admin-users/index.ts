// =============================================================================
// FSN Cargo — admin-users edge function
//
// Creating an auth account, resetting somebody's password and deleting a user
// all require the service role key, which can never be shipped to a browser.
// This function is the only place that key is used. Every request is
// authenticated with the caller's own JWT and rejected unless that caller is
// an active Admin in public.profiles.
//
//   POST /admin-users  { action: "create",          email, password, full_name, phone, role }
//   POST /admin-users  { action: "delete",          profile_id }
//   POST /admin-users  { action: "set_password",    profile_id, password }
//   POST /admin-users  { action: "update_password", password }              // own account
//   POST /admin-users  { action: "update_email",    email, profile_id? }    // own, or any as Admin
// =============================================================================
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Only these origins may read the response from a browser. Anything else
// still gets a response (auth is the real boundary, not CORS), but the
// browser will refuse to expose it to page script.
const ALLOWED_ORIGINS = new Set([
  'https://FSNcargo.com',
  'https://www.FSNcargo.com',
  'http://localhost:5173',
  'http://localhost:4173',
]);
function corsFor(req: Request) {
  const origin = req.headers.get('Origin') ?? '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://FSNcargo.com';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    Vary: 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

const MIN_PASSWORD = 8;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

// profiles.role is the `user_role` enum (Admin | Dispatcher | Staff) -- there
// is no "Customer" role. Public customers live in a separate `customers`
// table with no dashboard access (see CLAUDE.md); this function only ever
// provisions dashboard accounts, so a non-Admin request means Dispatcher.
type Payload = {
  action?: string;
  profile_id?: string;
  email?: string;
  password?: string;
  full_name?: string;
  phone?: string;
  role?: 'Admin' | 'Dispatcher';
};

Deno.serve(async (req) => {
  const CORS = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });

  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Missing authorization header' }, 401);
  }

  // Caller-scoped client: reads run under the caller's own RLS context.
  const caller = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await caller.auth.getUser();
  if (userError || !userData?.user) return json({ error: 'Invalid session' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  const { data: callerProfile } = await admin
    .from('profiles')
    .select('id, role, status, auth_user_id')
    .eq('auth_user_id', userData.user.id)
    .maybeSingle();

  if (!callerProfile || callerProfile.status !== 'Active') {
    return json({ error: 'Account is not active' }, 403);
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = payload.action;
  const isAdmin = callerProfile.role === 'Admin';

  // Changing your own password is one of two actions a customer may take here.
  if (action === 'update_password') {
    const password = (payload.password ?? '').trim();
    if (password.length < MIN_PASSWORD) {
      return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);
    }
    const { error } = await admin.auth.admin.updateUserById(userData.user.id, { password });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true });
  }

  // Changing an email address means changing the sign-in identity, so it has to
  // happen in auth and in the profile together. Anyone may change their own;
  // only an admin may change somebody else's.
  if (action === 'update_email') {
    const email = (payload.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return json({ error: 'Enter a valid email address' }, 400);
    }

    const targetId = payload.profile_id ?? callerProfile.id;
    if (targetId !== callerProfile.id && !isAdmin) {
      return json({ error: 'Administrator access required' }, 403);
    }

    const { data: target } = await admin
      .from('profiles')
      .select('id, auth_user_id, email')
      .eq('id', targetId)
      .maybeSingle();
    if (!target?.auth_user_id) return json({ error: 'User not found' }, 404);

    if (target.email.toLowerCase() === email) {
      return json({ ok: true, email, unchanged: true });
    }

    // Check first so a clash produces a readable message rather than a
    // constraint violation from either auth or the profiles table.
    const { data: clash } = await admin
      .from('profiles')
      .select('id')
      .ilike('email', email)
      .neq('id', targetId)
      .maybeSingle();
    if (clash) return json({ error: 'A user with that email already exists' }, 409);

    const { error: authError } = await admin.auth.admin.updateUserById(target.auth_user_id, {
      email,
      email_confirm: true,
    });
    if (authError) {
      const duplicate = /already|registered|exists/i.test(authError.message);
      return json({ error: authError.message }, duplicate ? 409 : 400);
    }

    const { error: profileError } = await admin
      .from('profiles')
      .update({ email })
      .eq('id', targetId);
    if (profileError) {
      // Put the auth record back so the two never disagree.
      await admin.auth.admin.updateUserById(target.auth_user_id, {
        email: target.email,
        email_confirm: true,
      });
      return json({ error: profileError.message }, 400);
    }

    return json({ ok: true, email });
  }

  if (!isAdmin) return json({ error: 'Administrator access required' }, 403);

  switch (action) {
    case 'create': {
      const email = (payload.email ?? '').trim().toLowerCase();
      const password = (payload.password ?? '').trim();
      const fullName = (payload.full_name ?? '').trim();
      const phone = (payload.phone ?? '').trim();
      const role = payload.role === 'Dispatcher' ? 'Dispatcher' : 'Admin';

      if (!EMAIL_RE.test(email)) {
        return json({ error: 'Enter a valid email address' }, 400);
      }
      if (password.length < MIN_PASSWORD) {
        return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);
      }
      if (fullName.length < 2) {
        return json({ error: 'Enter the full name' }, 400);
      }

      // Fail before touching auth so the caller gets a clean duplicate message.
      const { data: existing } = await admin
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .maybeSingle();
      if (existing) return json({ error: 'A user with that email already exists' }, 409);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, phone: phone || null, role },
      });
      if (createError) {
        const duplicate = /already|registered|exists/i.test(createError.message);
        return json({ error: createError.message }, duplicate ? 409 : 400);
      }

      // handle_new_auth_user() has created the profile; align the fields the
      // trigger cannot know about and hand the finished row back.
      const { data: profile, error: profileError } = await admin
        .from('profiles')
        .update({ full_name: fullName, phone: phone || null, role })
        .eq('auth_user_id', created.user!.id)
        .select('id, full_name, email, phone, role, status, created_at')
        .single();

      if (profileError) return json({ error: profileError.message }, 400);
      return json({ ok: true, profile }, 201);
    }

    case 'delete': {
      const profileId = payload.profile_id;
      if (!profileId) return json({ error: 'profile_id is required' }, 400);
      if (profileId === callerProfile.id) {
        return json({ error: 'You cannot delete your own account' }, 400);
      }

      const { data: target } = await admin
        .from('profiles')
        .select('id, auth_user_id, role')
        .eq('id', profileId)
        .maybeSingle();
      if (!target) return json({ error: 'User not found' }, 404);

      if (target.role === 'Admin') {
        const { count } = await admin
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'Admin');
        if ((count ?? 0) <= 1) {
          return json({ error: 'The last administrator cannot be deleted' }, 400);
        }
      }

      // Deleting the auth user cascades to the profile row.
      if (target.auth_user_id) {
        const { error } = await admin.auth.admin.deleteUser(target.auth_user_id);
        if (error) return json({ error: error.message }, 400);
      } else {
        const { error } = await admin.from('profiles').delete().eq('id', profileId);
        if (error) return json({ error: error.message }, 400);
      }
      return json({ ok: true });
    }

    case 'set_password': {
      const profileId = payload.profile_id;
      const password = (payload.password ?? '').trim();
      if (!profileId) return json({ error: 'profile_id is required' }, 400);
      if (password.length < MIN_PASSWORD) {
        return json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, 400);
      }

      const { data: target } = await admin
        .from('profiles')
        .select('auth_user_id')
        .eq('id', profileId)
        .maybeSingle();
      if (!target?.auth_user_id) return json({ error: 'User not found' }, 404);

      const { error } = await admin.auth.admin.updateUserById(target.auth_user_id, { password });
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    default:
      return json({ error: 'Unknown action' }, 400);
  }
});
