-- Finance module: one invoice per shipment charge, many payments per invoice.
-- amount_paid and status are maintained by trigger from the payments ledger so
-- the client never has to aggregate; shipments.payment_status mirrors it.

create type public.invoice_status as enum ('Partially Paid', 'Paid',);
create type public.payment_method as enum ('Bank Transfer');

create sequence if not exists public.invoice_number_seq start 1001;

create table public.invoices (
  id             uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
                   default 'FSN-INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0'),
  shipment_id    uuid not null references public.shipments(id) on delete cascade,
  customer_id    uuid references public.customers(id) on delete set null,
  amount         numeric(12,2) not null check (amount >= 0),
  amount_paid    numeric(12,2) not null default 0 check (amount_paid >= 0),
  balance        numeric(12,2) generated always as (amount - amount_paid) stored,
  currency       text not null default 'USD',
  status         public.invoice_status not null default 'Issued',
  issued_at      date not null default current_date,
  due_date       date,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.invoices is 'Shipment invoices. amount_paid/status are trigger-maintained from payments.';

create index invoices_shipment_id_idx on public.invoices (shipment_id);
create index invoices_customer_id_idx on public.invoices (customer_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_issued_at_idx on public.invoices (issued_at desc);

create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      public.payment_method not null default 'Bank Transfer',
  reference   text,
  paid_at     timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes       text,
  created_at  timestamptz not null default now()
);

comment on table public.payments is 'Append-only payment ledger against an invoice.';

create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_paid_at_idx on public.payments (paid_at desc);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

-- ---- Roll payments up into the invoice, then into the shipment ------------
create or replace function public.sync_shipment_payment_status(p_shipment_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_total numeric(12,2);
  v_paid numeric(12,2);
begin
  if p_shipment_id is null then return; end if;

  select coalesce(sum(amount), 0), coalesce(sum(amount_paid), 0)
    into v_total, v_paid
    from public.invoices
   where shipment_id = p_shipment_id and status <> 'Void';

  update public.shipments
     set payment_status = case
           when v_total = 0 then 'Unpaid'::public.payment_status
           when v_paid >= v_total then 'Paid'::public.payment_status
           when v_paid > 0 then 'Partially Paid'::public.payment_status
           else 'Unpaid'::public.payment_status
         end
   where id = p_shipment_id;
end;
$$;

create or replace function public.sync_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_invoice_id uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric(12,2);
  v_amount numeric(12,2);
  v_status public.invoice_status;
  v_shipment_id uuid;
begin
  select coalesce(sum(p.amount), 0) into v_paid
    from public.payments p where p.invoice_id = v_invoice_id;

  select i.amount, i.shipment_id, i.status into v_amount, v_shipment_id, v_status
    from public.invoices i where i.id = v_invoice_id;

  -- Draft and Void are manual states; never overwrite them from the ledger.
  if v_status not in ('Draft', 'Void') then
    v_status := case
      when v_paid >= v_amount and v_amount > 0 then 'Paid'::public.invoice_status
      when v_paid > 0 then 'Partially Paid'::public.invoice_status
      else 'Issued'::public.invoice_status
    end;
  end if;

  update public.invoices
     set amount_paid = v_paid, status = v_status
   where id = v_invoice_id;

  perform public.sync_shipment_payment_status(v_shipment_id);
  return null;
end;
$$;

create trigger payments_sync_invoice
  after insert or update or delete on public.payments
  for each row execute function public.sync_invoice_totals();

-- Changing the invoice amount or voiding it also moves the shipment's state.
create or replace function public.invoice_touch_shipment()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  perform public.sync_shipment_payment_status(coalesce(new.shipment_id, old.shipment_id));
  return null;
end;
$$;

create trigger invoices_sync_shipment
  after insert or delete or update of amount, status on public.invoices
  for each row execute function public.invoice_touch_shipment();

-- Trigger helpers are not RPCs. Postgres grants EXECUTE to public by default,
-- which would expose them at /rest/v1/rpc/*.
revoke execute on function public.sync_invoice_totals() from public, anon, authenticated;
revoke execute on function public.invoice_touch_shipment() from public, anon, authenticated;
revoke execute on function public.sync_shipment_payment_status(uuid) from public, anon, authenticated;

-- ---- RLS: finance is admin-only; customers may read their own invoices ----
alter table public.invoices enable row level security;
alter table public.payments enable row level security;

create policy "Read own invoices or all as admin" on public.invoices
  for select to authenticated
  using (public.is_admin() or customer_id = public.current_customer_id());
create policy "Admins insert invoices" on public.invoices
  for insert to authenticated with check (public.is_admin());
create policy "Admins update invoices" on public.invoices
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete invoices" on public.invoices
  for delete to authenticated using (public.is_admin());

create policy "Admins read payments" on public.payments
  for select to authenticated using (public.is_admin());
create policy "Admins insert payments" on public.payments
  for insert to authenticated with check (public.is_admin());
create policy "Admins update payments" on public.payments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins delete payments" on public.payments
  for delete to authenticated using (public.is_admin());
