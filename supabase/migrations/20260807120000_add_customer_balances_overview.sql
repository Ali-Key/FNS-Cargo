-- The Customers list needs per-customer shipment count, total paid, and balance
-- owed (spec: list columns, not just contact info). Financial figures must stay
-- invisible to Staff/Dispatcher, so this mirrors dashboard_stats()'s pattern
-- exactly: is_ops() gates whether the function runs at all, is_admin() gates
-- whether the money columns come back null or real. Pre-aggregating shipments
-- and invoices in separate subqueries before joining avoids a join fan-out that
-- would otherwise inflate the sums by shipment_count.
create or replace function public.customer_balances_overview()
returns table (
  customer_id uuid,
  shipment_count bigint,
  total_paid numeric(12,2),
  balance_owed numeric(12,2)
)
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if not public.is_ops() then
    raise exception 'Dashboard access required' using errcode = '42501';
  end if;

  return query
    select
      c.id as customer_id,
      coalesce(sc.shipment_count, 0) as shipment_count,
      case when public.is_admin() then coalesce(ic.total_paid, 0) else null end as total_paid,
      case when public.is_admin() then coalesce(ic.balance_owed, 0) else null end as balance_owed
    from public.customers c
    left join (
      select customer_id, count(*) as shipment_count
      from public.shipments
      group by customer_id
    ) sc on sc.customer_id = c.id
    left join (
      select customer_id, sum(amount_paid) as total_paid, sum(balance) as balance_owed
      from public.invoices
      where status <> 'Void'
      group by customer_id
    ) ic on ic.customer_id = c.id;
end;
$$;

revoke execute on function public.customer_balances_overview() from public;
grant execute on function public.customer_balances_overview() to authenticated;
