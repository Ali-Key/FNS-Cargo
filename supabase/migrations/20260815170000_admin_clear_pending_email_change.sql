-- Clearing a stuck email change.
--
-- A secure email change that fails part-way leaves auth.users.email_change
-- populated while email_change_sent_at is NULL and both token columns are
-- empty. GoTrue still exposes that as user.new_email, so the console shows a
-- "waiting on confirmation" banner forever -- but with no tokens there is no
-- link that can ever redeem it, and re-requesting the change hits the same
-- failure. This is the supported way for an Admin to drop that dead state so
-- the change can be requested again.
--
-- Only the email_change_* columns are touched. auth.users.email is deliberately
-- NOT written here: the address is mirrored in auth.identities.identity_data,
-- and moving one without the other breaks sign-in. Actually changing an address
-- belongs to the Admin API (Dashboard -> Authentication -> Users), which moves
-- both.

create or replace function public.admin_clear_pending_email_change(p_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user_id uuid;
  v_pending text;
begin
  -- The gate, not a convenience check: this function reads and writes auth.users
  -- with the definer's rights, so it must refuse anyone who is not an Admin.
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select auth_user_id into v_auth_user_id from public.profiles where id = p_profile_id;
  if v_auth_user_id is null then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select nullif(email_change, '') into v_pending from auth.users where id = v_auth_user_id;
  -- Nothing pending is a normal outcome, not a failure: two admins clicking the
  -- same button should not produce an error on the second click.
  if v_pending is null then
    return false;
  end if;

  -- Empty string, never NULL. GoTrue reads these columns unconditionally and a
  -- NULL token makes /token return 500 on the next sign-in.
  update auth.users
  set email_change = '',
      email_change_token_new = '',
      email_change_token_current = '',
      email_change_confirm_status = 0,
      email_change_sent_at = null,
      updated_at = now()
  where id = v_auth_user_id;

  return true;
end;
$$;

-- Postgres grants EXECUTE to PUBLIC by default, and anon inherits it; revoking
-- from anon alone would leave the function reachable without a session.
revoke execute on function public.admin_clear_pending_email_change(uuid) from public, anon;
grant execute on function public.admin_clear_pending_email_change(uuid) to authenticated;
