-- 20260726090400_functions_helpers.sql
-- RLS helper functions. SECURITY DEFINER so they can read admin_users regardless
-- of the caller's own RLS (this also prevents infinite recursion when the
-- admin_users policies call them). Locked search_path, STABLE, fully qualified.
--
-- Naming matches the generated frontend types (src/types/database.ts):
--   is_admin_user()           -> the spec's is_admin()
--   is_staff_or_admin_user()  -> the spec's is_staff() (true for staff AND admin)

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

create or replace function public.is_staff_or_admin_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users
    where user_id = (select auth.uid())
  );
$$;

-- Returns the caller's admin_users.id (their "staff id"), or NULL if none.
-- Used by ownership checks so policies stay readable.
create or replace function public.current_admin_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id
  from public.admin_users
  where user_id = (select auth.uid())
  limit 1;
$$;

revoke all on function public.is_admin_user()            from public;
revoke all on function public.is_staff_or_admin_user()   from public;
revoke all on function public.current_admin_id()         from public;
grant execute on function public.is_admin_user()          to authenticated;
grant execute on function public.is_staff_or_admin_user() to authenticated;
grant execute on function public.current_admin_id()       to authenticated;
