-- dashboard_stats() now serves dispatchers too, adds delayed/unpaid counts and
-- revenue. Money is admin-only: for a dispatcher the revenue keys come back null
-- rather than being omitted, so the client shape stays stable.

create or replace function public.dashboard_stats()
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_is_admin boolean := public.is_admin();
begin
  if not public.is_ops() then
    raise exception 'Dashboard access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_shipments',     (select count(*) from public.shipments),
    'active_shipments',    (select count(*) from public.shipments where status <> 'Delivered'),
    'delivered_shipments', (select count(*) from public.shipments where status = 'Delivered'),
    'delayed_shipments',   (select count(*) from public.shipments
                             where status <> 'Delivered'
                               and estimated_delivery is not null
                               and estimated_delivery < current_date),
    'unpaid_shipments',    (select count(*) from public.shipments where payment_status <> 'Paid'),
    'customers',           (select count(*) from public.customers),
    'active_customers',    (select count(*) from public.customers where status = 'Active'),
    'countries_served',    (select count(*) from public.countries where is_active),
    'pending_quotes',      (select count(*) from public.quotes where status = 'Pending'),
    'total_quotes',        (select count(*) from public.quotes),
    'revenue_total',       case when v_is_admin then
                             (select coalesce(sum(amount), 0) from public.payments) end,
    'revenue_month',       case when v_is_admin then
                             (select coalesce(sum(amount), 0) from public.payments
                               where paid_at >= date_trunc('month', now())) end,
    'outstanding_amount',  case when v_is_admin then
                             (select coalesce(sum(balance), 0) from public.invoices
                               where status not in ('Void', 'Draft')) end,
    'overdue_invoices',    case when v_is_admin then
                             (select count(*) from public.invoices
                               where status not in ('Void', 'Draft', 'Paid')
                                 and due_date is not null and due_date < current_date) end,
    'status_breakdown', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status::text as status, count(*) as n from public.shipments group by 1) s
    ),
    'method_breakdown', (
      select coalesce(jsonb_object_agg(shipping_method, n), '{}'::jsonb)
      from (select shipping_method::text as shipping_method, count(*) as n from public.shipments group by 1) m
    ),
    'monthly_volume', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(m.month, 'Mon'),
               'shipments', m.n,
               'revenue', case when v_is_admin then m.revenue end
             ) order by m.month), '[]'::jsonb)
      from (
        select date_trunc('month', months.month) as month,
               count(s.id) as n,
               (select coalesce(sum(p.amount), 0) from public.payments p
                 where date_trunc('month', p.paid_at) = months.month) as revenue
          from generate_series(date_trunc('month', now()) - interval '5 months',
                               date_trunc('month', now()), interval '1 month') as months(month)
          left join public.shipments s on date_trunc('month', s.created_at) = months.month
         group by months.month
      ) m
    )
  );
end;
$$;

-- ---- Analytics & Reports (admin-only: it exposes revenue) -----------------
create or replace function public.analytics_report(p_months integer default 6)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_months integer := least(greatest(coalesce(p_months, 6), 1), 24);
  v_from timestamptz := date_trunc('month', now()) - make_interval(months => v_months - 1);
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

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
        'avg_transit_days', (
          select round(avg(extract(epoch from (delivered_at - created_at)) / 86400)::numeric, 1)
            from public.shipments where status = 'Delivered' and delivered_at is not null)
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
$$;

comment on function public.analytics_report(integer) is
  'Admin-only business insights: revenue trend, lanes, delivery performance, customer growth.';

-- Revoke PUBLIC, not just anon: Postgres grants EXECUTE to PUBLIC by default and
-- anon inherits it, so revoking the role alone is a no-op.
revoke execute on function public.analytics_report(integer) from public, anon;
grant execute on function public.analytics_report(integer) to authenticated;

-- is_ops() deliberately keeps its anon grant. The anon-facing "Anyone reads
-- active countries" policy calls it, and a policy referencing a function the
-- caller cannot execute raises 42501 during the policy check, which PostgREST
-- returns as a misleading HTTP 401.
grant execute on function public.is_ops() to anon, authenticated;
