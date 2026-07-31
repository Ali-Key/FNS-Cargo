-- Delivery proof photos are private: they show a customer's door and signature.
-- Reads go through short-lived signed URLs, not a public bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('delivery-proofs', 'delivery-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

drop policy if exists "Ops read delivery proofs" on storage.objects;
create policy "Ops read delivery proofs" on storage.objects
  for select to authenticated
  using (bucket_id = 'delivery-proofs' and public.is_ops());

drop policy if exists "Ops upload delivery proofs" on storage.objects;
create policy "Ops upload delivery proofs" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'delivery-proofs' and public.is_ops());

drop policy if exists "Ops replace delivery proofs" on storage.objects;
create policy "Ops replace delivery proofs" on storage.objects
  for update to authenticated
  using (bucket_id = 'delivery-proofs' and public.is_ops())
  with check (bucket_id = 'delivery-proofs' and public.is_ops());

drop policy if exists "Admins delete delivery proofs" on storage.objects;
create policy "Admins delete delivery proofs" on storage.objects
  for delete to authenticated
  using (bucket_id = 'delivery-proofs' and public.is_admin());

-- CRM fields. `notes` is staff-facing only and never surfaced on the public site.
alter table public.customers
  add column if not exists notes text,
  add column if not exists company text,
  add column if not exists address text;

comment on column public.customers.notes is 'Internal staff notes. Not surfaced on the public site.';
