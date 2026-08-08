-- customer_balances_overview()'s two prior migrations only revoked EXECUTE
-- from `public`, not `anon` directly. Supabase's default ACL for the public
-- schema grants EXECUTE to anon/authenticated directly (not merely via
-- PUBLIC) on every new function, so `revoke ... from public` alone is a
-- no-op for anon here -- confirmed live: anon held EXECUTE on this function.
-- Not a data leak (the function raises 42501 for non-ops callers), but it
-- breaks the hardening convention every other RPC in this file follows
-- (analytics_report, admin_users_overview, is_ops, track_shipment all
-- revoke from anon explicitly).
revoke execute on function public.customer_balances_overview(uuid[]) from anon;
