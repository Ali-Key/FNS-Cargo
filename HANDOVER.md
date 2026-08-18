# FSN Cargo — Ownership & Handover Terms

**Owner:** FSN Cargo (the Company)
**Project:** FSN Cargo web platform (public site + operations console)
**Status:** Draft for sign-off — date: ____________

Ownership of all deliverables listed below vests in the Company. All accounts must be
registered to a company address (e.g. `info@fsncargo.com`), never a personal developer
address, so no single individual is a dependency. The developer retains no residual
admin rights after handover.

---

## 1. Source code

| Item | Detail | Done |
|---|---|---|
| Frontend | React 18 + Vite 6 + TypeScript + Tailwind (`src/`) | ☐ |
| Backend / serverless | Supabase edge functions (`supabase/functions/`): `admin-create-user`, `admin-set-email`, `send-invoice-email`, `track-shipment`, `admin-users` (deprecated, retire) | ☐ |
| Database migrations | `supabase/migrations/` — SQL, applied in order | ☐ |
| Scripts | `scripts/shoot.mjs` (visual QA) | ☐ |
| Git history | Full history transferred, not a squashed re-init | ☐ |

## 2. GitHub

- Repository: `https://github.com/Ali-Key/FNS-Cargo.git`
- **Required:** repo moved into a Company-owned GitHub organisation, with the Company
  account as **organisation Owner**, not an invited collaborator.
- Developer accounts downgraded or removed at the Company's discretion after transfer.

## 3. Supabase

- Project ref: `vvkztbxofacbzypxtslp`
- **Required:** project transferred to a Company-owned Supabase organisation with the
  Company account as **Owner**; developer removed from the org.
- **Full export delivered**, covering:
  - schema (tables, enums, generated columns)
  - RLS policies on every table
  - SECURITY DEFINER RPCs (`is_admin`, `is_ops`, `current_profile_id`,
    `current_customer_id`, `track_shipment`, `dashboard_stats`, `analytics_report`,
    `admin_users_overview`, `customer_balances_overview`, `suggest_tracking_number`,
    `public_settings`, `admin_clear_pending_email_change`)
  - triggers and functions (`sync_shipment_status`, `sync_invoice_totals`,
    `stamp_delivered_at`, `handle_new_auth_user`, …)
  - storage buckets and their policies (`avatars`, delivery proofs)
  - a data dump (`pg_dump` / `supabase db dump`) taken at handover date
- Note: the repo migrations are **not** the complete history — the base schema was
  authored in the live project. The export must be taken from the live database.

## 4. Hosting

- Host: Netlify (SPA routing via `public/_redirects`)
- **Required:** site owned by a Company Netlify team; Company account as **Owner**.
- Build settings and environment variables documented and reproducible.

## 5. Domain & DNS

- Domain registered in a **Company-held registrar account** with full DNS control.
- Delivered: registrar login, unlock/EPP transfer where applicable, current DNS records
  (A/CNAME for the site, MX and SPF/DKIM/DMARC for mail).

## 6. Application super admin

- One Admin `profiles` account on the Company address, `role = 'Admin'`,
  `status = 'Active'`, with a password reset performed by the Company at handover.
- Developer accounts deactivated or deleted after acceptance.

## 7. Keys, secrets, third-party accounts

Delivered by secure channel (password manager or encrypted transfer), never plain email:

- Supabase: URL, publishable/anon key, **service-role key**, JWT secret, DB password
- Email/SMTP provider used by `send-invoice-email`
- SMS provider (if enabled)
- Payments provider keys (if enabled)
- Storage, analytics, error tracking (if enabled)
- Any edge-function secrets set in the Supabase dashboard

## 8. Documentation

- System architecture (see `CLAUDE.md`, to be expanded into a standalone doc)
- Database schema reference and RLS/permissions map
- Deployment guide (build, env vars, Netlify settings, edge function deploy)
- `.env.example` — present, kept current
- Admin user manual (dashboard workflows: shipments, tracking, invoices, payments,
  customers, team accounts)
- `supabase/README.md` — grant/RLS gotchas

---

## Credential rotation

The Company will rotate all security credentials immediately after handover —
Supabase service-role key and DB password, SMTP, payments, and any other secrets.
This is standard practice and implies no distrust. The developer will confirm no
external service breaks as a direct result of rotation (i.e. no hardcoded secrets).

## Acceptance

Handover is complete when every box above is ticked, the Company can independently
build, deploy, and log in without developer involvement, and a fresh clone plus the
documented env vars produces a working deployment.

Company: ____________________  Date: __________

Developer: __________________  Date: __________
