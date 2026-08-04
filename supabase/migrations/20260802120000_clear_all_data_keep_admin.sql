-- Clears all business data, keeping only Admin-role profiles.
-- Delete order respects FK dependencies (children before parents).

delete from public.payments;
delete from public.tracking_updates;
delete from public.invoices;
delete from public.quotes;
delete from public.shipments;
delete from public.customers;
delete from public.activity_logs;
delete from public.system_settings;
delete from public.countries;
delete from public.profiles where role <> 'Admin';
