-- 20260726090900_archive_and_jobs.sql
-- Retention + scheduled maintenance. Terminal shipments (delivered/cancelled)
-- older than 24 months move to the archive with their tracking history; the
-- rate-limit table is purged hourly. Jobs run via pg_cron as the table owner,
-- so they bypass RLS as intended.

-- ---------------------------------------------------------------------------
-- archive_old_shipments() — move terminal shipments older than 24 months.
-- Children (tracking history) are copied first, then ON DELETE CASCADE removes
-- the live children when the parent is deleted. All in one transaction.
-- ---------------------------------------------------------------------------
create or replace function public.archive_old_shipments()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  create temporary table _to_archive on commit drop as
    select id
    from public.shipments
    where status in ('delivered', 'cancelled')
      and updated_at < now() - interval '24 months';

  select count(*) into v_count from _to_archive;
  if v_count = 0 then
    return 0;
  end if;

  insert into public.shipment_tracking_history_archive
    (id, shipment_id, status, location, description, event_time, created_at)
  select h.id, h.shipment_id, h.status, h.location, h.description, h.event_time, h.created_at
  from public.shipment_tracking_history h
  join _to_archive t on t.id = h.shipment_id;

  insert into public.shipments_archive
    (id, tracking_number, reference_number, customer_id, assigned_to,
     sender_name, sender_phone, receiver_name, receiver_phone, origin, destination,
     shipping_method, weight_kg, pieces, declared_value, status, estimated_delivery,
     notes, created_at, updated_at)
  select s.id, s.tracking_number, s.reference_number, s.customer_id, s.assigned_to,
         s.sender_name, s.sender_phone, s.receiver_name, s.receiver_phone, s.origin, s.destination,
         s.shipping_method, s.weight_kg, s.pieces, s.declared_value, s.status, s.estimated_delivery,
         s.notes, s.created_at, s.updated_at
  from public.shipments s
  join _to_archive t on t.id = s.id;

  -- Removing the parent cascades to live tracking history.
  delete from public.shipments s using _to_archive t where s.id = t.id;

  return v_count;
end;
$$;

revoke all on function public.archive_old_shipments() from public;

-- ---------------------------------------------------------------------------
-- purge_tracking_lookups() — drop rate-limit rows older than one day.
-- ---------------------------------------------------------------------------
create or replace function public.purge_tracking_lookups()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.tracking_lookups where looked_up_at < now() - interval '1 day';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.purge_tracking_lookups() from public;

-- ---------------------------------------------------------------------------
-- Schedule the jobs. Wrapped in a DO block so the migration still applies on
-- environments where pg_cron is not yet enabled (enable it in the Dashboard,
-- then re-run this block or schedule manually).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    -- Nightly archive at 02:30 UTC.
    perform cron.schedule('fns-archive-old-shipments', '30 2 * * *',
                          $job$ select public.archive_old_shipments(); $job$);
    -- Hourly rate-limit purge.
    perform cron.schedule('fns-purge-tracking-lookups', '0 * * * *',
                          $job$ select public.purge_tracking_lookups(); $job$);
  else
    raise notice 'pg_cron not installed; skipping job scheduling. Enable pg_cron and re-run this block.';
  end if;
end;
$$;
