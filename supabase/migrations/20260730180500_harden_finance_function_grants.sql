-- Trigger helpers were reachable as PostgREST RPCs because Postgres grants
-- EXECUTE to PUBLIC by default. Nothing should call these but their triggers.
-- (Trigger-function privileges are checked at CREATE TRIGGER time, not at fire
-- time, so revoking here does not stop the triggers from running.)
revoke execute on function public.sync_invoice_totals() from public, anon, authenticated;
revoke execute on function public.invoice_touch_shipment() from public, anon, authenticated;
revoke execute on function public.sync_shipment_payment_status(uuid) from public, anon, authenticated;
revoke execute on function public.stamp_delivered_at() from public, anon, authenticated;
