-- profiles.email is only ever seeded once, by handle_new_auth_user() on INSERT.
-- There was no corresponding sync on UPDATE, so a confirmed Supabase Auth email
-- change (auth.users.email) never propagated to public.profiles.email, leaving
-- the profile row (and anything reading it, e.g. the admin Users list) permanently
-- stale after a successful "Sign-in email" change.

create or replace function public.handle_auth_user_email_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  update public.profiles
     set email = new.email
   where auth_user_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (new.email is distinct from old.email)
  execute function public.handle_auth_user_email_change();
