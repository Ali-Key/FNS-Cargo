-- 20260726090200_tables.sql
-- Core schema. UUID PKs, explicit FKs with deliberate ON DELETE behaviour,
-- CHECK constraints mirroring the app's TypeScript unions, and NOT NULL where
-- the frontend Insert type requires a value.

-- ---------------------------------------------------------------------------
-- admin_users — links a Supabase auth user to a dashboard role.
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  id         uuid primary key default extensions.gen_random_uuid(),
  user_id    uuid not null unique references auth.users (id) on delete cascade,
  role       text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);
comment on table public.admin_users is 'Dashboard access + role for an auth user. No row = no dashboard access.';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id         uuid primary key default extensions.gen_random_uuid(),
  full_name  text not null,
  email      text,
  phone      text,
  address    text,
  city       text,
  country    text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- shipments
--   customer_id  : RESTRICT so deleting a customer with shipments fails loudly
--                  (the UI catches the FK error and shows "Customer is in use").
--   assigned_to  : SET NULL so revoking a staff member never deletes shipments.
-- ---------------------------------------------------------------------------
create table if not exists public.shipments (
  id                 uuid primary key default extensions.gen_random_uuid(),
  tracking_number    text not null unique,
  reference_number   text,
  customer_id        uuid references public.customers (id) on delete restrict,
  assigned_to        uuid references public.admin_users (id) on delete set null,
  sender_name        text not null,
  sender_phone       text,
  receiver_name      text not null,
  receiver_phone     text,
  origin             text not null,
  destination        text not null,
  shipping_method    text not null check (shipping_method in ('air', 'sea', 'road')),
  weight_kg          numeric(12, 2) not null check (weight_kg >= 0),
  pieces             integer not null default 1 check (pieces >= 1),
  declared_value     numeric(14, 2) check (declared_value >= 0),
  status             text not null default 'pending'
                       check (status in ('pending', 'in_transit', 'delivered', 'delayed', 'cancelled')),
  estimated_delivery date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
comment on column public.shipments.reference_number is 'Optional secondary lookup key; unique among non-null values.';
comment on column public.shipments.assigned_to is 'admin_users.id of the owning staff member; drives staff write RLS.';

-- ---------------------------------------------------------------------------
-- shipment_tracking_history — the public timeline.
-- ---------------------------------------------------------------------------
create table if not exists public.shipment_tracking_history (
  id          uuid primary key default extensions.gen_random_uuid(),
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  status      text not null,
  location    text not null,
  description text,
  event_time  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- activity_logs — append-only audit trail. No updated_at (immutable).
-- ---------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id          uuid primary key default extensions.gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- system_settings — single-row company config. The `lock` column + unique
-- constraint guarantees exactly one row can ever exist.
-- ---------------------------------------------------------------------------
create table if not exists public.system_settings (
  id                      uuid primary key default extensions.gen_random_uuid(),
  lock                    char(1) not null default 'X' unique check (lock = 'X'),
  company_name            text not null default 'FNS Cargo',
  company_email           text not null default '',
  company_phone           text not null default '',
  company_address         text not null default '',
  company_website         text not null default '',
  logo_url                text,
  default_shipping_method text not null default 'sea' check (default_shipping_method in ('air', 'sea', 'road')),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tracking_lookups — one row per public tracking hit, IP hashed (never raw).
-- Feeds the rate limiter; purged on a schedule.
-- ---------------------------------------------------------------------------
create table if not exists public.tracking_lookups (
  id              uuid primary key default extensions.gen_random_uuid(),
  tracking_number text not null,
  ip_hash         text not null,
  looked_up_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tracking_number_counters — per-year sequence backing FNS-YYYY-NNNNNN.
-- ---------------------------------------------------------------------------
create table if not exists public.tracking_number_counters (
  year     integer primary key,
  last_seq integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Archive tables — same shape as their live counterparts (plus archived_at).
-- Terminal shipments older than 24 months are moved here; public tracking of
-- archived shipments still works because track_shipment() searches both.
-- ---------------------------------------------------------------------------
create table if not exists public.shipments_archive (
  like public.shipments including defaults including constraints,
  archived_at timestamptz not null default now()
);

create table if not exists public.shipment_tracking_history_archive (
  like public.shipment_tracking_history including defaults including constraints,
  archived_at timestamptz not null default now()
);
