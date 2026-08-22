-- Branch code is issued by the system, never typed.
--
-- Before this migration `shipments.branch_code` was a free-text Combobox: the
-- form read whatever strings other shipments already used, pre-filled the one
-- from the newest booking, and let the operator type anything matching
-- "GZ2025". That is not a branch — it is a guess about a branch, and nothing
-- tied it to the facility the cargo actually moved through, so a booking
-- handled in Mogadishu could be labelled GZ2025 and print a wrong waybill.
--
-- The branch relationship already exists in this schema. A shipment is linked
-- to a `warehouse` (20260822230000_warehouse_assignment.sql), a warehouse
-- belongs to a `country`, and the shipment origin decides which warehouses are
-- valid. The handling facility IS the branch. So the branch gets a code of its
-- own on `warehouses`, and `shipments.branch_code` becomes what
-- `shipments.warehouse` already is: a printed label maintained by trigger from
-- the link, never writable by a client.
--
-- The foreign key stays `shipments.warehouse_id`. No new relationship, no
-- second branch field, nothing hardcoded in the frontend.

-- ---- The branch's own code ------------------------------------------------
alter table public.warehouses
  add column if not exists code text;

comment on column public.warehouses.code is
  'Branch code printed on the waybill for cargo handled here, e.g. MOG. Assigned to the facility, never to a shipment.';

-- Backfill: derive each existing branch's code from where it stands. The city
-- is the branch's identity to an operator ("Mogadishu" -> MOG); a warehouse
-- with no city falls back to its country hub, then to the country name. This
-- runs once, on rows that have no code — it is a starting value an
-- administrator can change, not a rule the application re-applies.
do $$
declare
  r record;
  v_base text;
  v_code text;
  v_n int;
begin
  for r in
    select w.id, w.city, c.hub_city, c.name as country_name, c.code as country_code
    from public.warehouses w
    join public.countries c on c.id = w.country_id
    where w.code is null
    order by w.sort_order, w.name
  loop
    -- Letters only, so "Osla" -> OSL and a city with punctuation still yields a
    -- clean code.
    v_base := regexp_replace(
      upper(coalesce(nullif(btrim(r.city), ''), nullif(btrim(r.hub_city), ''), r.country_name)),
      '[^A-Z]', '', 'g'
    );
    v_base := left(v_base, 3);
    -- Nothing usable came out of the place name (a city written in a
    -- non-Latin script, say). The ISO country code is always there.
    if length(v_base) < 2 then
      v_base := upper(btrim(r.country_code));
    end if;

    -- Two branches must not share a code, and two cities can start with the
    -- same three letters. The first one keeps the clean code.
    v_code := v_base;
    v_n := 1;
    while exists (select 1 from public.warehouses where upper(code) = v_code) loop
      v_n := v_n + 1;
      v_code := v_base || v_n::text;
    end loop;

    update public.warehouses set code = v_code where id = r.id;
  end loop;
end $$;

-- Only now that every row has one: a branch without a code cannot issue one,
-- which is exactly the case the application must refuse rather than paper over.
alter table public.warehouses
  alter column code set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.warehouses'::regclass and conname = 'warehouses_code_format_check'
  ) then
    alter table public.warehouses
      add constraint warehouses_code_format_check check (code ~ '^[A-Z0-9]{2,6}$');
  end if;
end $$;

-- One code, one branch — the whole point of printing it on a waybill.
create unique index if not exists warehouses_code_upper_key
  on public.warehouses (upper(code));

-- ---- The shipment's code follows the link ---------------------------------
comment on column public.shipments.branch_code is
  'Display label for the branch handling the cargo, maintained by sync_shipment_warehouse_link() from warehouse_id. Free text only on pre-2026-08 rows.';

/**
 * Keep the two labels a shipment carries — warehouse name and branch code — in
 * step with the warehouse it is actually linked to.
 *
 * Replaces sync_shipment_warehouse_name(), which did this for the name alone.
 * The trigger now also fires when a client sends `warehouse` or `branch_code`
 * directly, so a hand-written value on a linked shipment is overwritten by the
 * truth rather than accepted.
 *
 * A shipment with no link is left exactly as it is: bookings made before this
 * relationship existed keep the code someone typed on them, and editing one
 * never erases it.
 */
create or replace function public.sync_shipment_warehouse_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_code text;
begin
  if new.warehouse_id is not null then
    select w.name, w.code into v_name, v_code
    from public.warehouses w
    where w.id = new.warehouse_id;

    -- The foreign key makes this unreachable in practice; raising rather than
    -- writing NULLs means a broken link can never print a blank waybill.
    if v_name is null then
      raise exception 'Warehouse % no longer exists, so no branch code can be issued', new.warehouse_id
        using errcode = '23503';
    end if;

    new.warehouse := v_name;
    new.branch_code := v_code;

  elsif tg_op = 'UPDATE' and old.warehouse_id is not null then
    -- The link was cleared deliberately, so both labels it produced go too.
    new.warehouse := null;
    new.branch_code := null;
  end if;

  return new;
end $$;

revoke execute on function public.sync_shipment_warehouse_link() from public, anon, authenticated;

drop trigger if exists shipments_sync_warehouse_name on public.shipments;
drop trigger if exists shipments_sync_warehouse_link on public.shipments;

create trigger shipments_sync_warehouse_link
  before insert or update of warehouse_id, warehouse, branch_code on public.shipments
  for each row execute function public.sync_shipment_warehouse_link();

-- The old single-purpose function has no callers left.
drop function if exists public.sync_shipment_warehouse_name();

-- ---- Backfill -------------------------------------------------------------
-- Shipments already linked to a warehouse but carrying no branch code get the
-- one their branch issues. A shipment that has a hand-typed code keeps it: it
-- was printed on a waybill that is already out in the world, and it is brought
-- in line the next time someone saves the booking.
update public.shipments s
set branch_code = w.code
from public.warehouses w
where s.warehouse_id = w.id
  and nullif(btrim(coalesce(s.branch_code, '')), '') is null;
