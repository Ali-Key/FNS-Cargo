-- Finance (invoices/payments) is documented as Admin-only (see CLAUDE.md and
-- ProtectedRoute's allow={['Admin']} on the Finance routes), but the SELECT and
-- INSERT policies were still gated on is_ops(), which also admits Dispatcher.
-- UPDATE/DELETE were already is_admin(). Align read/insert with the rest so a
-- Dispatcher cannot read or create finance data directly via the API.

drop policy if exists "Read own invoices or all as ops" on public.invoices;
create policy "Read own invoices or all as admin"
  on public.invoices for select
  to authenticated
  using (is_admin() or customer_id = current_customer_id());

drop policy if exists "Ops create invoices" on public.invoices;
create policy "Admins create invoices"
  on public.invoices for insert
  to authenticated
  with check (is_admin());

drop policy if exists "Ops read payments" on public.payments;
create policy "Admins read payments"
  on public.payments for select
  to authenticated
  using (is_admin());

drop policy if exists "Ops create payments" on public.payments;
create policy "Admins create payments"
  on public.payments for insert
  to authenticated
  with check (is_admin());
