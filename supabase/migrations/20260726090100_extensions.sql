-- 20260726090100_extensions.sql
-- Extensions live in the dedicated `extensions` schema (Supabase convention) so
-- application code never depends on them being on the default search_path.

create schema if not exists extensions;

-- gen_random_uuid(), digest()/hmac() for hashing IPs in the rate limiter.
create extension if not exists pgcrypto with schema extensions;

-- moddatetime() — the auto-update trigger for updated_at columns.
create extension if not exists moddatetime with schema extensions;

-- pg_cron powers the scheduled archive + rate-limit purge jobs. It may not be
-- installable from a migration in every environment (needs elevated rights and
-- must target the configured cron database), so this is best-effort: if it
-- can't be created here, enable it once in Dashboard → Database → Extensions and
-- the scheduling block in the archive migration will pick it up.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron not created here (%). Enable it in the Dashboard, then re-run the scheduling block.', sqlerrm;
end $$;

-- Trigram index support for fast ILIKE search on names / tracking numbers.
create extension if not exists pg_trgm with schema extensions;
