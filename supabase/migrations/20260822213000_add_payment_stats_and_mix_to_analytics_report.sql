-- Reports: the page had no "Average payment" tile, and no way to build one --
-- the payload carried collected revenue per month but never how many payments
-- that revenue arrived in, so a mean could not be derived client-side without a
-- second query on a second date window. payment_stats adds the sum, the count
-- and the mean over the same v_from window every other trend on the page uses,
-- keeping the reporting period a single definition in a single place.
--
-- payment_mix answers the next question the page could not: not just how much
-- was collected, but through which channel. Grouped over that same window so
-- the breakdown reconciles with the total instead of standing beside it.
--
-- Additive: every other key in the payload is carried over unchanged from
-- 20260822120000_fix_transit_time_in_analytics_report.sql.

create or replace function public.analytics_report(p_months integer default 6)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_months integer := least(greatest(coalesce(p_months, 6), 1), 24);
  v_from timestamptz := date_trunc('month', now()) - make_interval(months => v_months - 1);
  v_transit_days numeric;
  v_transit_sample integer;
  v_open_days numeric;
  v_open_sample integer;
  v_period_shipments integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  -- Transit legs, measured off the tracking timeline.
  --
  -- tracking_updates stores a Somalia wall-clock date and a naive time, so the
  -- pair is read back through Africa/Mogadishu (UTC+3, no DST) to land on the
  -- instant the dispatcher meant rather than three hours early.
  with events as (
    select u.shipment_id,
           u.status,
           (u.date + u.time) at time zone 'Africa/Mogadishu' as at
      from public.tracking_updates u
  ),
  legs as (
    select s.id,
           s.status,
           -- Departure. 'Shipped' is the leg that starts transit; a shipment
           -- only ever marked 'In Transit' has no departure scan of its own, and
           -- that event is then the earliest proof it had left.
           coalesce(
             (select min(e.at) from events e
               where e.shipment_id = s.id and e.status = 'Shipped'),
             (select min(e.at) from events e
               where e.shipment_id = s.id and e.status = 'In Transit')
           ) as started_at,
           -- Arrival. The delivery scan carries the hour the cargo actually
           -- landed; delivered_at is only the trigger's stamp of when the office
           -- keyed it in, so it stands in when no scan was filed.
           coalesce(
             (select min(e.at) from events e
               where e.shipment_id = s.id and e.status = 'Delivered'),
             s.delivered_at
           ) as ended_at
      from public.shipments s
  ),
  -- Completed legs, placed in the period by when they landed.
  closed as (
    select extract(epoch from (l.ended_at - l.started_at)) / 86400 as days
      from legs l
     where l.status = 'Delivered'
       and l.started_at is not null
       and l.ended_at is not null
       and l.ended_at >= l.started_at   -- arrival before departure is bad data
       and l.ended_at >= v_from
  ),
  -- Legs still running: departed, not yet delivered. A shipment still at the
  -- counter or in the warehouse has not started its clock and is not counted.
  running as (
    select extract(epoch from (now() - l.started_at)) / 86400 as days
      from legs l
     where l.status <> 'Delivered'
       and l.started_at is not null
       and l.started_at <= now()        -- a future-dated scan is not elapsed time
       and l.started_at >= v_from
  )
  select (select round(avg(days)::numeric, 1) from closed),
         (select count(*) from closed),
         (select round(avg(days)::numeric, 1) from running),
         (select count(*) from running)
    into v_transit_days, v_transit_sample, v_open_days, v_open_sample;

  -- Whether anything was booked at all this period, which is the only thing that
  -- makes "no shipments on the books" a true statement.
  select count(*) into v_period_shipments
    from public.shipments where created_at >= v_from;

  return jsonb_build_object(
    'months', v_months,

    -- Revenue collected vs invoiced, month by month.
    'revenue_trend', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(m.month, 'Mon YYYY'),
               'collected', m.collected,
               'invoiced', m.invoiced
             ) order by m.month), '[]'::jsonb)
      from (
        select months.month,
               (select coalesce(sum(p.amount), 0) from public.payments p
                 where date_trunc('month', p.paid_at) = months.month) as collected,
               (select coalesce(sum(i.amount), 0) from public.invoices i
                 where date_trunc('month', i.issued_at) = months.month
                   and i.status <> 'Void') as invoiced
          from generate_series(v_from, date_trunc('month', now()), interval '1 month') as months(month)
      ) m
    ),

    -- What was actually collected in the period, and over how many payments.
    --
    -- `payments` is the ledger of money already taken: no pending/failed/
    -- refunded state exists on it, a CHECK holds `amount` above zero, and a
    -- reversal is a delete rather than a status flip. So every row in the window
    -- is a collected payment, and avg() over them is the mean of exactly the
    -- rows that sum to `collected`.
    --
    -- The window is the same span the month buckets above cover -- from v_from
    -- to the end of the current month -- so this sum reconciles with the
    -- Collected tile rather than quietly counting a future-dated payment the
    -- trend leaves out. avg() is null on an empty set, which is how the client
    -- tells "nothing collected" from "collected nothing", with no division by
    -- zero either way.
    'payment_stats', (
      select jsonb_build_object(
        'collected', coalesce(sum(p.amount), 0),
        'count', count(*),
        'average', round(avg(p.amount), 2)
      )
      from public.payments p
      where p.paid_at >= v_from
        and p.paid_at < date_trunc('month', now()) + interval '1 month'
        and p.amount > 0   -- redundant under the CHECK; keeps sum and count on one row set
    ),

    -- How that collected money arrived, channel by channel.
    --
    -- Same window and same predicates as payment_stats above, so the bars on
    -- the page sum to the Collected tile rather than to a slightly different
    -- date range. Ranked by amount, not by count: the question the panel
    -- answers is where the money comes in, and a hundred small cash payments
    -- are not a bigger channel than one large transfer.
    'payment_mix', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', x.method::text, 'value', x.n, 'revenue', x.amount)), '[]'::jsonb)
      from (
        select p.method, count(*) as n, coalesce(sum(p.amount), 0) as amount
          from public.payments p
         where p.paid_at >= v_from
           and p.paid_at < date_trunc('month', now()) + interval '1 month'
           and p.amount > 0
         group by p.method
         order by sum(p.amount) desc, count(*) desc
      ) x
    ),

    -- Busiest lanes, ranked by volume.
    'top_routes', (
      select coalesce(jsonb_agg(r), '[]'::jsonb) from (
        select s.origin, s.destination,
               count(*) as shipments,
               coalesce(sum(s.total_price), 0) as value,
               round(avg(s.weight)::numeric, 1) as avg_weight
          from public.shipments s
         group by s.origin, s.destination
         order by count(*) desc, sum(s.total_price) desc nulls last
         limit 8
      ) r
    ),

    -- On-time = delivered on or before the estimate. Unknown estimate is excluded.
    'delivery_performance', (
      select jsonb_build_object(
        'delivered', count(*) filter (where status = 'Delivered'),
        'on_time', count(*) filter (
          where status = 'Delivered' and estimated_delivery is not null
            and delivered_at::date <= estimated_delivery),
        'late', count(*) filter (
          where status = 'Delivered' and estimated_delivery is not null
            and delivered_at::date > estimated_delivery),
        'in_progress', count(*) filter (where status <> 'Delivered'),
        'overdue', count(*) filter (
          where status <> 'Delivered' and estimated_delivery is not null
            and estimated_delivery < current_date),
        -- Average departure-to-arrival for the legs that landed this period.
        -- Null when nothing measurable landed.
        'avg_transit_days', v_transit_days,
        'transit_sample', v_transit_sample,
        -- Average time the legs still running have been out. Null when nothing
        -- is moving, so the client can tell "none in transit" from "none landed".
        'avg_open_days', v_open_days,
        'open_sample', v_open_sample,
        -- Shipments booked this period, measurable or not.
        'period_shipments', v_period_shipments
      ) from public.shipments
    ),

    -- New customers per month plus the running total.
    'customer_growth', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(m.month, 'Mon YYYY'),
               'new_customers', m.n,
               'total', m.running
             ) order by m.month), '[]'::jsonb)
      from (
        select months.month,
               (select count(*) from public.customers c
                 where date_trunc('month', c.created_at) = months.month) as n,
               (select count(*) from public.customers c
                 where c.created_at < months.month + interval '1 month') as running
          from generate_series(v_from, date_trunc('month', now()), interval '1 month') as months(month)
      ) m
    ),

    'method_mix', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'name', shipping_method::text, 'value', n, 'revenue', rev)), '[]'::jsonb)
      from (select shipping_method, count(*) as n, coalesce(sum(total_price), 0) as rev
              from public.shipments group by 1 order by 2 desc) x
    ),

    'cargo_mix', (
      select coalesce(jsonb_agg(jsonb_build_object('name', cargo_type::text, 'value', n)), '[]'::jsonb)
      from (select cargo_type, count(*) as n from public.shipments group by 1 order by 2 desc) x
    ),

    -- Highest-value customers.
    'top_customers', (
      select coalesce(jsonb_agg(c), '[]'::jsonb) from (
        select cu.id, cu.full_name, cu.email,
               count(s.id) as shipments,
               coalesce(sum(s.total_price), 0) as value
          from public.customers cu
          left join public.shipments s on s.customer_id = cu.id
         group by cu.id, cu.full_name, cu.email
         order by coalesce(sum(s.total_price), 0) desc, count(s.id) desc
         limit 8
      ) c
    )
  );
end;
$function$;
