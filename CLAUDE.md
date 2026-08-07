# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Working Style
- Work on ONE task only; read ONLY the files needed. Never analyze the whole project unless requested.
- Make the smallest possible change; preserve existing architecture and don't refactor unrelated code.
- Reuse existing components (`src/components/ui`) rather than adding new primitives.
- Keep responses under 150 words unless asked; don't explain code unless requested. If info is missing, ask one short question.
- Fix spacing/grammar/consistency automatically. UI is mobile-first and token-driven: deep navy (`navy-900`) primary, blue (`primary-500`) primary — the same palette as the live site. Never hardcode hex colors in components; change the theme in `tailwind.config.js` so both the public site and dashboard follow. The main conversion CTA uses `variant="primary"` on light backgrounds; avoid em-dashes in visible copy.
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
React 18 + Vite 6 + TypeScript + Tailwind + React Router 7 + Supabase. Forms use react-hook-form + zod; charts use Recharts (dashboard only); icons via lucide-react. Path alias `@/*` → `src/*`.

Two near-identical debounce hooks exist: **`useDebouncedValue` is the live one** (search on every admin list page); `useDebounce.ts` is unreferenced. Import the former; don't add a third.

Public sections are wrapped in `Reveal` (scroll-triggered fade-up). It renders its children at opacity 0 until intersected, so a section can look **blank in a screenshot** that captured before the observer fired — scroll or re-shoot before concluding a section is broken.

## Architecture

**Two apps in one bundle, split by route** ([src/App.tsx](src/App.tsx)):
- **Public marketing site** — eager-loaded under `PublicLayout` (`/`, `/services`, `/tracking`, `/about`, `/contact`, `/privacy`, `/terms`).
- **Admin dashboard** — every `/dashboard/*` page and `/login` is `lazy()`-imported so Recharts and admin code never ship in the public chunk. Keep this split: import admin pages lazily.

`vite.config.ts` additionally splits `node_modules` into named vendor chunks (`vendor-react`, `vendor-router`, `vendor-supabase`, `vendor-charts`, `vendor-forms`, `vendor-motion`). This is what keeps Recharts (~330 kB) out of the public entry and lets vendor bundles stay cached across content deploys. Verify the split survives after touching build config: `vendor-charts` must not be a dependency of the public entry.

**Auth & authorization** — `AuthContext` holds the Supabase session; being signed in is not enough. It reads the caller's own row from the `profiles` table (RLS: `auth_user_id = auth.uid()`) and exposes `profile`, `isAdmin`, `isOps`, `unauthorized`, `profileError`, and `refreshProfile()`. Roles are `Admin` | `Dispatcher` | `Staff`. `isAdmin` is true only when `role === 'Admin' && status === 'Active'`; `isOps` is true for any of the three roles when Active, and mirrors the database's `is_ops()` RLS gate (`role in ('Admin','Dispatcher','Staff')`).

`profiles` holds **dashboard accounts only**. Public customers are a separate `customers` table with no role column and no dashboard access; `shipments.customer_id` and `quotes.customer_id` reference `customers(id)`. Never filter `profiles` by a customer role — it no longer exists.

`ProtectedRoute` ([src/components/auth/ProtectedRoute.tsx](src/components/auth/ProtectedRoute.tsx)) **requires `isOps` for every route it wraps** (all of `/dashboard/*`), and `allow={['Admin']}` narrows the admin-only areas: Finance (Payments, Invoices), Analytics, Users, Settings. Dispatchers and Staff both get Overview, Shipments, Tracking, Customers, and Quotes — Finance/Analytics/Users/Settings are Admin-only regardless of which non-Admin role it is. There is still no customer-facing portal — `customers` is a separate table with no dashboard access.

**Every `allow={['Admin']}` route has a matching database gate; the UI check is convenience, not the boundary.** Finance is enforced by the `invoices`/`payments` RLS policies (`is_admin()`), Analytics by `analytics_report()` raising `42501`. Adding an admin-only page means adding the DB gate too, not just the route prop.

`ProtectedRoute` distinguishes three failure states, and they must stay distinct: no session → redirect to `/login`; `profileError` (lookup failed) → retry screen; profile resolved but not an active Admin → "No dashboard access". Collapsing a failed lookup into the denial screen makes an infrastructure fault look like a permissions decision.

> **Never `await` a Supabase query inside the `onAuthStateChange` callback.** supabase-js holds its auth lock (navigator LockManager) for the whole handler, so a query issued there can never resolve — the profile stays null, `isAdmin` stays false, and legitimate admins get "No dashboard access". Do only synchronous state updates in the handler and defer any DB call with `setTimeout(fn, 0)`. `signIn()` also resolves the profile itself so navigation does not race the auth event. This was a real bug; do not reintroduce it by "simplifying" the callback.

A class `ErrorBoundary` ([src/components/common/ErrorBoundary.tsx](src/components/common/ErrorBoundary.tsx)) wraps the whole tree in `main.tsx` so a render fault shows a reload screen instead of a blank page.

**Data layer** — components never call `supabase` directly for domain data. All reads/writes go through `src/services/*Service.ts` (shipments, customers, quotes, dashboard, settings, users, tracking, activity), which wrap the client in [src/lib/supabase.ts](src/lib/supabase.ts). Add new queries as service functions.

**Stale-while-revalidate caching, not `useEffect`-on-mount, for read-heavy pages.** `AuthContext` caches the resolved profile in `localStorage` (`fns.auth.profile`) and [useCachedResource](src/hooks/useCachedResource.ts) (`fns.cache.*`) generalizes the same pattern for page data (currently `Overview.tsx`'s dashboard summary): a cached copy paints instantly from `localStorage` — shared across tabs, so a second tab reuses what the first already fetched instead of re-querying — while a background request silently revalidates it; a failed background revalidation keeps the last good data on screen rather than clearing it. This is a rendering hint only, never a trust boundary: every real read still goes through the same RLS-gated query. `clearAllCachedResources()` runs on sign-out so a shared machine never paints one account's cached data for the next. When adding a new data-heavy dashboard page, prefer wrapping its fetch in `useCachedResource` over a bare `useEffect` fetch.

**Public tracking is deliberately locked down** — the only public window into shipments is the `track_shipment(p_tracking_number)` RPC (SECURITY DEFINER, returns a fixed safe field set + `events[]` timeline, never PII; unknown number → `null`). `trackingService.ts` calls this RPC directly.

**Public writes go through RLS-shaped service calls** — the contact page submits a real row into `quotes` via `quotesService.submitQuote`. That insert must NOT chain `.select()`: the `anon` role has an INSERT policy but no SELECT policy on `quotes`, so asking for the row back fails RLS. Same shape applies to any future public write.

**A policy is only as reachable as the functions it calls.** The `quotes` INSERT policy evaluates `current_customer_id()`; if `anon` lacks `EXECUTE` on a function a policy references, Postgres raises `42501` while *checking the policy*, and PostgREST returns it as **HTTP 401** — which reads like a bad API key and sends you hunting through env vars and sessions instead of grants. Grant `EXECUTE` to `anon` on every SECURITY DEFINER helper an anon-facing policy touches.

`quotes` columns are fixed: `full_name`, `email`, `phone`, `origin`, `destination`, `cargo_type`, `weight`, `message`, `status`. `origin` and `destination` are NOT NULL, so the contact form cannot drop them. There is no `service` or `subject` column — anything like that has to be folded into `message` or added by migration first, or it is silently discarded.

**`shipments.total_price` is a generated column** (`GENERATED ALWAYS AS round(weight * price_per_kg, 2) STORED`). Sending it in an insert or update is a hard Postgres error, so `ShipmentInput` and `updateShipment`'s payload both `Omit` it — write `weight` and `price_per_kg` and let the DB derive the total. `ShipmentFormModal` mirrors the same expression client-side for the live preview only; if you change one, change both.

**Avatar uploads** — the `avatars` bucket is public-read, but the write policies require the object path to start with the caller's auth uid (`{auth.uid()}/…`). `profileService.uploadAvatar` follows this; any other upload path will be rejected.

**Edge functions** — the only one is `admin-create-user` (admin-gated: verifies `is_admin()` before the service-role client provisions the auth account; the `handle_new_auth_user` trigger creates the profile from `user_metadata`). `usersService.createDashboardUser` invokes it.

## Supabase backend
Project ref `vvkztbxofacbzypxtslp`. Schema: `profiles`, `customers`, `countries`, `shipments`, `tracking_updates`, `quotes`, `invoices`, `payments`, `system_settings`, `activity_logs` — all with RLS enabled. Enums: `user_role`, `user_status`, `shipment_status` (9 stages), `shipping_method`, `cargo_type`, `quote_status`, `payment_status`, `invoice_status`, `payment_method`.

**Finance totals are trigger-derived; never write them by hand.** `payments` is the ledger of record. A payment change fires `sync_invoice_totals()`, which recomputes `invoices.amount_paid` and `status`, then rolls up into `shipments.payment_status`. `invoices.balance` is a generated column (`amount - amount_paid`). Consequently `Paid` and `Partially Paid` are *outcomes*, not states you set — only `Draft`, `Issued`, and `Void` are manual, which is why `InvoiceFormModal` offers just those three. `shipments.delivered_at` is likewise stamped by `stamp_delivered_at()` on the status change.

**Delivery proofs live in a private `delivery-proofs` bucket**, so `shipments.delivery_proof_url` stores an *object path*, not a URL. Read it through `getDeliveryProofUrl()`, which mints a 5-minute signed URL. Rendering the column directly in an `<img src>` will 400.

The base schema was authored directly in the linked project (`…_core_schema`, which drops the prior `admin_users`/`customers` schema). Committed here: `add_system_settings`, `add_activity_logs`, `separate_users_and_customers` (the profiles/customers split), `add_shipment_pricing`, and the operations set — `add_dispatcher_role`, `add_shipment_operations_fields`, `add_finance_invoices_and_payments`, `add_analytics_and_revenue_stats`, `add_delivery_proofs_bucket_and_customer_notes`, `harden_finance_function_grants`. To materialise the full base history without hand-transcription, `supabase link` + `supabase db pull`. **The repo migrations are not the source of truth — verify against the live DB (MCP or `db pull`) before assuming a function/table exists.**

**Apply the migration before shipping client code that depends on it.** Writing a migration file is not applying it. A `select=*,customer:customers(...)` embed is resolved by PostgREST from a real foreign key, so if the table or FK is not live yet the request fails with **400 Bad Request** before auth is even considered. Read the status code as a diagnosis: 400 = the schema/relationship does not exist; 401/403 = it exists and RLS or the key rejected you.

Sanctioned SECURITY DEFINER RPCs (the cross-cutting reads): `is_admin()`, `is_ops()`, `current_profile_id()`, `current_customer_id()`, `track_shipment()`, `dashboard_stats()`, `analytics_report()`, `admin_users_overview()`, `suggest_tracking_number()`, `public_settings()`. `dashboard_stats()` admits both roles but returns `null` for every money key unless the caller is an Admin, so the client shape stays stable; `analytics_report()` is Admin-only outright.

**Revoking EXECUTE from `anon` alone is a no-op** — Postgres grants EXECUTE to `PUBLIC` by default and `anon` inherits it, so you must `revoke ... from public`. Do *not* do this to `is_ops()`: the anon-facing `countries` SELECT policy calls it, and the 42501 raised while checking that policy surfaces as a misleading HTTP 401. See [supabase/README.md](supabase/README.md). After any schema change regenerate types: `supabase gen types typescript --linked > src/types/database.ts` (authoritative type source).

## Environment & deploy
- Client needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `VITE_*` vars are **inlined at build time**, so they must be set wherever the app is *built* — `.env.local` for local dev, and the host build env (Netlify → Site settings → Environment variables) for deploys. Changing them requires a rebuild + "Clear cache and deploy". [src/lib/supabase.ts](src/lib/supabase.ts) throws on startup if either is missing.
- SPA routing on Netlify relies on `public/_redirects` (`/* /index.html 200`); without it, direct loads/refreshes of routes 404.
