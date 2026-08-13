-- Security remediation:
--  (1) track_shipment() leaked customer PII (full name) and the internal
--      shipment UUID to anonymous callers.
--  (2) suggest_tracking_number() produced sequential, enumerable numbers.
--  (3) Several SECURITY DEFINER RPCs were reachable by roles that never
--      call them, widening the attack surface beyond what each RPC's own
--      internal is_admin()/is_ops() check already gates.
-- track_shipment() itself now only returns fields the public tracking page
-- actually renders (see src/components/tracking/TrackingWidget.tsx): no
-- customer_name, no internal id. It is also moved behind the track-shipment
-- Edge Function (rate limiting + generic errors), so the direct PostgREST
-- RPC grant to anon/authenticated is revoked below.

create or replace function public.track_shipment(p_tracking_number text)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_shipment public.shipments%rowtype;
  v_events jsonb;
begin
  if p_tracking_number is null or btrim(p_tracking_number) = '' then return null; end if;

  select * into v_shipment from public.shipments
   where upper(tracking_number) = upper(btrim(p_tracking_number)) limit 1;
  if not found then return null; end if;

  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'date', t.date, 'time', to_char(t.time, 'HH24:MI'),
               'country', t.country, 'city', t.city, 'location', t.location,
               'status', t.status, 'description', t.description
             ) order by t.date desc, t.time desc
           ), '[]'::jsonb)
    into v_events
    from public.tracking_updates t where t.shipment_id = v_shipment.id;

  -- Intentionally omits: id (internal PK), customer_name, and any customer/
  -- payment/notes data. Only carrier-safe tracking fields go out.
  return jsonb_build_object(
    'tracking_number', v_shipment.tracking_number,
    'origin', v_shipment.origin,
    'destination', v_shipment.destination,
    'shipping_method', v_shipment.shipping_method,
    'cargo_type', v_shipment.cargo_type,
    'weight', v_shipment.weight,
    'status', v_shipment.status,
    'estimated_delivery', v_shipment.estimated_delivery,
    'created_at', v_shipment.created_at,
    'events', v_events
  );
end;
$$;

-- Public tracking now goes exclusively through the track-shipment Edge
-- Function, which calls this RPC with the service-role key.
revoke execute on function public.track_shipment(text) from anon, authenticated;

-- Tracking numbers were `max(existing suffix) + 1`, so any known number
-- immediately revealed its neighbors. Generate a random 6-digit suffix
-- instead (retrying on the rare collision); existing numbers are untouched.
create or replace function public.suggest_tracking_number(p_country_code text default 'CN')
returns text
language plpgsql
volatile security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_code text := upper(coalesce(nullif(btrim(p_country_code), ''), 'CN'));
  v_candidate text;
  v_attempt int := 0;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  if v_code !~ '^[A-Z]{2}$' then v_code := 'CN'; end if;

  loop
    v_candidate := 'FSN-' || v_code || '-' || lpad(floor(random() * 900000 + 100000)::text, 6, '0');
    exit when not exists (
      select 1 from public.shipments where upper(tracking_number) = v_candidate
    );
    v_attempt := v_attempt + 1;
    if v_attempt > 20 then
      raise exception 'Could not generate a unique tracking number, please retry';
    end if;
  end loop;

  return v_candidate;
end;
$$;

-- Defense-in-depth: admin_users_overview() already raises 42501 internally
-- for non-admins, but anon has no legitimate reason to reach it at all.
revoke execute on function public.admin_users_overview() from anon;

-- prevent_payment_overpay() is a BEFORE trigger function only -- the same
-- class of helper that 20260730180500_harden_finance_function_grants.sql
-- already locked down for sync_invoice_totals/invoice_touch_shipment/etc.
-- This one was added later (20260804120100) and missed that pass.
revoke execute on function public.prevent_payment_overpay() from public, anon, authenticated;

-- is_ops() legitimately needs anon (countries "Anyone reads active
-- countries" policy) and authenticated (customers/shipments/quotes/tracking
-- policies) -- see CLAUDE.md. Only the redundant blanket PUBLIC grant is
-- removed; the explicit anon/authenticated grants are untouched.
revoke execute on function public.is_ops() from public;

-- Rate-limit log for the track-shipment Edge Function. RLS is enabled with
-- no policies and no anon/authenticated grants: only the service-role key
-- (used exclusively by that Edge Function) can read or write it.
create table if not exists public.tracking_lookup_attempts (
  id bigint generated always as identity primary key,
  ip text not null,
  requested_at timestamptz not null default now()
);

create index if not exists tracking_lookup_attempts_ip_time_idx
  on public.tracking_lookup_attempts (ip, requested_at desc);

alter table public.tracking_lookup_attempts enable row level security;
revoke all on public.tracking_lookup_attempts from public, anon, authenticated;
