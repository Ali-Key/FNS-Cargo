# FNS Cargo — Supabase backend

Production-ready schema, security, and jobs for the FNS Cargo app. Everything is
delivered as **versioned migrations** — no manual dashboard edits in production.

## Layout

```
supabase/
├── config.toml                      # CLI config: pooler (transaction mode), auth, functions
├── migrations/                      # applied in filename order
│   ├── 20260726090100_extensions.sql
│   ├── 20260726090200_tables.sql
│   ├── 20260726090300_indexes.sql
│   ├── 20260726090400_functions_helpers.sql   # is_admin_user(), is_staff_or_admin_user()
│   ├── 20260726090500_triggers.sql            # updated_at + FNS-YYYY-NNNNNN generator
│   ├── 20260726090600_rpc.sql                 # track_shipment, admin_list_users, dashboard_stats, public_settings
│   ├── 20260726090700_rls.sql                 # RLS on every table
│   ├── 20260726090800_storage.sql             # buckets + storage.objects policies
│   ├── 20260726090900_archive_and_jobs.sql    # 24-month archive + rate-limit purge (pg_cron)
│   └── 20260726091000_seed_settings.sql
├── functions/
│   ├── _shared/cors.ts
│   ├── admin-create-user/index.ts   # admin-gated user provisioning (service role)
│   └── track/index.ts               # rate-limited public tracking wrapper
└── tests/
    └── rls_test_plan.sql            # per-role allow/deny assertions (rolls back)
```

## Apply

```bash
supabase link --project-ref <your-ref>
supabase db push                 # runs every migration in order
supabase functions deploy admin-create-user
supabase functions deploy track
# secret used by the tracking rate limiter to salt IP hashes:
supabase secrets set TRACKING_IP_SALT="$(openssl rand -hex 16)"
```

Local: `supabase start` then `supabase db reset` (applies migrations + seed).

## First admin (bootstrap)

RLS lets only an existing admin create users, so seed the very first one with the
service role (one time):

```sql
-- after creating the auth user in Dashboard → Authentication:
insert into public.admin_users (user_id, role)
values ('<auth-user-uuid>', 'admin');
```

Thereafter use the **Users** page (→ `admin-create-user` edge function).

## Connection pooling

Serverless / edge clients **must** use the transaction-mode pooler (pgBouncer),
not the direct `5432` connection:

```
postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres
```

The browser app uses PostgREST (`VITE_SUPABASE_URL`) and is unaffected. Reserve
the direct connection for migrations and the RLS test run.

## Security model (summary)

| Role | Tables | Notes |
|------|--------|-------|
| **anon** | none directly | Tracks via `track_shipment()`; reads company info via `public_settings()`. |
| **staff** | read shipments/customers/tracking; create shipments + tracking; write only own `assigned_to` rows | No user management, no settings, no customer writes. |
| **admin** | full CRUD everywhere | User management via `admin_list_users()` + `admin-create-user`. |

- RLS is **enabled on every table**; default-deny, least-privilege allow.
- Public tracking is served **only** by `track_shipment()` (SECURITY DEFINER,
  locked `search_path`), which returns safe fields + timeline and **never** PII.
  Unknown numbers return empty, never an error.
- Helper functions `is_admin_user()` / `is_staff_or_admin_user()` are `stable`,
  `security definer`, locked `search_path` — the spec's `is_admin()` / `is_staff()`.
- Storage: `documents` bucket is private with `storage.objects` RLS; `public-assets`
  is world-readable, admin-writable. MIME + size limits set per bucket.
- The **service role key** lives only in edge functions / server contexts.

## Rate limiting the public tracker

Two layers are provided:

1. **`track` edge function** (preferred): hashes the caller IP (salted SHA-256,
   never stored raw), enforces **10 lookups / minute / IP** against
   `tracking_lookups`, then calls the RPC. To enforce it on the live site, point
   `src/services/trackingService.ts` at it:

   ```ts
   const { data } = await supabase.functions.invoke('track', {
     body: { tracking_number: normalized },
   })
   return (data?.result as PublicTrackingResult) ?? null
   ```

2. `purge_tracking_lookups()` runs hourly (pg_cron) to keep the table small.

The app currently calls `track_shipment()` directly (fast path, no throttle);
switch to the edge function when you want the hard limit enforced.

## Performance

- Indexes on every FK, filter, and sort column (see `..._indexes.sql`); trigram
  GIN indexes back the dashboard ILIKE search.
- `dashboard_stats()` is a single-round-trip aggregate for the overview (<2s).
  The frontend still reduces client-side today; adopt the RPC to cut payload.
- Cache rarely-changing data at the app layer (`useSystemSettings` already does).
- Use keyset pagination for very deep pages; the current `range()` offset paging
  is fine for the dashboard's page sizes.

## Retention

`archive_old_shipments()` (nightly, 02:30 UTC) moves `delivered`/`cancelled`
shipments older than **24 months** — with their tracking history — into
`shipments_archive` / `shipment_tracking_history_archive`. `track_shipment()`
searches both, so archived shipments still track publicly.

## Testing RLS

```bash
psql "$DIRECT_DB_URL" -f supabase/tests/rls_test_plan.sql
```

Seeds throwaway admin/staff/customer/shipment fixtures, asserts every
role × operation × table expectation (including that `track_shipment` leaks no
email/phone/address/declared_value/notes), prints a PASS/FAIL table, and rolls
everything back. Non-zero failures abort with an error.

## Monitoring

- Enable Dashboard → Logs (Postgres, Auth, Edge). Auth logs cover sign-ins and
  failed attempts; `activity_logs` records dashboard mutations.
- Review slow queries and run `explain analyze` on hot paths (`track_shipment`,
  the shipment list query, `dashboard_stats`) after real data lands.

## Rollback

Each migration is additive and independently reversible. Back up
(`supabase db dump`) before `db push`. To undo the latest: restore the dump, or
write a down-migration dropping the objects it created (drop policies →
functions → triggers → indexes → tables, reverse order).

## Note on generated types

`src/types/database.ts` was hand-updated for the new `reference_number` /
`assigned_to` columns and the `public_settings` / `dashboard_stats` RPCs. After
`db push`, regenerate to stay authoritative:

```bash
supabase gen types typescript --linked > src/types/database.ts
```

Then you can surface staff assignment (`assigned_to`) and `reference_number` in
the shipment form.
