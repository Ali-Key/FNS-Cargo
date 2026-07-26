-- 20260726091000_seed_settings.sql
-- Seed the single system_settings row. Idempotent: the lock/unique constraint
-- means a second insert is a no-op. Values mirror the app's FALLBACK defaults.

insert into public.system_settings
  (company_name, company_email, company_phone, company_address, company_website, default_shipping_method)
values
  ('FNS Cargo', 'info@fnscargo.com', '+252 61 000 0000', 'Mogadishu, Somalia', 'https://fnscargo.com', 'sea')
on conflict (lock) do nothing;
