-- Warehouse assignment: give the dispatcher's "which warehouse does this cargo
-- go through" question a real answer instead of a free-text box.
--
-- Before this migration `shipments.warehouse` was text typed by hand, with the
-- shipment form suggesting whatever strings other shipments already used. That
-- cannot express the rule the operation actually runs on — a warehouse belongs
-- to a country, and the origin country decides which warehouses are valid — so
-- "China Warehouse" could be booked on a shipment leaving Turkey and nothing
-- would notice.
--
-- What changes:
--   * `public.warehouses`, owned by `public.countries` (the served-market list
--     the shipment form already reads for Origin/Destination).
--   * `shipments.warehouse_id`, the actual relationship.
--   * `shipments.warehouse` stays, and is now maintained by trigger from the
--     linked row. It is the human-readable label the shipments list filter, the
--     search and the detail page already read; nothing that consumes it has to
--     change, and it can never drift from the link again.

-- ---- Table ----------------------------------------------------------------
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  -- A warehouse exists in exactly one served market. `restrict` because a
  -- country with a warehouse is not a country you delete by accident;
  -- deactivating it is the supported retirement path, same as for countries.
  country_id uuid not null references public.countries (id) on delete restrict,
  name text not null,
  city text,
  is_active boolean not null default true,
  sort_order smallint not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.warehouses is
  'Handling facilities, one per row, owned by the country they sit in. The shipment origin selects them.';
comment on column public.warehouses.name is
  'Human-readable name shown to dispatchers, e.g. "China Warehouse". Never an internal code.';
comment on column public.warehouses.is_active is
  'Retired warehouses stay for historical shipments but are never offered on a new booking.';

-- Two warehouses in one country may not share a name; the same name in two
-- different countries is fine ("Main Warehouse" in China and in Turkey).
create unique index if not exists warehouses_country_name_key
  on public.warehouses (country_id, lower(name));

create index if not exists warehouses_country_active_idx
  on public.warehouses (country_id, is_active);

-- ---- Shipment relationship ------------------------------------------------
alter table public.shipments
  add column if not exists warehouse_id uuid references public.warehouses (id) on delete restrict;

comment on column public.shipments.warehouse_id is
  'Warehouse handling the cargo. Must belong to the origin country; the label in `warehouse` is derived from it.';
comment on column public.shipments.warehouse is
  'Display label for warehouse_id, maintained by sync_shipment_warehouse_name(). Free text only on pre-2026-08 rows.';

create index if not exists shipments_warehouse_id_idx on public.shipments (warehouse_id);

-- ---- Label stays in step with the link ------------------------------------
-- The frontend sends `warehouse_id` alone. Everything that already reads the
-- text column keeps reading a correct value, and no caller can write a label
-- that contradicts the relationship.
create or replace function public.sync_shipment_warehouse_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.warehouse_id is distinct from old.warehouse_id then
    if new.warehouse_id is not null then
      select w.name into new.warehouse from public.warehouses w where w.id = new.warehouse_id;
    elsif tg_op = 'UPDATE' and old.warehouse_id is not null then
      -- The link was cleared deliberately, so the label it produced goes too.
      new.warehouse := null;
    end if;
    -- Remaining case: no link before, no link now. A legacy hand-typed label is
    -- left exactly as it is, so editing an old shipment never erases its data.
  end if;
  return new;
end $$;

drop trigger if exists shipments_sync_warehouse_name on public.shipments;
create trigger shipments_sync_warehouse_name
  before insert or update of warehouse_id on public.shipments
  for each row execute function public.sync_shipment_warehouse_name();

-- Nothing but the trigger should call it, and Postgres grants EXECUTE to PUBLIC
-- by default, which would expose it as a PostgREST RPC. Trigger-function
-- privileges are checked at CREATE TRIGGER time, so the trigger keeps firing.
revoke execute on function public.sync_shipment_warehouse_name() from public, anon, authenticated;

-- ---- RLS ------------------------------------------------------------------
-- Warehouses are internal operational geography, not public information: a
-- signed-in customer tracking a parcel has no business enumerating the
-- facilities. Reads are ops-only (Admin, Dispatcher, Staff), writes Admin-only,
-- matching how `countries` is governed.
alter table public.warehouses enable row level security;

drop policy if exists "Ops read warehouses" on public.warehouses;
drop policy if exists "Admins insert warehouses" on public.warehouses;
drop policy if exists "Admins update warehouses" on public.warehouses;
drop policy if exists "Admins delete warehouses" on public.warehouses;

create policy "Ops read warehouses" on public.warehouses
  for select to authenticated using (public.is_ops());

create policy "Admins insert warehouses" on public.warehouses
  for insert to authenticated with check (public.is_admin());

create policy "Admins update warehouses" on public.warehouses
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "Admins delete warehouses" on public.warehouses
  for delete to authenticated using (public.is_admin());

-- Table privileges are the outer gate; the policies above are the boundary.
-- anon is given nothing at all — the public site never touches this table.
grant select, insert, update, delete on public.warehouses to authenticated;
revoke all on public.warehouses from anon;

-- ---- Seed -----------------------------------------------------------------
-- One warehouse per served market, in that market's hub city, so the form has
-- a correct answer for every origin from the moment this lands. An
-- administrator can add a second warehouse to a country later; the form
-- switches to a picker on its own when one exists.
insert into public.warehouses (country_id, name, city, is_active, sort_order)
select c.id, c.name || ' Warehouse', c.hub_city, true, c.sort_order
from public.countries c
where c.is_active
  and not exists (select 1 from public.warehouses w where w.country_id = c.id);

-- ---- Backfill -------------------------------------------------------------
-- Existing shipments whose hand-typed label already names a warehouse of their
-- origin country get the real link. Anything else keeps its text untouched and
-- is linked the next time someone edits it.
update public.shipments s
set warehouse_id = w.id
from public.warehouses w
join public.countries c on c.id = w.country_id
where s.warehouse_id is null
  and s.warehouse is not null
  and lower(btrim(s.warehouse)) = lower(w.name)
  and lower(btrim(s.origin)) = lower(c.name);
