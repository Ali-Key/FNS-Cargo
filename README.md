# FSN Cargo

International freight and logistics platform for FSN Cargo, connecting Somalia with China,
Turkey, and Europe. One codebase ships two apps, split by route:

- **Public marketing site** (`/`, `/services`, `/tracking`, `/about`, `/contact`, `/privacy`, `/terms`)
  with a public shipment tracking lookup and a quote request form.
- **Operations console** (`/dashboard/*`), a staff-only back office for shipments, tracking
  events, customers, quote requests, invoices and payments, reports, and team accounts.

Everything is a single-page React app on the front, and Supabase (Postgres, Auth, Storage,
Edge Functions) on the back.

---

## 1. Tech stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS 3 (token driven, see `tailwind.config.js`) |
| Routing | React Router 7 |
| Backend | Supabase (Postgres + RLS, Auth, Storage, Edge Functions) |
| Forms | react-hook-form + zod |
| Charts | Recharts (dashboard only) |
| Icons | lucide-react |
| PDF documents | @react-pdf/renderer + jsbarcode |
| Visual QA | Playwright (`scripts/shoot.mjs`) |
| Hosting | Hostinger, Apache/LiteSpeed (SPA fallback via `public/.htaccess`) |

Path alias: `@/*` resolves to `src/*`.

---

## 2. Prerequisites

Install these before you start:

1. **Node.js 20 LTS or newer** (Vite 6 requires Node 18+, 20 is recommended).
   Check with `node -v`.
2. **npm 10+** (ships with Node 20). Check with `npm -v`.
3. **Git**. Check with `git --version`.
4. A **Supabase project** you can read credentials from. The app will not start without one.
5. Optional, only for database and edge function work: the **Supabase CLI**
   (`npm i -g supabase`, or see https://supabase.com/docs/guides/local-development).

---

## 3. Quick start (clone and run)

### Step 1. Clone the repository

```bash
git clone https://github.com/Ali-Key/FNS-Cargo.git
cd FNS-Cargo
```

### Step 2. Install dependencies

```bash
npm install
```

This installs both runtime and dev dependencies. The first install takes a few minutes
because Playwright and the PDF toolchain are large.

### Step 3. Create your environment file

Copy the template and fill in the two required values:

```bash
# macOS / Linux
cp .env.example .env.local
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env.local
```

Open `.env.local` and set:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-publishable-anon-key>
```

Where to find them: Supabase dashboard, **Project Settings, API**. Copy the *Project URL*
and the *anon / publishable* key. Never put the **service role** key in this file. It is a
server-only secret, and `VITE_*` values are compiled into the public JavaScript bundle.

> `src/lib/supabase.ts` throws on startup if either variable is missing, so a blank screen
> with a console error usually means the env file is missing or was added after the dev
> server started. Restart the dev server after editing `.env.local`.

### Step 4. Start the dev server

```bash
npm run dev
```

Open http://localhost:5173. The public site is available immediately.

### Step 5. Sign in to the console

Go to http://localhost:5173/login.

Self signup is disabled by design. A dashboard account must be provisioned by an existing
Admin (Settings, Team Accounts, Create user), or seeded directly in Supabase. To reach
`/dashboard/*` a user needs a row in `profiles` linked to their `auth.users` id with:

- `role` set to `Admin`, `Dispatcher`, or `Staff`
- `status` set to `Active`

Public customers are **not** dashboard users. They live in a separate `customers` table and
have no login.

### Step 6. Verify the build before pushing

```bash
npm run build
```

There is no test runner in this project. `npm run build` runs `tsc -b` first, so the
TypeScript type check is the safety net. Run it before every push.

---

## 4. npm scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port 5173 with hot reload |
| `npm run build` | Type check (`tsc -b`) then production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally (defaults to port 4173) |
| `npm run lint` | ESLint across the repo |
| `npm run shots` | Playwright full page screenshots, desktop and mobile, for visual QA |

### Using `npm run shots`

It screenshots an **already running** server and writes PNGs to `./.screenshots`.

```powershell
# Terminal 1: pin the port so it cannot drift
npx vite --port 5199 --strictPort

# Terminal 2 (PowerShell)
$env:BASE="http://localhost:5199"; npm run shots -- / /services
```

Notes:

- Run it from **PowerShell, not Git Bash**. Git Bash rewrites route arguments such as `/`
  into Windows paths, and Playwright then fails with "Cannot navigate to invalid URL".
- Always pass `BASE` explicitly. Vite silently increments the port when 5173 is taken.
- It only reaches unauthenticated pages. `/dashboard` captures the login redirect, so review
  console UI in a real browser session.

---

## 5. Project structure

```
FNS-Cargo/
├─ public/                 Static assets copied into dist/ as is
│  ├─ .htaccess            Apache/LiteSpeed SPA history fallback (required on Hostinger)
│  └─ brand/               Logo, mark, favicon
├─ scripts/
│  └─ shoot.mjs            Playwright screenshot helper
├─ src/
│  ├─ components/
│  │  ├─ ui/               Design primitives (Panel, Metric, Field, Table, Button, ...)
│  │  ├─ layout/           Console frame: DashboardShell, Sidebar, Topbar, navigation.ts
│  │  ├─ dashboard/        Chrome shared by every dashboard page (toolbar, export menu,
│  │  │                    command palette, responsive list, charts)
│  │  ├─ auth/             ProtectedRoute
│  │  ├─ shipments/ customers/ payments/ users/ settings/   Feature specific modals
│  │  └─ common/ tracking/ Public site chrome
│  ├─ pages/
│  │  ├─ Home, Services, Tracking, About, Contact, Privacy, Terms, NotFound   (public)
│  │  ├─ auth/Login
│  │  ├─ dashboard/Overview
│  │  ├─ shipments/{Shipments, ShipmentDetail}
│  │  ├─ tracking/TrackingUpdates
│  │  ├─ customers/Customers
│  │  ├─ quotes/Quotes
│  │  ├─ payments/Payments        (invoices and payments, Admin only)
│  │  ├─ reports/Analytics        (Admin only)
│  │  └─ settings/Settings        (profile, plus Admin bands for team and company)
│  ├─ services/            All Supabase reads and writes live here, one file per domain
│  ├─ lib/
│  │  ├─ supabase.ts       The single Supabase client
│  │  ├─ documents/        PDF documents (invoice, label, receipt, statement, report)
│  │  ├─ exports/          CSV and PDF export wiring per page
│  │  └─ exportBatch.ts    Pages past the PostgREST 1000 row cap
│  ├─ context/             AuthContext (session, profile, role flags)
│  ├─ hooks/               useCachedResource, useDebouncedValue, useDocumentTitle,
│  │                       useSystemSettings
│  ├─ layouts/             PublicLayout, DashboardLayout
│  ├─ types/database.ts    Generated Supabase types (authoritative)
│  ├─ utils/status.ts      Single source of shipment status labels, icons, colors
│  └─ App.tsx              Route table
├─ supabase/
│  ├─ config.toml          CLI config (ports, auth policy, function JWT gates)
│  ├─ migrations/          SQL migrations, applied in filename order
│  ├─ functions/           Edge functions (Deno)
│  └─ README.md            Backend notes, grants and RLS gotchas
├─ .env.example            Template for .env.local
├─ tailwind.config.js      Design tokens (both palettes)
└─ vite.config.ts          Build config and vendor chunk split
```

---

## 6. Routes and access

### Public (no login)

| Route | Page |
|---|---|
| `/` | Home |
| `/services` | Services |
| `/tracking` | Public shipment tracking lookup |
| `/about` | About |
| `/contact` | Contact and quote request form |
| `/privacy` | Privacy policy |
| `/terms` | Terms |
| `/login` | Console sign in |

### Console (`/dashboard/*`, requires an Active `Admin`, `Dispatcher`, or `Staff` profile)

| Route | Page | Roles |
|---|---|---|
| `/dashboard` | Overview | All console roles |
| `/dashboard/shipments` | Shipments list | All console roles |
| `/dashboard/shipments/:id` | Shipment detail | All console roles |
| `/dashboard/tracking` | Tracking updates | All console roles |
| `/dashboard/customers` | Customers | All console roles |
| `/dashboard/quotes` | Quote requests | All console roles |
| `/dashboard/payments` | Invoices and payments | Admin only |
| `/dashboard/analytics` | Reports | Admin only |
| `/dashboard/settings` | Settings (Team and Company bands are Admin only) | All console roles |

Every Admin-only route has a matching database gate. The UI check is convenience, not the
security boundary: finance is enforced by RLS policies calling `is_admin()`, and reports by
`analytics_report()` raising `42501` for non-admins.

Press **Cmd/Ctrl + K** anywhere in the console to open the command palette and post a
tracking update without leaving the current page.

---

## 7. Supabase backend

Linked project ref: `vvkztbxofacbzypxtslp`.

### Tables (all with RLS enabled)

`profiles`, `customers`, `countries`, `shipments`, `tracking_updates`, `quotes`, `invoices`,
`payments`, `system_settings`, `activity_logs`.

Enums: `user_role`, `user_status`, `shipment_status` (9 stages), `shipping_method`,
`cargo_type`, `quote_status`, `payment_status`, `invoice_status`, `payment_method`.

### SECURITY DEFINER functions

`is_admin()`, `is_ops()`, `current_profile_id()`, `current_customer_id()`,
`track_shipment()`, `dashboard_stats()`, `analytics_report()`, `admin_users_overview()`,
`customer_balances_overview()`, `suggest_tracking_number()`, `public_settings()`,
`admin_clear_pending_email_change()`.

### Edge functions (`supabase/functions/`)

| Function | Purpose | Secrets |
|---|---|---|
| `track-shipment` | The only public window into shipments. Service role key, per IP rate limiting, generic errors. | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-create-user` | Admin gated provisioning of a dashboard account | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| `admin-set-email` | Admin gated sign in address change with no confirmation email | Same as above |
| `send-invoice-email` | Emails an invoice to a customer | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| `admin-users` | Deprecated, no client code calls it. Retire rather than build on it. | n/a |

Deploy one:

```bash
supabase functions deploy track-shipment
supabase secrets set RESEND_API_KEY=... RESEND_FROM_EMAIL=...
```

### Working with the database

```bash
# Link this repo to the hosted project
supabase link --project-ref vvkztbxofacbzypxtslp

# Pull the full remote migration history into supabase/migrations
supabase db pull

# Push local migrations to the linked project
supabase db push

# Regenerate the TypeScript types after ANY schema change
supabase gen types typescript --linked > src/types/database.ts
```

The base schema was authored directly in the hosted project, so the files in
`supabase/migrations/` are **not** the complete history. Verify against the live database
before assuming a table or function exists.

### Rules the database enforces for you

- **`shipments.status` is derived from tracking events.** A trigger makes the latest
  `tracking_updates` row the source of truth. Status is only sent on create. To move a
  shipment along its route, insert a tracking event. Never update the status directly.
- **`shipments.total_price` is a generated column** (`weight * price_per_kg`). Sending it in
  an insert or update is a hard Postgres error.
- **Finance totals are trigger derived.** `payments` is the ledger of record. A payment
  change recomputes `invoices.amount_paid` and `status`, then rolls up into
  `shipments.payment_status`. `Paid` and `Partially Paid` are outcomes, not states you set.
  Only `Draft`, `Issued`, and `Void` are manual.
- **Exports must page.** PostgREST caps every response at 1000 rows, silently. Export paths
  go through `fetchAllRows()` in `src/lib/exportBatch.ts`.

---

## 8. Build and deploy (Hostinger)

The site is a static build. There is no Node server in production: you build locally and
upload the contents of `dist/` to the web root.

### Step 1. Make sure the env file is correct

`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are **inlined into the JavaScript at build
time**. They are read from `.env.local` on the machine that runs the build, never from the
host. Point them at the production Supabase project before building.

### Step 2. Build

```bash
npm install
npm run build
```

This type checks first, then writes the production build into `dist/`.

### Step 3. Upload

Upload **the contents of `dist/`**, not the folder itself, into the site root
(`public_html/` in hPanel File Manager or over FTP/SFTP). The result should look like:

```
public_html/
├─ .htaccess
├─ index.html
├─ assets/
└─ brand/
```

- `.htaccess` is a hidden file. Turn on **Show hidden files** in File Manager, or it will be
  missed and every route except `/` will 404.
- Replace the old `assets/` folder rather than merging into it, so stale hashed bundles do
  not pile up.

### Step 4. Verify

1. Load `/` and hard refresh (Ctrl + F5) to get past the browser cache.
2. Open `/services` **directly in the address bar** and refresh it. If it 404s, `.htaccess`
   is missing or `mod_rewrite` is off.
3. Run a tracking lookup on `/tracking` to confirm the Supabase keys were baked in.
4. Sign in at `/login` and open `/dashboard`.

### Why the SPA fallback is required

React Router owns every route in the browser. Apache looks each URL up on disk first, finds
no file at `/services`, and serves its own 404 unless `public/.htaccess` rewrites unknown
paths to `/index.html`. Vite copies that file into `dist/` automatically, so it only fails
when the upload silently skipped hidden files.

### Deploy checklist

1. `npm run build` passes locally with no type errors.
2. `.env.local` held the production Supabase URL and anon key at build time.
3. Any new migration has been applied to the live database first. Shipping client code that
   depends on an unapplied migration returns HTTP 400, not an auth error.
4. New edge functions are deployed and their secrets are set.
5. `.htaccess` is present in the web root after upload.

---

## 9. Conventions to follow when contributing

- **Never call `supabase` directly from a component.** Every domain read and write goes
  through a service in `src/services/`.
- **Keep the route split.** Every `/dashboard/*` page and `/login` is `lazy()` imported so
  Recharts and admin code never ship in the public bundle. After touching build config,
  confirm the public entry in `dist/index.html` preloads neither `vendor-charts` nor a PDF
  chunk.
- **Never hardcode colors in components.** Two palettes live in `tailwind.config.js`: the
  public site uses `navy-*` and `primary-*`, the console uses `deck-*`, `signal-*`, `canvas`,
  and `panel`. Recharts reads `DECK_HEX` from `src/utils/status.ts`.
- **Shipment status presentation lives in `src/utils/status.ts`.** Adding a status means
  extending the maps there, not styling it inline.
- **Reuse `Panel`, `Metric`, and `ResponsiveDataList`** rather than hand rolling containers
  or a new table and card split.
- **Never `await` a Supabase query inside the `onAuthStateChange` callback.** supabase-js
  holds its auth lock for the whole handler, so the query never resolves and legitimate
  admins get "No dashboard access". Defer any DB call with `setTimeout(fn, 0)`.

---

## 10. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| App throws on startup about missing env | `.env.local` missing, or added after the dev server started. Create it, then restart `npm run dev`. |
| Blank page after deploy | `.env.local` was empty or wrong when `npm run build` ran. Fix it, rebuild, re-upload. |
| Refreshing `/dashboard` returns 404 on the live site | `.htaccess` missing from the web root (hidden files skipped during upload) or `mod_rewrite` disabled. |
| Old version still loads after upload | Browser or host cache. Hard refresh (Ctrl + F5), and confirm the new `assets/` folder replaced the old one. |
| "No dashboard access" for a real admin | Profile row missing, `status` not `Active`, or an awaited query was reintroduced in `onAuthStateChange`. |
| HTTP 400 from a Supabase query | The table, column, or foreign key does not exist yet. Apply the migration. |
| HTTP 401 that looks like a bad API key | A policy calls a function `anon` lacks `EXECUTE` on. Postgres raises `42501` while checking the policy and PostgREST reports it as 401. Grant `EXECUTE`. |
| Export is missing rows | The query did not page through `fetchAllRows()`, so PostgREST truncated at 1000 rows. |
| Screenshots come out blank below the fold | The `reducedMotion: 'reduce'` flag or the `.reveal` CSS rule was removed. Both are required. |
| Playwright says "Cannot navigate to invalid URL" | `npm run shots` was run from Git Bash. Use PowerShell. |

---

## 11. Further reading

- [supabase/README.md](supabase/README.md) for backend notes, grants, and RLS gotchas.
- [HANDOVER.md](HANDOVER.md) for the ownership and handover checklist.
