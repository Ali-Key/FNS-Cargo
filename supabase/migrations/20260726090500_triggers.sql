-- 20260726090500_triggers.sql
-- Data-hygiene triggers: auto-update updated_at, and auto-generate readable
-- tracking numbers when the client did not supply one.

-- updated_at maintenance via the moddatetime extension.
create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function extensions.moddatetime(updated_at);

create trigger shipments_set_updated_at
  before update on public.shipments
  for each row execute function extensions.moddatetime(updated_at);

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function extensions.moddatetime(updated_at);

-- Server-side tracking-number generator: FNS-<year>-<6-digit sequence>.
-- Only fires when the client left tracking_number blank, so the app's own
-- suggestTrackingNumber() flow still works. Uniqueness is guaranteed by the
-- per-year counter row lock PLUS the unique constraint as a backstop.
create or replace function public.assign_tracking_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_year integer := extract(year from now())::int;
  v_seq  integer;
begin
  if new.tracking_number is not null and btrim(new.tracking_number) <> '' then
    return new;
  end if;

  insert into public.tracking_number_counters as c (year, last_seq)
  values (v_year, 1)
  on conflict (year) do update set last_seq = c.last_seq + 1
  returning last_seq into v_seq;

  new.tracking_number := 'FNS-' || v_year::text || '-' || lpad(v_seq::text, 6, '0');
  return new;
end;
$$;

create trigger shipments_assign_tracking_number
  before insert on public.shipments
  for each row execute function public.assign_tracking_number();
