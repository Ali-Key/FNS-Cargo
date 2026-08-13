# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style
- Work on ONE task only; read ONLY the files needed. Never analyze the whole project unless requested.
- Make the smallest possible change; preserve existing architecture and don't refactor unrelated code.
- Reuse existing components (`src/components/ui`) rather than adding new primitives.
- Keep responses under 150 words unless asked; don't explain code unless requested. If info is missing, ask one short question.
- Fix spacing/grammar/consistency automatically. UI is mobile-first and token-driven; never hardcode hex colors in components — change the theme in `tailwind.config.js`. **The product is FSN Cargo** in all visible copy, titles, and metadata. Avoid em-dashes in visible copy.
- **Two palettes, one config.** The public marketing site keeps `navy-*` / `primary-*` (deep navy + `#3865F2` blue) and its conversion CTA stays `variant="primary"`. The dashboard uses its own `deck-*` (ink/neutral ramp), `signal-*` (FSN brand blue `#3865F2`, the logo's ink), `canvas`, and `panel` scales, with `rounded-deck*` radii and the `shadow-deck*` elevation set. Do not paint dashboard surfaces with `navy-*`/`steel-*`/`border-gray-*` — those are the public site's tokens. Recharts and other literal-colour consumers read `DECK_HEX` from `src/utils/status.ts`.
- Public-site visual standard (enterprise, not "AI-generated"): no gradient backgrounds or ambient blur "blob" glows; separate sections with hairline borders (`border-gray-200`) and whitespace. Hover states shift border/shadow only, never a `-translate-y` bounce. Lean on the token system (elevation, type scale) and photography, not decoration. Keep the navy dark bands and the low-opacity grid on `PageHero`.
- Database: fetch only required columns, never duplicate query logic (it lives in `src/services`).

## Commands
```bash
npm run dev        # Vite dev server
npm run build      # tsc -b && vite build  (type-check is part of the build — run before pushing)
npm run lint       # eslint .
npm run preview    # serve the production build locally
npm run shots      # Playwright full-page screenshots (desktop + mobile) for visual QA
```
No test runner is configured — the type-check inside `npm run build` is the safety net; run it before pushing.

`shots` targets an already-running server: `BASE=http://localhost:4173 npm run shots -- /about /services` (defaults to the dev server and the five main public routes; output to `./.screenshots`). Screenshots can show stale CSS if Vite has not recompiled — reload once before trusting them.

**Run `shots` from PowerShell, not Git Bash.** Git Bash path-converts route arguments (`/` becomes `C:/Program Files/Git/`), and Playwright fails with `Cannot navigate to invalid URL`. Also pass `BASE` explicitly: the script defaults to port 5173, but Vite increments the port when one is taken, so a second dev server silently screenshots the wrong app — or nothing. Pin the port instead of guessing it: `npx vite --port 5199 --strictPort` fails loudly rather than drifting, then `$env:BASE="http://localhost:5199"; npm run shots -- / /services`.

`shots` only reaches unauthenticated pages. The dashboard sits behind `ProtectedRoute`, so passing `/dashboard` captures the login redirect, not the dashboard. Review admin UI in a browser session.

## Stack
React 18 + Vite 6 + TypeScript + Tailwind + React Router 7 + Supabase. Forms use react-hook-form + zod; charts use Recharts (dashboard only); icons via lucide-react; PDF documents use `@react-pdf/renderer` + `jsbarcode`. Path alias `@/*` → `src/*`.

`useDebouncedValue` backs the search box on every admin list page. (A near-identical `useDebounce.ts` used to sit beside it and has since been deleted — don't reintroduce a second one.)

Public sections are wrapped in `Reveal` (scroll-triggered fade-up), which renders children at
`opacity: 0` until an IntersectionObserver fires. That would screenshot blank, so two things
cooperate to prevent it: `scripts/shoot.mjs` sets `reducedMotion: 'reduce'`, and `index.css`
pins `.reveal { opacity: 1 !important }` under `prefers-reduced-motion`. **Don't remove either**
— dropping the `reducedMotion` flag makes every below-the-fold section capture empty.

## Architecture

**Two apps in one bundle, split by route** ([src/App.tsx](src/App.tsx)):
- **Public marketing site** — eager-loaded under `PublicLayout` (`/`, `/services`, `/tracking`, `/about`, `/contact`, `/privacy`, `/terms`).
- **Admin dashboard** — every `/dashboard/*` page and `/login` is `lazy()`-imported so Recharts and admin code never ship in the public chunk. Keep this split: import admin pages lazily.

`vite.config.ts` additionally splits `node_modules` into named vendor chunks (`vendor-react`, `vendor-router`, `vendor-supabase`, `vendor-charts`, `vendor-forms`). This is what keeps Recharts (~330 kB) out of the public entry and lets vendor bundles stay cached across content deploys. Verify the split survives after touching build config: `vendor-charts` must not be a dependency of the public entry.

`@react-pdf/renderer` and its transitive deps (pdfkit, fontkit, yoga-layout, …) are
deliberately left **unchunked** — the `return` with no value in `manualChunks`. Naming them
into a manual chunk, even a dedicated one, makes Rollup's optimizer treat it as a first-class
graph node it can merge shared modules into; that previously pulled genuinely-public modules
like `clsx` along and promoted a multi-MB chunk into a static import of the public entry.
Returning `undefined` keeps Rollup's default, which leaves modules with zero static importers
in dynamic-import-only chunks. Verify after touching build config: the public entry in
`dist/index.html` must preload neither `vendor-charts` nor a pdf chunk.

**Auth & authorization** — `AuthContext` holds the Supabase session; being signed in is not enough. It reads the caller's own row from the `profiles` table (RLS: `auth_user_id = auth.uid()`) and exposes `profile`, `isAdmin`, `isOps`, `unauthorized`, `profileError`, and `refreshProfile()`. Roles are `Admin` | `Dispatcher` | `Staff`. `isAdmin` is true only when `role === 'Admin' && status === 'Active'`; `isOps` is true for any of the three roles when Active, and mirrors the database's `is_ops()` RLS gate (`role in ('Admin','Dispatcher','Staff')`).

`profiles` holds **dashboard accounts only**. Public customers are a separate `customers` table with no role column and no dashboard access; `shipments.customer_id` and `quotes.customer_id` reference `customers(id)`. Never filter `profiles` by a customer role — it no longer exists.

`ProtectedRoute` ([src/components/auth/ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx)) **requires `isOps` for every route it wraps** (all of `/dashboard/*`), and `allow={['Admin']}` narrows the admin-only areas: Finance (Payments, Invoices) and Analytics. Dispatchers and Staff both get Overview, Shipments, Tracking, Customers, Quotes, and Settings — Finance/Analytics are Admin-only regardless of which non-Admin role it is. `/dashboard/settings` is *not* route-gated, because every dashboard user manages their own account there; its Team and Company bands are gated inside the page by `isAdmin` and, in the database, by the profiles/`system_settings` RLS policies and the admin-gated `admin-create-user` edge function. There is still no customer-facing portal — `customers` is a separate table with no dashboard access.

**Every `allow={['Admin']}` route has a matching database gate; the UI check is convenience, not the boundary.** Finance is enforced by the `invoices`/`payments` RLS policies (`is_admin()`), Analytics by `analytics_report()` raising `42501`. Adding an admin-only page means adding the DB gate too, not just the route prop.

`ProtectedRoute` distinguishes three failure states, and they must stay distinct: no session → redirect to `/login`; `profileError` (lookup failed) → retry screen; profile resolved but not an active Admin → "No dashboard access". Collapsing a failed lookup into the denial screen makes an infrastructure fault look like a permissions decision.

> **Never `await` a Supabase query inside the `onAuthStateChange` callback.** supabase-js holds its auth lock (navigator LockManager) for the whole handler, so a query issued there can never resolve — the profile stays null, `isAdmin` stays false, and legitimate admins get "No dashboard access". Do only synchronous state updates in the handler and defer any DB call with `setTimeout(fn, 0)`. `signIn()` also resolves the profile itself so navigation does not race the auth event. This was a real bug; do not reintroduce it by "simplifying" the callback.

A class `ErrorBoundary` ([src/components/common/ErrorBoundary.tsx](src/components/common/ErrorBoundary.tsx)) wraps the whole tree in `main.tsx` so a render fault shows a reload screen instead of a blank page.

**Data layer** — components never call `supabase` directly for domain data. All reads/writes go through `src/services/*Service.ts` — one per domain: shipments, customers, quotes, dashboard, settings, users, tracking, trackingHistory, finance, analytics, profile, activity, which wrap the client in [src/lib/supabase.ts](src/lib/supabase.ts). Add new queries as service functions. `activityService.logActivity()` is best-effort and never throws — call it after a mutation succeeds; a failed audit-log write must never break the action that triggered it.

**Stale-while-revalidate caching, not `useEffect`-on-mount, for read-heavy pages.** `AuthContext` caches the resolved profile in `localStorage` (`FSN.auth.profile`) and [useCachedResource](src/hooks/useCachedResource.ts) (`FSN.cache.*`) generalizes the same pattern for page data (currently `Overview.tsx`, `Shipments.tsx`, `Customers.tsx`): a cached copy paints instantly from `localStorage` — shared across tabs, so a second tab reuses what the first already fetched instead of re-querying — while a background request silently revalidates it; a failed background revalidation keeps the last good data on screen rather than clearing it. This is a rendering hint only, never a trust boundary: every real read still goes through the same RLS-gated query. `clearAllCachedResources()` runs on sign-out so a shared machine never paints one account's cached data for the next. When adding a new data-heavy dashboard page, prefer wrapping its fetch in `useCachedResource` over a bare `useEffect` fetch.

**Dashboard components are organised by feature, not by kind.** `src/components/dashboard/`
holds only chrome shared across every dashboard page — `PageHeader`, `DataToolbar`,
`FilterDropdown`, `PillGroup`, `ConfirmDialog`, `ExportMenu`, `ResponsiveDataList`,
`NotificationsMenu`, `CommandPalette`, `charts`. Domain-specific modals live with their feature:
`components/shipments/` (`ShipmentFormModal`, `TrackingEventFormModal`,
`WorkflowStepper`), `components/customers/`, `components/payments/` (invoice + payment modals,
`ReceiverSignatureModal`), `components/users/` (`CreateUserModal`), and `components/settings/`
(the Settings page's bands). Each has a barrel `index.ts` — import from
`@/components/payments`, not the file inside it. `components/common/` and `components/tracking/`
remain **public-site** chrome; do not put dashboard code there.

**The console frame lives in `src/components/layout/`** — `DashboardShell` (dark command rail +
sticky topbar + one scrolling work area), `Sidebar`, `Topbar`, `UserMenu`, `BrandMark`, and
`navigation.ts` (the single nav/IA definition and its role filter). `src/layouts/DashboardLayout.tsx`
is now a one-line re-export of `DashboardShell`, kept so `App.tsx`'s lazy import path is stable.
Add or reorder dashboard routes in `navigation.ts`, not by hand-editing the sidebar markup.

**Dashboard pages are grouped by feature under `src/pages/`** — `dashboard/Overview`,
`shipments/{Shipments,ShipmentDetail}`, `tracking/TrackingUpdates`, `customers/Customers`,
`quotes/Quotes`, `payments/{Invoices,Payments}`, `reports/Analytics`,
`settings/Settings`, `auth/Login`. The old `src/pages/admin/` folder is gone.
`settings/Settings` is the console's **only** account-management destination — it composes
`ProfileSettings`, `TeamAccounts` (Admin), and `CompanySettings` (Admin) from
`src/components/settings/`. The separate `/dashboard/profile` and `/dashboard/users` pages were
deleted; add a new settings band as a section component there, not as a new route.
Route *paths* are unchanged (`/dashboard/*`) — bookmarks and the DB gates key off them.

**`Panel` + `Metric` are the two containers the console is built from**
([src/components/ui/Panel.tsx](src/components/ui/Panel.tsx), [src/components/ui/Metric.tsx](src/components/ui/Metric.tsx)).
`Panel`/`PanelHeader`/`PanelBody`/`PanelFooter` compose a surface; `SectionCard` is the shorthand
built on top of them for prop-described sections. `Metric` is the single headline-number card
(the old `StatTile` is deleted) and `MetricSkeleton` matches its box exactly. Form controls share
`FieldShell`/`FIELD_CONTROL` from [src/components/ui/Field.tsx](src/components/ui/Field.tsx), so
`Input`, `Select`, and `Textarea` cannot drift apart. Focus rings come from the `deck-focus`
utility in `index.css`, not per-component ring classes.

**`src/utils/status.ts` is the single source of shipment-status presentation** — labels,
Lucide icons, Tailwind style classes, hex mirrors for Recharts (which needs literal colors),
and progress percentages, all keyed by `ShipmentStatus`. Thirteen files consume it. Adding a
status enum value means extending the maps there, not styling it inline in a component. Note
the `-ink` text pairs: the saturated status hues are fill/dot colors only and fail WCAG AA as
12px text on their own tint.

**List pages share one responsive pattern** — `ResponsiveDataList` ([src/components/dashboard/ResponsiveDataList.tsx](src/components/dashboard/ResponsiveDataList.tsx)) renders a `Table` above the `sm` breakpoint and `MobileRowCard` rows below it from the same per-row render callback, paired with `DataToolbar` for search/filters and `ExportMenu` for CSV/PDF export. Shipments, Customers, Payments, Invoices, and Users are all built on this trio — extend it rather than hand-rolling a new table/card split.

**A global `CommandPalette`** (⌘K, [src/components/dashboard/CommandPalette.tsx](src/components/dashboard/CommandPalette.tsx)) opens from anywhere in the dashboard (⌘K, or a `fsn:command` window event) for posting a tracking update without leaving the current page. It writes through the same `trackingHistoryService` functions the Tracking page uses — not a separate code path — so status still only ever changes via a tracking event.

**Document generation** — invoices, waybill/shipment labels, customer statements, payment receipts, and shipment reports are React components rendered to PDF via `@react-pdf/renderer` in `src/lib/documents/` (one file per document type), sharing `DocumentHeader.tsx` for company branding and `theme.ts` for a PDF-safe color palette mirrored from the Tailwind tokens; `barcode.ts` wraps `jsbarcode` for waybill barcodes. `generatePdf.ts` exposes the only render paths — `downloadPdf`, `printPdf`, `getPdfPreviewUrl`, `pdfToBase64` — and `src/lib/exports/*.tsx` wire these into page-specific export menus (CSV export is separate, in `src/lib/exports/csv.ts`). Add a new document type by following an existing one in `src/lib/documents/`, not by assembling PDF markup ad hoc in a page.

**Public tracking is deliberately locked down** — the only public window into shipments is the `track_shipment(p_tracking_number)` RPC (SECURITY DEFINER, returns a fixed safe field set + `events[]` timeline, never PII; unknown number → `null`). Its direct PostgREST grant is revoked from `anon`/`authenticated`: `trackingService.ts` calls the **`track-shipment` edge function**, which is the sole caller (service-role key, per-IP rate limit in `tracking_lookup_attempts`, generic errors). Do not re-grant the RPC to reach it from the client.

**Public writes go through RLS-shaped service calls** — the contact page submits a real row into `quotes` via `quotesService.submitQuote`. That insert must NOT chain `.select()`: the `anon` role has an INSERT policy but no SELECT policy on `quotes`, so asking for the row back fails RLS. Same shape applies to any future public write.

**A policy is only as reachable as the functions it calls.** The `quotes` INSERT policy evaluates `current_customer_id()`; if `anon` lacks `EXECUTE` on a function a policy references, Postgres raises `42501` while *checking the policy*, and PostgREST returns it as **HTTP 401** — which reads like a bad API key and sends you hunting through env vars and sessions instead of grants. Grant `EXECUTE` to `anon` on every SECURITY DEFINER helper an anon-facing policy touches.

`quotes` columns are fixed: `full_name`, `email`, `phone`, `origin`, `destination`, `cargo_type`, `weight`, `message`, `status`. `origin` and `destination` are NOT NULL, so the contact form cannot drop them. There is no `service` or `subject` column — anything like that has to be folded into `message` or added by migration first, or it is silently discarded.

**`shipments.total_price` is a generated column** (`GENERATED ALWAYS AS round(weight * price_per_kg, 2) STORED`). Sending it in an insert or update is a hard Postgres error, so `ShipmentInput` and `updateShipment`'s payload both `Omit` it — write `weight` and `price_per_kg` and let the DB derive the total. `ShipmentFormModal` mirrors the same expression client-side for the live preview only; if you change one, change both.

**Avatar uploads** — the `avatars` bucket is public-read, but the write policies require the object path to start with the caller's auth uid (`{auth.uid()}/…`). `profileService.uploadAvatar` follows this; any other upload path will be rejected.

**Edge functions** — three are live and called: `admin-create-user` (admin-gated: verifies `is_admin()` before the service-role client provisions the auth account; the `handle_new_auth_user` trigger creates the profile from `user_metadata`; `usersService.createDashboardUser` invokes it), `track-shipment` (public tracking, above), and `send-invoice-email` (`financeService.sendInvoiceEmail`). A fourth, `admin-users`, is still deployed but **no client code calls it** — it predates `admin-create-user` and its `create` action defaults an unrecognised role to `Admin`. Retire it rather than building on it.

## Supabase backend
Project ref `vvkztbxofacbzypxtslp`. Schema: `profiles`, `customers`, `countries`, `shipments`, `tracking_updates`, `quotes`, `invoices`, `payments`, `system_settings`, `activity_logs` — all with RLS enabled. Enums: `user_role`, `user_status`, `shipment_status` (9 stages), `shipping_method`, `cargo_type`, `quote_status`, `payment_status`, `invoice_status`, `payment_method`.

**Finance totals are trigger-derived; never write them by hand.** `payments` is the ledger of record. A payment change fires `sync_invoice_totals()`, which recomputes `invoices.amount_paid` and `status`, then rolls up into `shipments.payment_status`. `invoices.balance` is a generated column (`amount - amount_paid`). Consequently `Paid` and `Partially Paid` are *outcomes*, not states you set — only `Draft`, `Issued`, and `Void` are manual, which is why `InvoiceFormModal` offers just those three. `shipments.delivered_at` is likewise stamped by `stamp_delivered_at()` on the status change.

**Shipment status is derived from tracking events, never written directly.** The `sync_shipment_status()` trigger makes the latest `tracking_updates` row the sole source of truth for `shipments.status` and `current_location`. `status` is therefore only sent on **create** (the initial stage) — `ShipmentFormModal` omits it from every edit payload, because a manual edit would just be overwritten by the next scan event. To move a shipment along its route, insert a tracking event via `trackingHistoryService`; do not update `shipments.status` from the client.

**PostgREST caps every response at `[api] max_rows = 1000`**, regardless of how wide a
`.range()` you ask for — a "fetch all matching rows" query silently truncates rather than
erroring. Export paths must page through `fetchAllRows()` in [src/lib/exportBatch.ts](src/lib/exportBatch.ts);
`listShipmentsForExport`, `listInvoicesForExport`, and `listPaymentsForExport` already do.

The base schema was authored directly in the linked project (`…_core_schema`, which drops the prior `admin_users`/`customers` schema). Committed here: `add_system_settings`, `add_activity_logs`, `separate_users_and_customers` (the profiles/customers split), `add_shipment_pricing`, the operations set — `add_dispatcher_role`, `add_shipment_operations_fields`, `add_finance_invoices_and_payments`, `add_analytics_and_revenue_stats`, `add_delivery_proofs_bucket_and_customer_notes`, `harden_finance_function_grants` — and a later hardening/features pass — `fix_avatars_bucket_and_policies`, `clear_all_data_keep_admin`, `finance_admin_only_rls`, `prevent_payment_overpayment`, `secure_public_tracking_and_harden_rpcs`, `add_waybill_label_and_vat_fields`, `add_vat_override_and_receiver_signature`, `add_shipment_flight_number`, `add_customer_balances_overview` (+ `_filterable`), `sync_profile_email_on_auth_email_change`. To materialise the full base history without hand-transcription, `supabase link` + `supabase db pull`. **The repo migrations are not the source of truth — verify against the live DB (MCP or `db pull`) before assuming a function/table exists.**

**Shipment/invoice fields grew additively for the waybill & VAT workflow** — `shipments` gained `cn_number`, `branch_code`, `flight_number`, `booking_contact`; `invoices` gained `vat_rate`, `vat_amount`, `discount`, `receiver_signature_path`, `receiver_signed_at`. All are nullable — treat absence as "not captured yet", not an error state.

**Apply the migration before shipping client code that depends on it.** Writing a migration file is not applying it. A `select=*,customer:customers(...)` embed is resolved by PostgREST from a real foreign key, so if the table or FK is not live yet the request fails with **400 Bad Request** before auth is even considered. Read the status code as a diagnosis: 400 = the schema/relationship does not exist; 401/403 = it exists and RLS or the key rejected you.

Sanctioned SECURITY DEFINER RPCs (the cross-cutting reads): `is_admin()`, `is_ops()`, `current_profile_id()`, `current_customer_id()`, `track_shipment()`, `dashboard_stats()`, `analytics_report()`, `admin_users_overview()`, `customer_balances_overview()`, `suggest_tracking_number()`, `public_settings()`. `dashboard_stats()` admits both roles but returns `null` for every money key unless the caller is an Admin, so the client shape stays stable; `customer_balances_overview(p_customer_ids)` follows the same shape (money keys null for non-Admins) and is deliberately scoped to one page of ids so the Customers list never scans every customer's shipments; `analytics_report()` is Admin-only outright.

**Revoking EXECUTE from `anon` alone is a no-op** — Postgres grants EXECUTE to `PUBLIC` by default and `anon` inherits it, so you must `revoke ... from public`. Do *not* do this to `is_ops()`: the anon-facing `countries` SELECT policy calls it, and the 42501 raised while checking that policy surfaces as a misleading HTTP 401. See [supabase/README.md](supabase/README.md). After any schema change regenerate types: `supabase gen types typescript --linked > src/types/database.ts` (authoritative type source).

## Environment & deploy
- Client needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_*` vars are **inlined at build time**, so they must be set wherever the app is *built* — `.env.local` for local dev, and the host build env (Netlify → Site settings → Environment variables) for deploys. Changing them requires a rebuild + "Clear cache and deploy". [src/lib/supabase.ts](src/lib/supabase.ts) throws on startup if either is missing.
- SPA routing on Netlify relies on `public/_redirects` (`/* /index.html 200`); without it, direct loads/refreshes of routes 404.
