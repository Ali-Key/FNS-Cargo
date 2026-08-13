-- Sequential, human-readable tracking numbers: FSN-<year>-<000001>.
-- Replaces the random FSN-CN-123456 form, and opens the RPC to every ops role
-- (Dispatchers and Staff book cargo too; the Admin-only gate forced the client
-- into a random local fallback for them).

drop function if exists public.suggest_tracking_number(text);

create or replace function public.suggest_tracking_number()
returns text
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_prefix text;
  v_next int;
  v_candidate text;
  v_attempt int := 0;
begin
  if not public.is_ops() then
    raise exception 'Dashboard access required' using errcode = '42501';
  end if;

  v_prefix := 'FSN-' || v_year || '-';

  -- Highest number already issued this year; gaps from deleted rows are not reused.
  select coalesce(max((substring(upper(tracking_number) from '^FSN-' || v_year || '-([0-9]{6})$'))::int), 0)
    into v_next
    from public.shipments
   where upper(tracking_number) ~ ('^FSN-' || v_year || '-[0-9]{6}$');

  loop
    v_next := v_next + 1;
    v_candidate := v_prefix || lpad(v_next::text, 6, '0');
    exit when not exists (
      select 1 from public.shipments where upper(tracking_number) = v_candidate
    );
    v_attempt := v_attempt + 1;
    if v_attempt > 50 then
      raise exception 'Could not generate a unique tracking number, please retry';
    end if;
  end loop;

  return v_candidate;
end;
$$;

revoke all on function public.suggest_tracking_number() from public;
grant execute on function public.suggest_tracking_number() to authenticated;
