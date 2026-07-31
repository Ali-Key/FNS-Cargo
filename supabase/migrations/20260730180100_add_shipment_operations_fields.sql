-- Operational fields the control-centre UI needs: warehouse, assigned
-- dispatcher, live location, payment state and delivery proof.

create type public.payment_status as enum ('Unpaid', 'Partially Paid', 'Paid', 'Refunded');

alter table public.shipments
  add column if not exists warehouse text,
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists current_location text,
  add column if not exists payment_status public.payment_status not null default 'Unpaid',
  add column if not exists delivery_proof_url text,
  add column if not exists delivered_at timestamptz;

comment on column public.shipments.assigned_to is
  'Dashboard profile responsible for this shipment. Null = unassigned.';
comment on column public.shipments.current_location is
  'Last known physical location; kept in sync from the latest tracking update.';
comment on column public.shipments.payment_status is
  'Derived from invoices by sync_shipment_payment_status(); do not set by hand.';

create index if not exists shipments_assigned_to_idx on public.shipments (assigned_to);
create index if not exists shipments_payment_status_idx on public.shipments (payment_status);
create index if not exists shipments_created_at_idx on public.shipments (created_at desc);

-- Stamp delivered_at exactly once, when a shipment first reaches Delivered.
create or replace function public.stamp_delivered_at()
returns trigger
language plpgsql
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.status = 'Delivered' and new.delivered_at is null then
    new.delivered_at := now();
  elsif new.status <> 'Delivered' then
    new.delivered_at := null;
  end if;
  return new;
end;
$$;

revoke execute on function public.stamp_delivered_at() from public, anon, authenticated;

drop trigger if exists shipments_stamp_delivered_at on public.shipments;
create trigger shipments_stamp_delivered_at
  before insert or update of status on public.shipments
  for each row execute function public.stamp_delivered_at();

-- The latest tracking event is the shipment's current location. sync_shipment_status()
-- already copies the status across; extend the same trigger to carry location too.
create or replace function public.sync_shipment_status()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_shipment_id uuid := coalesce(new.shipment_id, old.shipment_id);
  v_status public.shipment_status;
  v_location text;
begin
  select t.status, nullif(btrim(t.city || ', ' || t.country), ', ')
    into v_status, v_location
    from public.tracking_updates t
   where t.shipment_id = v_shipment_id
   order by t.date desc, t.time desc, t.created_at desc
   limit 1;

  if v_status is not null then
    update public.shipments
       set status = v_status,
           current_location = coalesce(v_location, current_location)
     where id = v_shipment_id
       and (status is distinct from v_status
            or current_location is distinct from coalesce(v_location, current_location));
  end if;
  return null;
end;
$$;

-- Backfill current_location for shipments that already have tracking events.
update public.shipments s
   set current_location = t.loc
  from (
    select distinct on (shipment_id) shipment_id, city || ', ' || country as loc
      from public.tracking_updates
     order by shipment_id, date desc, time desc, created_at desc
  ) t
 where t.shipment_id = s.id and s.current_location is null;
