-- Separate dashboard users from public customers.
--
-- Before: a single `profiles` table held both, discriminated by
-- `role = 'Admin' | 'Customer'`. There was no `users` table and no `customers`
-- table.
-- After:  `profiles` = dashboard access accounts only (Admin | Staff);
--         `customers` = public customer records, no dashboard access.
--
-- Customer ids are preserved through the move so shipments.customer_id and
-- quotes.customer_id keep pointing at the same records.

-- 1. Customer table ---------------------------------------------------------
create table public.customers (
  id           uuid primary key default gen_random_uuid(),
  -- Nullable: customers have no dashboard login today. Reserved for a future
  -- customer portal, where it links the record to its auth account.
  auth_user_id uuid unique references auth.users (id) on delete set null,
  full_name    text not null,
  email        text not null,
  phone        text,
  status       public.user_status not null default 'Active',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index customers_full_name_idx on public.customers (full_name);
create index customers_email_idx     on public.customers (lower(email));

create trigger customers_set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

-- 2. Move the customer records (ids preserved) ------------------------------
insert into public.customers (id, auth_user_id, full_name, email, phone, status, created_at, updated_at)
select id, auth_user_id, full_name, email, phone, status, created_at, updated_at
  from public.profiles
 where role = 'Customer';

-- 3. Repoint the foreign keys at the new table ------------------------------
alter table public.shipments
  drop constraint shipments_customer_id_fkey,
  add  constraint shipments_customer_id_fkey
       foreign key (customer_id) references public.customers (id) on delete set null;

alter table public.quotes
  drop constraint quotes_customer_id_fkey,
  add  constraint quotes_customer_id_fkey
       foreign key (customer_id) references public.customers (id) on delete set null;

-- 4. Customers no longer live in profiles -----------------------------------
delete from public.profiles where role = 'Customer';

-- 5. Name propagation follows the data --------------------------------------
create or replace function public.sync_shipment_customer_name()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
declare v_name text;
begin
  if new.customer_id is not null then
    select full_name into v_name from public.customers where id = new.customer_id;
    if v_name is not null then new.customer_name := v_name; end if;
  end if;
  return new;
end;
$$;

create or replace function public.propagate_customer_name()
returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  if new.full_name is distinct from old.full_name then
    update public.shipments set customer_name = new.full_name where customer_id = new.id;
  end if;
  return new;
end;
$$;

create trigger customers_propagate_name
  after update on public.customers
  for each row execute function public.propagate_customer_name();

drop trigger profiles_propagate_name on public.profiles;
drop function public.propagate_profile_name();

-- 6. Identity helper for customers ------------------------------------------
-- Mirrors current_profile_id(), but resolves the *customer* record. anon gets
-- EXECUTE so the public quote form's INSERT policy can evaluate (with no
-- session it simply returns NULL).
create or replace function public.current_customer_id()
returns uuid language sql stable security definer
set search_path to 'public', 'pg_temp' as $$
  select id from public.customers where auth_user_id = auth.uid() limit 1;
$$;

revoke all on function public.current_customer_id() from public;
grant execute on function public.current_customer_id() to anon, authenticated, service_role;

-- 7. RLS: customers ---------------------------------------------------------
alter table public.customers enable row level security;

revoke all on public.customers from anon;
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;

-- Admins manage every customer; a customer (once linked to an auth account)
-- may read and edit only its own record. anon has no access at all.
create policy "Read own customer record or all as admin" on public.customers
  for select to authenticated
  using (public.is_admin() or auth_user_id = (select auth.uid()));

create policy "Admins create customers" on public.customers
  for insert to authenticated
  with check (public.is_admin());

create policy "Update own customer record or any as admin" on public.customers
  for update to authenticated
  using (public.is_admin() or auth_user_id = (select auth.uid()))
  with check (public.is_admin() or auth_user_id = (select auth.uid()));

create policy "Admins delete customers" on public.customers
  for delete to authenticated
  using (public.is_admin());

-- 8. Policies that identified a customer by profile id ----------------------
-- customer_id now references customers(id), so current_profile_id() (a
-- dashboard-user id) would never match and these reads would silently return
-- nothing.
drop policy "Read own shipments or all as admin" on public.shipments;
create policy "Read own shipments or all as admin" on public.shipments
  for select to authenticated
  using (public.is_admin() or customer_id = public.current_customer_id());

drop policy "Read own quotes or all as admin" on public.quotes;
create policy "Read own quotes or all as admin" on public.quotes
  for select to authenticated
  using (public.is_admin() or customer_id = public.current_customer_id());

drop policy "Anyone submits a quote" on public.quotes;
create policy "Anyone submits a quote" on public.quotes
  for insert to anon, authenticated
  with check (customer_id is null or customer_id = public.current_customer_id());

-- 9. user_role: drop Customer, add Staff ------------------------------------
-- profiles now only ever holds dashboard accounts, so a Customer role there is
-- meaningless. Postgres cannot remove an enum value in place, so swap the type.
drop function public.admin_users_overview();

alter table public.profiles alter column role drop default;
alter type public.user_role rename to user_role_old;
create type public.user_role as enum ('Admin', 'Staff');
alter table public.profiles
  alter column role type public.user_role
  using (case when role::text = 'Admin' then 'Admin' else 'Staff' end)::public.user_role;
alter table public.profiles alter column role set default 'Staff';
drop type public.user_role_old;

-- 10. admin_users_overview(): same signature, no customer join --------------
-- Dashboard users are never a shipment's customer now, so the count is always
-- zero; the column stays so the client contract is unchanged.
create or replace function public.admin_users_overview()
returns table (
  id uuid, auth_user_id uuid, full_name text, email text, phone text,
  avatar_url text, role public.user_role, status public.user_status,
  created_at timestamptz, shipment_count bigint
)
language plpgsql stable security definer
set search_path to 'public', 'pg_temp' as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  return query
    select p.id, p.auth_user_id, p.full_name, p.email, p.phone, p.avatar_url,
           p.role, p.status, p.created_at, 0::bigint as shipment_count
      from public.profiles p
     order by p.created_at desc;
end;
$$;

revoke all on function public.admin_users_overview() from public;
grant execute on function public.admin_users_overview() to authenticated, service_role;

-- 11. New auth accounts default to Staff, never Admin -----------------------
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp' as $$
begin
  insert into public.profiles (auth_user_id, full_name, email, phone, role, status)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'Staff'),
    'Active'
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

-- 12. dashboard_stats(): count customers from the customers table -----------
create or replace function public.dashboard_stats()
returns jsonb language plpgsql stable security definer
set search_path to 'public', 'pg_temp' as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_shipments',     (select count(*) from public.shipments),
    'active_shipments',    (select count(*) from public.shipments where status <> 'Delivered'),
    'delivered_shipments', (select count(*) from public.shipments where status = 'Delivered'),
    'customers',           (select count(*) from public.customers),
    'active_customers',    (select count(*) from public.customers where status = 'Active'),
    'countries_served',    (select count(*) from public.countries where is_active),
    'pending_quotes',      (select count(*) from public.quotes where status = 'Pending'),
    'total_quotes',        (select count(*) from public.quotes),
    'status_breakdown', (
      select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      from (select status::text as status, count(*) as n from public.shipments group by 1) s
    ),
    'method_breakdown', (
      select coalesce(jsonb_object_agg(shipping_method, n), '{}'::jsonb)
      from (select shipping_method::text as shipping_method, count(*) as n from public.shipments group by 1) m
    ),
    'monthly_volume', (
      select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m.month, 'Mon'), 'shipments', m.n) order by m.month), '[]'::jsonb)
      from (
        select date_trunc('month', months.month) as month, count(s.id) as n
          from generate_series(date_trunc('month', now()) - interval '5 months',
                               date_trunc('month', now()), interval '1 month') as months(month)
          left join public.shipments s on date_trunc('month', s.created_at) = months.month
         group by 1
      ) m
    )
  );
end;
$$;
