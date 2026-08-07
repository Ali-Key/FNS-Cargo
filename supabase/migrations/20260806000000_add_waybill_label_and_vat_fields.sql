-- Cargo-office fields for the waybill label and VAT/discount on invoices.
-- All additive: no column dropped/renamed, no trigger removed, no RLS narrowed.
-- The `balance` generated column is dropped and immediately recreated under the
-- same name because Postgres cannot ALTER a generated column's expression;
-- balance has always been derived, never stored input, so this is not data loss.

-- shipments: label + counter-workflow fields
alter table public.shipments
  add column if not exists pieces integer not null default 1 check (pieces > 0),
  add column if not exists booking_contact text,
  add column if not exists cn_number text,
  add column if not exists branch_code text;

comment on column public.shipments.pieces is 'Number of physical packages in this shipment (label "PCS").';
comment on column public.shipments.booking_contact is 'Contact phone for this specific booking; may differ from the customer''s registered phone.';
comment on column public.shipments.cn_number is 'Customs/carrier reference number printed on the waybill label, assigned externally.';
comment on column public.shipments.branch_code is 'Origin branch/warehouse code printed on the waybill label (e.g. GZ2025).';

-- system_settings: one global VAT rate
alter table public.system_settings
  add column if not exists vat_rate numeric(5,2) not null default 5.00 check (vat_rate >= 0);
comment on column public.system_settings.vat_rate is 'Percentage applied to new invoices at issue time; already-issued invoices keep their stored vat_amount.';

-- invoices: VAT/discount, stored at issue time, plus who issued it (cashier)
alter table public.invoices
  add column if not exists vat_amount numeric(12,2) not null default 0 check (vat_amount >= 0),
  add column if not exists discount   numeric(12,2) not null default 0 check (discount >= 0),
  add column if not exists issued_by  uuid references public.profiles(id) on delete set null;
comment on column public.invoices.vat_amount is 'Computed from system_settings.vat_rate at issue time; stored so later rate changes do not rewrite old invoices.';
comment on column public.invoices.issued_by is 'Dashboard profile that raised the invoice (printed as the cashier name).';

-- balance widens to (amount + vat_amount - discount - amount_paid).
alter table public.invoices drop column balance;
alter table public.invoices
  add column balance numeric(12,2) generated always as (amount + vat_amount - discount - amount_paid) stored;

-- Extend the ledger trigger to settle against the grand total, not raw `amount`.
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
  v_vat numeric(12,2);
  v_discount numeric(12,2);
  v_grand_total numeric(12,2);
  v_status public.invoice_status;
  v_shipment_id uuid;
begin
  select coalesce(sum(p.amount), 0) into v_paid
    from public.payments p where p.invoice_id = v_invoice_id;

  select i.amount, i.vat_amount, i.discount, i.shipment_id, i.status
    into v_amount, v_vat, v_discount, v_shipment_id, v_status
    from public.invoices i where i.id = v_invoice_id;

  v_grand_total := v_amount + v_vat - v_discount;

  -- Draft and Void are manual states; never overwrite them from the ledger.
  if v_status not in ('Draft', 'Void') then
    v_status := case
      when v_paid >= v_grand_total and v_grand_total > 0 then 'Paid'::public.invoice_status
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

revoke execute on function public.sync_invoice_totals() from public, anon, authenticated;
