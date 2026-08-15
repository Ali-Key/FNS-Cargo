# FSN Cargo — Supabase backend

Linked project ref: **`vvkztbxofacbzypxtslp`** (region eu-west-1).

## Current schema (authoritative = the linked project)

Tables (all with RLS enabled):

| Table | Purpose |
|-------|---------|
| `profiles` | App users linked to `auth.users`. `role` = `Admin` \| `Customer`, `status` = `Active` \| `Disabled`. Dashboard access = an **Active Admin** profile. |
| `countries` | Served markets (drives the "Countries served" stat). |
| `shipments` | Consignments. `tracking_number` unique (case-insensitive); enum `status` (9 stages), `shipping_method`, `cargo_type`. |
| `tracking_updates` | Per-shipment scan events (date, time, country, city, location, status). |
| `quotes` | Public quote requests. |
| `system_settings` | Single-row company config (added here). |
| `activity_logs` | Dashboard audit trail (added here). |

Enums: `user_role`, `user_status`, `shipment_status`, `shipping_method`, `cargo_type`, `quote_status`.

RPCs (SECURITY DEFINER): `is_admin()`, `current_profile_id()`, `dashboard_stats()`,
`admin_users_overview()`, `track_shipment(p_tracking_number)`,
`suggest_tracking_number(p_country_code)`, `public_settings()`,
`admin_clear_pending_email_change(p_profile_id)`.

Edge function: **`admin-create-user`** — admin-gated; creates an auth user with
`user_metadata.role`, and the `handle_new_auth_user` trigger creates the profile.

Edge function: **`admin-set-email`** — admin-gated; sets a sign-in address through
the Admin API, which moves `auth.users.email` and `auth.identities.identity_data`
together and sends no confirmation email. For when the mail service will not
deliver to the current address, so the normal confirm-from-both change cannot
complete. `admin_clear_pending_email_change(p_profile_id)` clears the dead
`email_change*` state such a failure leaves behind.

## Migrations in this folder

The base schema was authored directly in the linked project (migration history
starting `20260728…_core_schema`). Only the two migrations added from this repo
are committed here:

- `20260728202808_add_system_settings.sql`
- `20260728202823_add_activity_logs.sql`

**To materialise the full history locally** (exact base migration files, without
hand-transcription), link and pull from the remote — the CLI extracts them
faithfully:

```bash
supabase link --project-ref vvkztbxofacbzypxtslp
supabase db pull        # writes the remote migration history into supabase/migrations
```

> The previous old-schema migration files (`admin_users` / `customers` /
> `shipment_tracking_history` …) were **removed** — that schema was replaced by
> `core_schema`, which drops those tables. Do **not** reintroduce them.

## Public tracking

`track_shipment(text)` returns a safe field set + `events[]` (no PII). Unknown
number → `null`. `trackingService.ts` calls this RPC directly.

## Regenerating types

After any schema change, regenerate the client types so they stay authoritative:

```bash
supabase gen types typescript --linked > src/types/database.ts
```
