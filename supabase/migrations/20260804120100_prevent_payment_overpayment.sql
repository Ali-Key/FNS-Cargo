-- Payments only checked amount > 0, so an insert/update could push a payment
-- past the invoice's remaining balance and drive it negative. sync_invoice_totals()
-- (AFTER trigger) just sums whatever lands in payments, so the guard has to run
-- BEFORE the row is written.

create or replace function public.prevent_payment_overpay()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_invoice_amount numeric(12,2);
  v_other_paid numeric(12,2);
begin
  select amount into v_invoice_amount from public.invoices where id = new.invoice_id;
  if v_invoice_amount is null then
    raise exception 'Invoice not found' using errcode = '23503';
  end if;

  select coalesce(sum(amount), 0) into v_other_paid
    from public.payments
   where invoice_id = new.invoice_id
     and id is distinct from new.id;

  if v_other_paid + new.amount > v_invoice_amount then
    raise exception 'Payment of % exceeds the invoice balance of %', new.amount, (v_invoice_amount - v_other_paid)
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger payments_prevent_overpay
  before insert or update on public.payments
  for each row execute function public.prevent_payment_overpay();
