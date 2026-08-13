-- Grant hygiene, following the convention set by harden_finance_function_grants
-- and revoke_anon_customer_balances_overview. No policy or business rule changes.

-- 1. Trigger-only helpers were reachable as PostgREST RPCs because Postgres
--    grants EXECUTE to PUBLIC by default. Nothing but their triggers should
--    call them. (Trigger-function privileges are checked at CREATE TRIGGER
--    time, not at fire time, so the triggers keep working.)
revoke execute on function public.set_invoice_customer_from_shipment() from public, anon, authenticated;
revoke execute on function public.propagate_customer_name() from public, anon, authenticated;
revoke execute on function public.handle_auth_user_email_change() from public, anon, authenticated;

-- 2. sequential_tracking_numbers recreated suggest_tracking_number(), and the
--    fresh function picked up Supabase's default direct grant to anon --
--    `revoke ... from public` does not remove it. It raises 42501 for
--    non-ops callers, but an unauthenticated role should not reach it at all.
revoke execute on function public.suggest_tracking_number() from anon;

-- 3. anon holds blanket table privileges (incl. DELETE/TRUNCATE) on four
--    tables it has no policy on and no code path to. RLS already denies every
--    one of these; this removes the grant behind it as well, matching the
--    `revoke all on public.customers from anon` already done in
--    separate_users_and_customers. Reads that anon legitimately needs go
--    through public_settings(), which is SECURITY DEFINER and unaffected.
revoke all on public.invoices from anon;
revoke all on public.payments from anon;
revoke all on public.activity_logs from anon;
revoke all on public.system_settings from anon;
