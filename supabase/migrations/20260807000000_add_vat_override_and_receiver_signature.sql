-- prevent_payment_overpay() (20260804120100) only compared against invoices.amount.
-- 20260806000000 widened the real payable total to (amount + vat_amount - discount),
-- so the guard has been checking the wrong number for every VAT/discount invoice
-- since. Fixing it here since it directly affects whether a legitimate payment is
-- wrongly rejected or an overpayment wrongly allowed.

create or replace function public.prevent_payment_overpay()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_grand_total numeric(12,2);
  v_other_paid numeric(12,2);
begin
  select amount + vat_amount - discount into v_grand_total
    from public.invoices where id = new.invoice_id;
  if v_grand_total is null then
    raise exception 'Invoice not found' using errcode = '23503';
  end if;

  select coalesce(sum(amount), 0) into v_other_paid
    from public.payments
   where invoice_id = new.invoice_id
     and id is distinct from new.id;

  if v_other_paid + new.amount > v_grand_total then
    raise exception 'Payment of % exceeds the invoice balance of %', new.amount, (v_grand_total - v_other_paid)
      using errcode = '23514';
  end if;

  return new;
end;
$$;

-- Per-invoice VAT rate override. Null falls back to system_settings.vat_rate,
-- matching today's behavior exactly for every existing invoice.
alter table public.invoices
  add column if not exists vat_rate numeric(5,2) check (vat_rate is null or vat_rate >= 0);
comment on column public.invoices.vat_rate is 'Overrides system_settings.vat_rate for this invoice only (e.g. VAT-exempt shipments). Null = use the global rate.';

-- Receiver signature captured on delivery, mirroring shipments.delivery_proof_url's
-- private-bucket pattern rather than storing image bytes in the row.
alter table public.invoices
  add column if not exists receiver_signature_path text,
  add column if not exists receiver_signed_at timestamptz;
comment on column public.invoices.receiver_signature_path is 'Object path in the private signature-proofs bucket; read via a signed URL, never rendered directly.';
comment on column public.invoices.receiver_signed_at is 'Timestamp the receiver signature was captured, null until signed.';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signature-proofs', 'signature-proofs', false, 2097152, array['image/png'])
on conflict (id) do nothing;

drop policy if exists "Ops read receiver signatures" on storage.objects;
create policy "Ops read receiver signatures" on storage.objects
  for select to authenticated
  using (bucket_id = 'signature-proofs' and public.is_ops());

drop policy if exists "Ops upload receiver signatures" on storage.objects;
create policy "Ops upload receiver signatures" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'signature-proofs' and public.is_ops());

drop policy if exists "Ops replace receiver signatures" on storage.objects;
create policy "Ops replace receiver signatures" on storage.objects
  for update to authenticated
  using (bucket_id = 'signature-proofs' and public.is_ops())
  with check (bucket_id = 'signature-proofs' and public.is_ops());

drop policy if exists "Admins delete receiver signatures" on storage.objects;
create policy "Admins delete receiver signatures" on storage.objects
  for delete to authenticated
  using (bucket_id = 'signature-proofs' and public.is_admin());
