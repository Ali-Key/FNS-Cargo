-- 20260726090800_storage.sql
-- Storage buckets + object-level RLS. A private bucket is not enough on its own;
-- access to storage.objects is gated by the same helper functions as the tables.

-- Private bucket for shipment documents (invoices, customs docs, etc.).
-- MIME + size limits enforced at the bucket level.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents', 'documents', false, 26214400,  -- 25 MiB
  array['application/pdf', 'image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public bucket for approved marketing assets (logo, etc.).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'public-assets', 'public-assets', true, 5242880,  -- 5 MiB
  array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has RLS enabled by Supabase. Add our policies.

-- ---- documents (private): dashboard users only, all operations ----
create policy documents_read on storage.objects
  for select to authenticated
  using (bucket_id = 'documents' and public.is_staff_or_admin_user());

create policy documents_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'documents' and public.is_staff_or_admin_user());

create policy documents_update on storage.objects
  for update to authenticated
  using (bucket_id = 'documents' and public.is_staff_or_admin_user())
  with check (bucket_id = 'documents' and public.is_staff_or_admin_user());

create policy documents_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'documents' and public.is_admin_user());

-- ---- public-assets: world-readable, admin-writable ----
create policy public_assets_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'public-assets');

create policy public_assets_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_admin_user());

create policy public_assets_update on storage.objects
  for update to authenticated
  using (bucket_id = 'public-assets' and public.is_admin_user())
  with check (bucket_id = 'public-assets' and public.is_admin_user());

create policy public_assets_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_admin_user());
