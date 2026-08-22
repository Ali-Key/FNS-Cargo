# FSN Cargo — Supabase backend

Linked project ref: **`vvkztbxofacbzypxtslp`** (region eu-west-1).

## Current schema (authoritative = the linked project)

Tables (all with RLS enabled):

| Table | Purpose |
|-------|---------|
| `profiles` | App users linked to `auth.users`. `role` = `Admin` \| `Customer`, `status` = `Active` \| `Disabled`. Dashboard access = an **Active Admin** profile. |
| `countries` | Served markets. Single source of truth for every country selector: the shipment form, the tracking-event form and the public site read the **active** rows; admins manage the full list in Settings > Countries. Also drives the "Countries served" stat. |
| `warehouses` | Handling facilities, each owned by a `countries` row, and the branches the business runs on: `code` is the branch code printed on the waybill. The shipment origin selects them: one warehouse for a country is assigned automatically, several become a picker. Ops read, Admin writes — never exposed to `anon`. |
| `shipments` | Consignments. `tracking_number` unique (case-insensitive); enum `status` (9 stages), `shipping_method`, `cargo_type`. `warehouse_id` is the real link; `warehouse` and `branch_code` are its display labels, both maintained by trigger. |
| `tracking_updates` | Per-shipment scan events (date, time, country, city, location, status). |
| `quotes` | Public quote requests. |
| `system_settings` | Single-row company config (added here). |
| `activity_logs` | Dashboard audit trail (added here). |

Enums: `user_role`, `user_status`, `shipment_status`, `shipping_method`, `cargo_type`, `quote_status`.

RPCs (SECURITY DEFINER): `is_admin()`, `current_profile_id()`, `dashboard_stats()`,
`admin_users_overview()`, `track_shipment(p_tracking_number)`,
`suggest_tracking_number(p_country_code)`, `public_settings()`,
`admin_clear_pending_email_change(p_profile_id)`,
`payment_ledger_totals(p_search, p_method)`.

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

…and every migration added since, including
`20260819120000_country_management.sql`, which gives `countries` its
case-insensitive unique indexes on `lower(name)` / `upper(code)`, Admin-only
INSERT/UPDATE/DELETE policies (reads stay on the existing "Anyone reads active
countries" policy), and the seed rows for the markets the frontend used to
hardcode. `20260802120000_clear_all_data_keep_admin.sql` emptied the table, so
**this migration must be applied before the country selectors have anything to
offer**.

`20260822230000_warehouse_assignment.sql` adds `warehouses` and
`shipments.warehouse_id`, seeds one warehouse per active country, and installs
`sync_shipment_warehouse_name()` — a BEFORE trigger that writes
`shipments.warehouse` from the linked row. That older text column is kept
because the shipments list filter, the search and the detail page read it; it
is now derived rather than typed, and can no longer contradict the link. Rows
predating the migration keep whatever text they had until someone edits them.

`20260823140000_automatic_branch_code.sql` makes the branch code automatic. The
warehouse handling the cargo **is** the branch, so `warehouses.code` (NOT NULL,
unique, `^[A-Z0-9]{2,6}$`) holds the branch's own code — `MOG`, `IST`, `GUA` —
seeded from each facility's city. `shipments.branch_code` stops being free text
and becomes a second derived label: the trigger is replaced by
`sync_shipment_warehouse_link()`, which stamps both `warehouse` and
`branch_code` from `warehouse_id`. It fires on `warehouse_id`, `warehouse` and
`branch_code`, so a client that sends a code on a linked shipment has it
overwritten by the branch's rather than accepted. Clearing the link clears both
labels; a shipment with no link keeps whatever code it was booked with. The
frontend no longer sends `branch_code` at all — `ShipmentInput` omits it, and
the form shows it read-only.

`shipments.origin` / `shipments.destination` and `tracking_updates.country`
store the country **name**, not a foreign key. Nothing in the database stops a
delete that orphans them, so the console counts those references first and
refuses the delete while any exist, offering deactivation instead.

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
