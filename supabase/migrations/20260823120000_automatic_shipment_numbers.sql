-- Tracking and cargo numbers are issued by the database, never typed.
--
-- Two things were wrong before this:
--   1. suggest_tracking_number() still handed out the old FNS- prefix. The
--      brand is FSN, so every number booked so far reads wrong on the waybill.
--   2. The cargo number (CN) was a client-side guess -- the form read the
--      highest cn_number in use and added one. Two operators booking at the
--      same moment both read the same highest value and both got the same CN.
--
-- Both numbers now come from a counter table incremented inside the insert, so
-- two concurrent bookings can never be handed the same value: the second
-- INSERT ... ON CONFLICT DO UPDATE blocks on the row lock and increments the
-- value the first one committed. The unique indexes stay as the final guard.

create table if not exists public.shipment_number_counters (
  kind       text not null,
  year       int  not null,
  last_value int  not null default 0,
  primary key (kind, year),
  constraint shipment_number_counters_kind_check check (kind in ('tracking', 'cn'))
);

comment on table public.shipment_number_counters is
  'Last number issued per series per year. Written only by next_shipment_number().';

-- No policies, by design: the counters are reachable only through the
-- SECURITY DEFINER functions below, so no client can issue itself a number.
alter table public.shipment_number_counters enable row level security;
revoke all on table public.shipment_number_counters from anon, authenticated;

-- Continue the series already in use this year rather than restarting at 1.
-- Legacy FNS- numbers count towards the tracking series: the prefix changes but
-- the sequence does not, so FNS-2026-000001 is followed by FSN-2026-000002.
insert into public.shipment_number_counters (kind, year, last_value)
select
  'tracking',
  extract(year from now())::int,
  coalesce(
    max((substring(upper(s.tracking_number) from '^(?:FSN|FNS)-[0-9]{4}-([0-9]{6})$'))::int),
    0
  )
from public.shipments s
where upper(s.tracking_number) ~ ('^(FSN|FNS)-' || to_char(now(), 'YYYY') || '-[0-9]{6}$')
on conflict (kind, year) do nothing;

-- Cargo numbers issued before this migration are a plain digit counter
-- ("1352503"), a different namespace from CN-<year>-<000001>, so they cannot
-- collide with the new series and are not carried into it.
insert into public.shipment_number_counters (kind, year, last_value)
select
  'cn',
  extract(year from now())::int,
  coalesce(max((substring(upper(s.cn_number) from '^CN-[0-9]{4}-([0-9]{6})$'))::int), 0)
from public.shipments s
where upper(s.cn_number) ~ ('^CN-' || to_char(now(), 'YYYY') || '-[0-9]{6}$')
on conflict (kind, year) do nothing;

-- A cargo number identifies one shipment, so it has to be as unique as the
-- tracking number. Partial: shipments booked before the CN field existed have
-- none, and any number of those may sit side by side.
create unique index if not exists shipments_cn_number_unique_idx
  on public.shipments (upper(cn_number))
  where cn_number is not null;

/**
 * Reserve the next number in a series. Atomic: the RETURNING clause reports the
 * value this call claimed, and no other transaction can claim the same one.
 */
create or replace function public.next_shipment_number(p_kind text)
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_year int := extract(year from now())::int;
  v_next int;
begin
  insert into public.shipment_number_counters as c (kind, year, last_value)
  values (p_kind, v_year, 1)
  on conflict (kind, year) do update set last_value = c.last_value + 1
  returning c.last_value into v_next;

  return case p_kind when 'tracking' then 'FSN-' else 'CN-' end
      || v_year::text || '-' || lpad(v_next::text, 6, '0');
end;
$$;

-- Only the trigger issues numbers; a client that could call this directly could
-- burn through the series without booking anything.
revoke all on function public.next_shipment_number(text) from public, anon, authenticated;

/**
 * Stamp both numbers onto a new shipment. Runs BEFORE INSERT, so the NOT NULL
 * and format checks on tracking_number see the generated value and the client
 * never has to send one.
 *
 * A number that arrives already filled in is kept (normalised to upper case):
 * imports and the rare pre-printed waybill still work, and re-running the loop
 * on a collision means a legacy manual number cannot block a booking.
 */
create or replace function public.assign_shipment_numbers()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_attempt int;
begin
  if nullif(btrim(coalesce(new.tracking_number, '')), '') is null then
    v_attempt := 0;
    loop
      new.tracking_number := public.next_shipment_number('tracking');
      exit when not exists (
        select 1 from public.shipments where upper(tracking_number) = new.tracking_number
      );
      v_attempt := v_attempt + 1;
      if v_attempt > 50 then
        raise exception 'Could not generate a unique tracking number, please retry';
      end if;
    end loop;
  else
    new.tracking_number := upper(btrim(new.tracking_number));
  end if;

  if nullif(btrim(coalesce(new.cn_number, '')), '') is null then
    v_attempt := 0;
    loop
      new.cn_number := public.next_shipment_number('cn');
      exit when not exists (
        select 1 from public.shipments where upper(cn_number) = new.cn_number
      );
      v_attempt := v_attempt + 1;
      if v_attempt > 50 then
        raise exception 'Could not generate a unique cargo number, please retry';
      end if;
    end loop;
  else
    new.cn_number := upper(btrim(new.cn_number));
  end if;

  return new;
end;
$$;

drop trigger if exists shipments_assign_numbers on public.shipments;
create trigger shipments_assign_numbers
  before insert on public.shipments
  for each row execute function public.assign_shipment_numbers();

/**
 * The pair of numbers the next booking will receive, for the form to show while
 * it is still being filled in. A peek, not a reservation -- the value is only
 * claimed when the row is inserted, so an abandoned form burns no numbers.
 */
create or replace function public.preview_shipment_numbers()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_year int := extract(year from now())::int;
begin
  if not public.is_ops() then
    raise exception 'Dashboard access required' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'tracking_number',
      'FSN-' || v_year || '-' || lpad((coalesce(
        (select last_value from public.shipment_number_counters where kind = 'tracking' and year = v_year), 0
      ) + 1)::text, 6, '0'),
      'cn_number',
      'CN-' || v_year || '-' || lpad((coalesce(
        (select last_value from public.shipment_number_counters where kind = 'cn' and year = v_year), 0
      ) + 1)::text, 6, '0')
    )
  );
end;
$$;

revoke all on function public.preview_shipment_numbers() from public;
grant execute on function public.preview_shipment_numbers() to authenticated;

-- Kept for callers of the old single-number RPC, now on the FSN prefix and
-- reading the same counter instead of scanning the table.
create or replace function public.suggest_tracking_number()
returns text
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  return public.preview_shipment_numbers() ->> 'tracking_number';
end;
$$;

revoke all on function public.suggest_tracking_number() from public;
grant execute on function public.suggest_tracking_number() to authenticated;

-- Grant hygiene, following harden_trigger_fn_and_anon_grants: a freshly created
-- function picks up Supabase's default direct grant to anon, which
-- `revoke ... from public` does not remove. The trigger keeps working either
-- way -- trigger-function privileges are checked at CREATE TRIGGER time.
revoke execute on function public.assign_shipment_numbers() from public, anon, authenticated;
revoke execute on function public.preview_shipment_numbers() from anon;
