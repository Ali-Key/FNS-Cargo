-- Singleton company settings for the marketing site + dashboard Settings page.
create table if not exists public.system_settings (
  id                      uuid primary key default gen_random_uuid(),
  singleton               boolean not null default true unique,
  company_name            text not null default 'FNS Cargo',
  company_email           text not null default '',
  company_phone           text not null default '',
  company_address         text not null default '',
  company_website         text not null default '',
  logo_url                text,
  default_shipping_method text not null default 'Air Freight',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.system_settings is 'Single-row company configuration (name, contact, logo).';

-- keep updated_at fresh using the existing trigger fn
drop trigger if exists system_settings_set_updated_at on public.system_settings;
create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

alter table public.system_settings enable row level security;

drop policy if exists system_settings_admin_select on public.system_settings;
create policy system_settings_admin_select on public.system_settings
  for select to authenticated using (public.is_admin());

drop policy if exists system_settings_admin_update on public.system_settings;
create policy system_settings_admin_update on public.system_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Public, safe read of company info (anon never selects the table directly).
create or replace function public.public_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id',                      s.id,
    'company_name',            s.company_name,
    'company_email',           s.company_email,
    'company_phone',           s.company_phone,
    'company_address',         s.company_address,
    'company_website',         s.company_website,
    'logo_url',                s.logo_url,
    'default_shipping_method', s.default_shipping_method,
    'created_at',              s.created_at,
    'updated_at',              s.updated_at
  )
  from public.system_settings s
  order by s.created_at asc
  limit 1;
$$;

revoke all on function public.public_settings() from public;
grant execute on function public.public_settings() to anon, authenticated;

-- Seed the single row (idempotent via the singleton unique constraint).
insert into public.system_settings
  (company_name, company_email, company_phone, company_address, company_website, default_shipping_method)
values
  ('FNS Cargo', 'info@fnscargo.com', '+252 61 1189286', 'Mogadishu, Somalia', 'https://fnscargo.com', 'Air Freight')
on conflict (singleton) do nothing;
