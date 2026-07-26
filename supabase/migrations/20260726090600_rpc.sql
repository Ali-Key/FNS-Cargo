-- 20260726090600_rpc.sql
-- Callable RPCs. Public tracking, admin user listing, dashboard aggregate, and
-- the public settings reader. All SECURITY DEFINER with a locked search_path;
-- each authorises its own caller and returns only safe columns.

-- ---------------------------------------------------------------------------
-- track_shipment(p_tracking_number) — the ONLY public window into shipments.
-- Matches tracking_number OR reference_number (case-insensitive), searches the
-- live table then the archive, and returns a fixed set of safe fields plus the
-- timeline. NEVER returns customer_id, sender/receiver contact, declared_value,
-- notes, or anything from customers/activity_logs. Unknown -> NULL (no leak).
-- ---------------------------------------------------------------------------
create or replace function public.track_shipment(p_tracking_number text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_norm    text;
  v_id      uuid;
  v_row     jsonb;
  v_history jsonb;
begin
  v_norm := upper(btrim(coalesce(p_tracking_number, '')));
  if length(v_norm) < 6 then
    return null;                       -- too short to be a real number; don't query
  end if;

  -- Live table first.
  select s.id,
         jsonb_build_object(
           'tracking_number',    s.tracking_number,
           'status',             s.status,
           'origin',             s.origin,
           'destination',        s.destination,
           'shipping_method',    s.shipping_method,
           'weight_kg',          s.weight_kg,
           'pieces',             s.pieces,
           'estimated_delivery', s.estimated_delivery,
           'created_at',         s.created_at,
           'updated_at',         s.updated_at
         )
    into v_id, v_row
  from public.shipments s
  where upper(s.tracking_number) = v_norm
     or (s.reference_number is not null and upper(s.reference_number) = v_norm)
  limit 1;

  if v_id is not null then
    select coalesce(jsonb_agg(
             jsonb_build_object('status', h.status, 'location', h.location,
                                'description', h.description, 'event_time', h.event_time)
             order by h.event_time desc), '[]'::jsonb)
      into v_history
    from public.shipment_tracking_history h
    where h.shipment_id = v_id;

    return v_row || jsonb_build_object('tracking_history', v_history);
  end if;

  -- Fall back to the archive so old shipments still track.
  select s.id,
         jsonb_build_object(
           'tracking_number',    s.tracking_number,
           'status',             s.status,
           'origin',             s.origin,
           'destination',        s.destination,
           'shipping_method',    s.shipping_method,
           'weight_kg',          s.weight_kg,
           'pieces',             s.pieces,
           'estimated_delivery', s.estimated_delivery,
           'created_at',         s.created_at,
           'updated_at',         s.updated_at
         )
    into v_id, v_row
  from public.shipments_archive s
  where upper(s.tracking_number) = v_norm
     or (s.reference_number is not null and upper(s.reference_number) = v_norm)
  limit 1;

  if v_id is null then
    return null;                       -- unknown number -> empty, never an error
  end if;

  select coalesce(jsonb_agg(
           jsonb_build_object('status', h.status, 'location', h.location,
                              'description', h.description, 'event_time', h.event_time)
           order by h.event_time desc), '[]'::jsonb)
    into v_history
  from public.shipment_tracking_history_archive h
  where h.shipment_id = v_id;

  return v_row || jsonb_build_object('tracking_history', v_history);
end;
$$;

revoke all on function public.track_shipment(text) from public;
grant execute on function public.track_shipment(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_list_users() — joins admin_users with auth.users for the Users page.
-- Admin only. auth.users is otherwise inaccessible to the API.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  admin_id        uuid,
  user_id         uuid,
  email           text,
  role            text,
  created_at      timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  return query
    select a.id, a.user_id, u.email::text, a.role, a.created_at, u.last_sign_in_at
    from public.admin_users a
    join auth.users u on u.id = a.user_id
    order by a.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
-- dashboard_stats() — single-round-trip aggregate for the overview (<2s target).
-- Staff/admin only. Optional fast path the frontend can adopt in place of the
-- client-side reduction over all shipment rows.
-- ---------------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not public.is_staff_or_admin_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total',            (select count(*) from public.shipments),
    'customers',        (select count(*) from public.customers),
    'active_customers', (select count(*) from public.customers where is_active),
    'by_status', (
      select coalesce(jsonb_object_agg(status, c), '{}'::jsonb)
      from (select status, count(*) c from public.shipments group by status) t
    ),
    'monthly_volume', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m, 'Mon'), 'count', cnt) order by m), '[]'::jsonb)
      from (
        select gs as m,
               (select count(*) from public.shipments s
                where date_trunc('month', s.created_at) = gs) as cnt
        from generate_series(date_trunc('month', now()) - interval '5 months',
                             date_trunc('month', now()),
                             interval '1 month') gs
      ) months
    )
  ) into v;

  return v;
end;
$$;

revoke all on function public.dashboard_stats() from public;
grant execute on function public.dashboard_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- public_settings() — safe public company info for the marketing site, so anon
-- never needs a direct SELECT on system_settings. Returns only display fields.
-- ---------------------------------------------------------------------------
create or replace function public.public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',                      s.id,
    'company_name',            s.company_name,
    'company_email',           s.company_email,
    'company_phone',           s.company_phone,
    'company_address',         s.company_address,
    'company_website',         s.company_website,
    'logo_url',                s.logo_url,
    'default_shipping_method', s.default_shipping_method,
    'created_at',              s.created_at,
    'updated_at',              s.updated_at
  )
  from public.system_settings s
  order by s.created_at asc
  limit 1;
$$;

revoke all on function public.public_settings() from public;
grant execute on function public.public_settings() to anon, authenticated;
