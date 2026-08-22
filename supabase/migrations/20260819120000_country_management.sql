-- Country management: make public.countries the single source of truth for the
-- served-market list that the shipment form, the tracking form and the public
-- site all read.
--
-- Nothing here recreates the table. The core schema already owns its shape
-- (id, name, code, hub_city, lane, is_active, sort_order, created_at); this
-- migration only adds the integrity guards, the admin-only write policies and
-- the grants that let an Admin manage the list from Settings, plus the seed
-- rows the application used to carry as a hardcoded array.

-- ---- Integrity ------------------------------------------------------------
-- Case-insensitive uniqueness on both the display name and the code, so
-- "turkey" cannot be added alongside "Turkey". Guarded rather than
-- `create ... if not exists`, because an equivalent index authored under a
-- different name would otherwise be duplicated.
do $$
begin
  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'countries'
      and indexdef ilike '%unique%' and indexdef ilike '%lower(name%'
  ) then
    create unique index countries_name_lower_key on public.countries (lower(name));
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public' and tablename = 'countries'
      and indexdef ilike '%unique%' and indexdef ilike '%upper(code%'
  ) then
    create unique index countries_code_upper_key on public.countries (upper(code));
  end if;
end $$;

-- ---- RLS ------------------------------------------------------------------
alter table public.countries enable row level security;

-- The SELECT side is untouched: "Anyone reads active countries"
-- (20260730180000_add_dispatcher_role.sql) already exposes active rows to anon
-- for the public site and the full list to ops for the console.
--
-- Writes are Admin-only. Dispatchers and Staff read the list to book freight;
-- changing which markets FSN Cargo serves is an owner decision.
drop policy if exists "Admins manage countries" on public.countries;
drop policy if exists "Admins insert countries" on public.countries;
drop policy if exists "Admins update countries" on public.countries;
drop policy if exists "Admins delete countries" on public.countries;

create policy "Admins insert countries" on public.countries
  for insert to authenticated with check (public.is_admin());

create policy "Admins update countries" on public.countries
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete countries" on public.countries
  for delete to authenticated using (public.is_admin());

-- Table privileges are the outer gate; RLS above is the real boundary. anon
-- keeps SELECT only — it can never reach a write path even in principle.
grant select on public.countries to anon, authenticated;
grant insert, update, delete on public.countries to authenticated;
revoke insert, update, delete on public.countries from anon;

-- A policy that calls a function the caller cannot execute raises 42501 during
-- the policy check, which PostgREST returns as a misleading 401. is_admin() is
-- already used by the finance policies; this only makes the grant explicit.
grant execute on function public.is_admin() to authenticated;

-- ---- Seed -----------------------------------------------------------------
-- The markets the application previously hardcoded in ShipmentFormModal and on
-- the home page. Seeded here, not in the frontend, so an administrator can add
-- to them or retire one without a code change.
-- 20260802120000_clear_all_data_keep_admin.sql emptied this table; without
-- these rows the shipment form would open with no selectable route.
insert into public.countries (name, code, hub_city, lane, is_active, sort_order)
values
  ('Somalia', 'SO', 'Mogadishu',  'Horn of Africa', true, 10),
  ('China',   'CN', 'Guangzhou',  'Asia',           true, 20),
  ('Turkey',  'TR', 'Istanbul',   'Europe',         true, 30),
  ('Sweden',  'SE', 'Stockholm',  'Nordics',        true, 40),
  ('Finland', 'FI', 'Helsinki',   'Nordics',        true, 50),
  ('Norway',  'NO', 'Oslo',       'Nordics',        true, 60),
  ('Denmark', 'DK', 'Copenhagen', 'Nordics',        true, 70)
on conflict do nothing;

comment on table public.countries is
  'Served markets. Single source of truth for every country selector in the app: '
  'active rows feed the shipment form, the tracking form and the public site; '
  'inactive rows stay visible to admins in Settings > Countries. Admin-only writes.';
