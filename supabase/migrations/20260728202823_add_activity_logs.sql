-- Audit trail for dashboard mutations. Admins read; any signed-in user appends.
create table if not exists public.activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  details     jsonb,
  created_at  timestamptz not null default now()
);

comment on table public.activity_logs is 'Append-only audit log of dashboard actions.';

create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

alter table public.activity_logs enable row level security;

-- Admins can read the trail.
drop policy if exists activity_logs_admin_select on public.activity_logs;
create policy activity_logs_admin_select on public.activity_logs
  for select to authenticated using (public.is_admin());

-- Any authenticated dashboard user may append (best-effort logging).
drop policy if exists activity_logs_insert on public.activity_logs;
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated with check ((select auth.uid()) is not null);
