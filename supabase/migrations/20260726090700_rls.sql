-- 20260726090700_rls.sql
-- Row Level Security: enable on EVERY table, default-deny, then least-privilege
-- allow. anon holds NO table privileges — it reaches data only through the
-- track_shipment() and public_settings() RPCs. authenticated is gated by RLS.
--
-- NOTE on SECURITY DEFINER: the RPCs are owned by `postgres`, which bypasses
-- RLS, so they can read what the calling role cannot. We deliberately do NOT
-- FORCE RLS, or those functions would lose that ability.

-- ---- Base grants -----------------------------------------------------------
grant usage on schema public to anon, authenticated;

-- anon never touches tables directly.
revoke all on all tables in schema public from anon;

-- authenticated may attempt DML; RLS decides row-by-row.
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---- Enable RLS everywhere -------------------------------------------------
alter table public.admin_users                        enable row level security;
alter table public.customers                          enable row level security;
alter table public.shipments                          enable row level security;
alter table public.shipment_tracking_history          enable row level security;
alter table public.activity_logs                      enable row level security;
alter table public.system_settings                    enable row level security;
alter table public.tracking_lookups                   enable row level security;
alter table public.tracking_number_counters           enable row level security;
alter table public.shipments_archive                  enable row level security;
alter table public.shipment_tracking_history_archive  enable row level security;

-- ===========================================================================
-- admin_users — a user may read THEIR OWN row (needed for role bootstrap in
-- AuthContext); admins manage all rows.
-- ===========================================================================
create policy admin_users_select on public.admin_users
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin_user());

create policy admin_users_insert on public.admin_users
  for insert to authenticated
  with check (public.is_admin_user());

create policy admin_users_update on public.admin_users
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy admin_users_delete on public.admin_users
  for delete to authenticated
  using (public.is_admin_user());

-- ===========================================================================
-- customers — staff read-only; admins full write.
-- ===========================================================================
create policy customers_select on public.customers
  for select to authenticated
  using (public.is_staff_or_admin_user());

create policy customers_insert on public.customers
  for insert to authenticated
  with check (public.is_admin_user());

create policy customers_update on public.customers
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

create policy customers_delete on public.customers
  for delete to authenticated
  using (public.is_admin_user());

-- ===========================================================================
-- shipments — staff read all + create; write limited to own assigned rows;
-- admins full control.
-- ===========================================================================
create policy shipments_select on public.shipments
  for select to authenticated
  using (public.is_staff_or_admin_user());

create policy shipments_insert on public.shipments
  for insert to authenticated
  with check (public.is_staff_or_admin_user());

create policy shipments_update on public.shipments
  for update to authenticated
  using (public.is_admin_user() or assigned_to = public.current_admin_id())
  with check (public.is_admin_user() or assigned_to = public.current_admin_id());

create policy shipments_delete on public.shipments
  for delete to authenticated
  using (public.is_admin_user());

-- ===========================================================================
-- shipment_tracking_history — staff read + insert; edit/delete limited to
-- admins or the staff member who owns the parent shipment.
-- ===========================================================================
create policy sth_select on public.shipment_tracking_history
  for select to authenticated
  using (public.is_staff_or_admin_user());

create policy sth_insert on public.shipment_tracking_history
  for insert to authenticated
  with check (public.is_staff_or_admin_user());

create policy sth_update on public.shipment_tracking_history
  for update to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.assigned_to = public.current_admin_id()
    )
  )
  with check (
    public.is_admin_user()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.assigned_to = public.current_admin_id()
    )
  );

create policy sth_delete on public.shipment_tracking_history
  for delete to authenticated
  using (
    public.is_admin_user()
    or exists (
      select 1 from public.shipments s
      where s.id = shipment_id and s.assigned_to = public.current_admin_id()
    )
  );

-- ===========================================================================
-- activity_logs — any dashboard user appends; only admins read. Immutable
-- (no update/delete policy => denied).
-- ===========================================================================
create policy activity_logs_insert on public.activity_logs
  for insert to authenticated
  with check (public.is_staff_or_admin_user());

create policy activity_logs_select on public.activity_logs
  for select to authenticated
  using (public.is_admin_user());

-- ===========================================================================
-- system_settings — dashboard users read the raw row; only admins update.
-- The public site reads via public_settings() (no anon table access).
-- ===========================================================================
create policy system_settings_select on public.system_settings
  for select to authenticated
  using (public.is_staff_or_admin_user());

create policy system_settings_update on public.system_settings
  for update to authenticated
  using (public.is_admin_user())
  with check (public.is_admin_user());

-- ===========================================================================
-- Archives — admins may read for auditing; public tracking reads them through
-- the definer RPC. No API writes (the archive job runs as owner/service role).
-- ===========================================================================
create policy shipments_archive_select on public.shipments_archive
  for select to authenticated
  using (public.is_admin_user());

create policy sth_archive_select on public.shipment_tracking_history_archive
  for select to authenticated
  using (public.is_admin_user());

-- ===========================================================================
-- tracking_lookups & tracking_number_counters — no policies at all. RLS is on,
-- so every direct API request is denied. Touched only by SECURITY DEFINER
-- functions and the service role.
-- ===========================================================================
