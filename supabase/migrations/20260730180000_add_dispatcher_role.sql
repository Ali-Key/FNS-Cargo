-- Rename Staff -> Dispatcher and give the role real operational access.
-- Previously every dashboard policy required is_admin(), so a Staff account
-- could sign in but reach nothing. is_ops() is the new operational gate:
-- Admin or Dispatcher, both must be Active. Admin-only surfaces (profiles,
-- system_settings, activity_logs, finance) keep is_admin().

alter type public.user_role rename value 'Staff' to 'Dispatcher';
alter table public.profiles alter column role set default 'Dispatcher';

create or replace function public.is_ops()
returns boolean
language sql
stable security definer
set search_path to 'public', 'pg_temp'
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role in ('Admin', 'Dispatcher')
      and status = 'Active'
  );
$$;

comment on function public.is_ops() is
  'True when the caller is an Active Admin or Dispatcher. Operational RLS gate.';

grant execute on function public.is_ops() to authenticated;

-- New auth accounts default to Dispatcher, never Admin.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  insert into public.profiles (auth_user_id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'Dispatcher'),
    'Active'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- ---- shipments: dispatchers read/create/update; only admins delete ---------
drop policy if exists "Read own shipments or all as admin" on public.shipments;
create policy "Read own shipments or all as ops" on public.shipments
  for select to authenticated
  using (public.is_ops() or customer_id = public.current_customer_id());

drop policy if exists "Admins insert shipments" on public.shipments;
create policy "Ops insert shipments" on public.shipments
  for insert to authenticated with check (public.is_ops());

drop policy if exists "Admins update shipments" on public.shipments;
create policy "Ops update shipments" on public.shipments
  for update to authenticated using (public.is_ops()) with check (public.is_ops());

-- ---- tracking_updates: the dispatcher's core job --------------------------
drop policy if exists "Read own tracking or all as admin" on public.tracking_updates;
create policy "Read own tracking or all as ops" on public.tracking_updates
  for select to authenticated
  using (
    public.is_ops() or exists (
      select 1 from public.shipments s
       where s.id = tracking_updates.shipment_id
         and s.customer_id = public.current_customer_id()
    )
  );

drop policy if exists "Admins insert tracking" on public.tracking_updates;
create policy "Ops insert tracking" on public.tracking_updates
  for insert to authenticated with check (public.is_ops());

drop policy if exists "Admins update tracking" on public.tracking_updates;
create policy "Ops update tracking" on public.tracking_updates
  for update to authenticated using (public.is_ops()) with check (public.is_ops());

-- ---- customers: dispatchers read and update, admins create/delete ---------
drop policy if exists "Read own customer record or all as admin" on public.customers;
create policy "Read own customer record or all as ops" on public.customers
  for select to authenticated
  using (public.is_ops() or auth_user_id = (select auth.uid()));

drop policy if exists "Update own customer record or any as admin" on public.customers;
create policy "Update own customer record or any as ops" on public.customers
  for update to authenticated
  using (public.is_ops() or auth_user_id = (select auth.uid()))
  with check (public.is_ops() or auth_user_id = (select auth.uid()));

drop policy if exists "Admins create customers" on public.customers;
create policy "Ops create customers" on public.customers
  for insert to authenticated with check (public.is_ops());

-- ---- quotes: dispatchers triage, admins delete ----------------------------
drop policy if exists "Read own quotes or all as admin" on public.quotes;
create policy "Read own quotes or all as ops" on public.quotes
  for select to authenticated
  using (public.is_ops() or customer_id = public.current_customer_id());

drop policy if exists "Admins update quotes" on public.quotes;
create policy "Ops update quotes" on public.quotes
  for update to authenticated using (public.is_ops()) with check (public.is_ops());

-- ---- countries: dispatchers need the full list for shipment forms ---------
drop policy if exists "Anyone reads active countries" on public.countries;
create policy "Anyone reads active countries" on public.countries
  for select to anon, authenticated
  using (is_active or public.is_ops());
