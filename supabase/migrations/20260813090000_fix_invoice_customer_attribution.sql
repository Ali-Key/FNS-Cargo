-- The Customers list showed a correct shipment count but blank/zero Paid and
-- Owed for some customers. Cause: invoices.customer_id is a *nullable
-- denormalised copy* that InvoiceFormModal fills client-side from the selected
-- shipment. It ends up null whenever the shipment had no linked customer at
-- invoice time, the invoice predates that denormalisation, or the customer row
-- was replaced (the FK is `on delete set null`). customer_balances_overview()
-- aggregates strictly on that column, so those invoices were attributed to
-- nobody -- the money silently vanished from the list.
--
-- Fixed at the source so every consumer benefits, not just the list:
-- listCustomerInvoices() and listCustomerPayments() (the statement PDF and the
-- customer profile panels) filter on the same column and had the same blind spot.

-- 1. Backfill the orphans from the invoice's shipment (invoices.shipment_id is
--    NOT NULL, so this is always resolvable when the shipment has a customer).
update public.invoices i
set customer_id = s.customer_id
from public.shipments s
where i.shipment_id = s.id
  and i.customer_id is distinct from s.customer_id
  and s.customer_id is not null;

-- 2. Stop it recurring. The client may keep sending customer_id; this only
--    fills the gap when it is absent, and follows the shipment if the invoice
--    is later re-pointed at a different shipment.
create or replace function public.set_invoice_customer_from_shipment()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if new.customer_id is null and new.shipment_id is not null then
    select s.customer_id into new.customer_id
    from public.shipments s
    where s.id = new.shipment_id;
  end if;
  return new;
end;
$$;

drop trigger if exists invoices_set_customer_from_shipment on public.invoices;
create trigger invoices_set_customer_from_shipment
  before insert or update of shipment_id, customer_id on public.invoices
  for each row execute function public.set_invoice_customer_from_shipment();

-- 3. Belt and braces for the list itself: resolve the owner through the
--    shipment as well, so a row that slips through (or a shipment whose
--    customer is linked after the invoice was raised) still totals correctly.
--    Shipment count and money totals are pre-aggregated separately before the
--    join, so neither fans out the other.
create or replace function public.customer_balances_overview(p_customer_ids uuid[] default null)
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
      select s.customer_id, count(*) as shipment_count
      from public.shipments s
      where s.customer_id is not null
      group by s.customer_id
    ) sc on sc.customer_id = c.id
    left join (
      select
        coalesce(i.customer_id, s.customer_id) as customer_id,
        sum(i.amount_paid) as total_paid,
        sum(i.balance) as balance_owed
      from public.invoices i
      join public.shipments s on s.id = i.shipment_id
      where i.status <> 'Void'
        and coalesce(i.customer_id, s.customer_id) is not null
      group by coalesce(i.customer_id, s.customer_id)
    ) ic on ic.customer_id = c.id
    where p_customer_ids is null or c.id = any(p_customer_ids);
end;
$$;

revoke execute on function public.customer_balances_overview(uuid[]) from public;
revoke execute on function public.customer_balances_overview(uuid[]) from anon;
grant execute on function public.customer_balances_overview(uuid[]) to authenticated;
