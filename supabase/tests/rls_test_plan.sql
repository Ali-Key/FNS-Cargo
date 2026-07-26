-- rls_test_plan.sql
-- Proves the RLS policies + tracking function behave per spec, for every role.
-- Run as the postgres/service role:  psql "$DIRECT_DB_URL" -f supabase/tests/rls_test_plan.sql
--
-- The whole run is wrapped in a transaction and ROLLED BACK at the end, so it
-- seeds throwaway data and leaves the database untouched. A PASS/FAIL table is
-- printed and the script RAISEs at the end if anything failed.
--
-- Why not just catch exceptions? For the `authenticated` role a policy-denied
-- SELECT/UPDATE/DELETE returns ZERO rows WITHOUT raising. So denial is asserted
-- by visibility (rows returned) and rows-affected, not by errors. `anon` has no
-- table grants at all, so its denials do raise — both cases are handled.

\set ON_ERROR_STOP on
begin;

-- ---------------------------------------------------------------------------
-- Harness lives in a real schema (not pg_temp) so it stays callable after
-- `set role`. Functions are SECURITY INVOKER: their dynamic SQL runs as the
-- caller, so RLS is enforced exactly as it would be for that role.
-- ---------------------------------------------------------------------------
create schema rls_test;
grant usage on schema rls_test to anon, authenticated;

create table rls_test.results (descr text, ok boolean);
grant insert, select on rls_test.results to anon, authenticated;

-- Can the current role SEE rows from this query? (raise => no; 0 rows => no)
create function rls_test.sel(p_descr text, p_sql text, p_expect_visible boolean)
returns void language plpgsql security invoker as $$
declare n integer; visible boolean;
begin
  begin
    execute 'select count(*) from (' || p_sql || ') q' into n;
    visible := n > 0;
  exception when insufficient_privilege then visible := false;
  end;
  insert into rls_test.results values (p_descr, visible = p_expect_visible);
end $$;

-- Did the write actually AFFECT rows? (raise => no; 0 rows affected => no)
create function rls_test.write(p_descr text, p_sql text, p_expect_effect boolean)
returns void language plpgsql security invoker as $$
declare n integer; effect boolean;
begin
  begin
    execute p_sql;
    get diagnostics n = row_count;
    effect := n > 0;
  exception
    when insufficient_privilege then effect := false;
    when check_violation then effect := false;
  end;
  insert into rls_test.results values (p_descr, effect = p_expect_effect);
end $$;

grant execute on function rls_test.sel(text, text, boolean)   to anon, authenticated;
grant execute on function rls_test.write(text, text, boolean) to anon, authenticated;

create function rls_test.act_as(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create function rls_test.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  execute 'set local role anon';
end $$;

-- ---------------------------------------------------------------------------
-- Seed throwaway fixtures (as postgres, bypassing RLS)
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        confirmation_token, recovery_token, email_change_token_new, email_change)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'admin@test.local', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '', '', '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'staff@test.local', crypt('password123', gen_salt('bf')),
   now(), now(), now(), '', '', '', '');

insert into public.admin_users (id, user_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'staff');

insert into public.customers (id, full_name, email, phone, address, city, country)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Test Customer', 'cust@test.local',
        '+252611234567', 'Line 1', 'Mogadishu', 'Somalia');

-- One shipment assigned to the staff member, one unassigned.
insert into public.shipments (id, tracking_number, reference_number, customer_id, assigned_to,
                              sender_name, receiver_name, origin, destination, shipping_method,
                              weight_kg, pieces, declared_value, status, notes)
values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'FNS-2026-000001', 'REF-AAA',
   'cccccccc-cccc-cccc-cccc-cccccccccccc', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'Sender A', 'Receiver A', 'Guangzhou', 'Mogadishu', 'air', 12.5, 3, 900.00, 'in_transit',
   'INTERNAL NOTE — should never be public'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'FNS-2026-000002', null,
   'cccccccc-cccc-cccc-cccc-cccccccccccc', null,
   'Sender B', 'Receiver B', 'Yiwu', 'Hargeisa', 'sea', 40.0, 1, 1500.00, 'pending', null);

insert into public.shipment_tracking_history (shipment_id, status, location, description)
values ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'in_transit', 'Guangzhou Hub', 'Departed origin');

-- An activity_logs row so "staff cannot read, admin can" is testable by visibility.
insert into public.activity_logs (action, entity_type, entity_id)
values ('seed.test', 'shipment', 'dddddddd-dddd-dddd-dddd-dddddddddddd');

-- ===========================================================================
-- ANON
-- ===========================================================================
select rls_test.act_as_anon();

select rls_test.sel('anon: SELECT shipments denied',       'select 1 from public.shipments', false);
select rls_test.sel('anon: SELECT customers denied',       'select 1 from public.customers', false);
select rls_test.sel('anon: SELECT system_settings denied', 'select 1 from public.system_settings', false);
select rls_test.write('anon: INSERT shipments denied',
  $q$insert into public.shipments (tracking_number, sender_name, receiver_name, origin, destination, shipping_method, weight_kg)
     values ('HACK-1','x','y','a','b','air',1)$q$, false);
select rls_test.sel('anon: track_shipment(valid) returns a row',
  $q$select public.track_shipment('FNS-2026-000001')$q$, true);
select rls_test.sel('anon: track_shipment(reference) returns a row',
  $q$select public.track_shipment('REF-AAA')$q$, true);
select rls_test.sel('anon: public_settings() returns a row',
  'select public.public_settings()', true);

reset role;

-- track_shipment field-level safety (unknown => empty, PII never present).
do $$
declare v jsonb;
begin
  perform set_config('request.jwt.claims', json_build_object('role','anon')::text, true);
  set local role anon;
  v := public.track_shipment('FNS-2026-000001');
  insert into rls_test.results values ('anon: track returns tracking_number', v ? 'tracking_number');
  insert into rls_test.results values ('anon: track includes timeline',       v ? 'tracking_history');
  insert into rls_test.results values ('anon: track hides customer_id',        not (v ? 'customer_id'));
  insert into rls_test.results values ('anon: track hides notes',              not (v ? 'notes'));
  insert into rls_test.results values ('anon: track hides declared_value',     not (v ? 'declared_value'));
  insert into rls_test.results values ('anon: track hides sender_phone',       not (v ? 'sender_phone'));
  insert into rls_test.results values ('anon: track hides receiver_phone',     not (v ? 'receiver_phone'));
  v := public.track_shipment('DOES-NOT-EXIST-123');
  insert into rls_test.results values ('anon: track(unknown) is null/empty', v is null);
end $$;
reset role;

-- ===========================================================================
-- STAFF
-- ===========================================================================
select rls_test.act_as('22222222-2222-2222-2222-222222222222');

select rls_test.sel('staff: SELECT shipments allowed',            'select 1 from public.shipments', true);
select rls_test.sel('staff: SELECT customers allowed (read-only)','select 1 from public.customers', true);
select rls_test.sel('staff: read activity_logs denied',           'select 1 from public.activity_logs', false);
select rls_test.write('staff: INSERT shipment allowed',
  $q$insert into public.shipments (tracking_number, sender_name, receiver_name, origin, destination, shipping_method, weight_kg)
     values ('FNS-2026-000900','s','r','o','d','road',5)$q$, true);
select rls_test.write('staff: UPDATE OWN assigned shipment allowed',
  $q$update public.shipments set status='delivered' where id='dddddddd-dddd-dddd-dddd-dddddddddddd'$q$, true);
select rls_test.write('staff: UPDATE UNASSIGNED shipment denied',
  $q$update public.shipments set status='delivered' where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$q$, false);
select rls_test.write('staff: UPDATE customers denied',
  $q$update public.customers set city='X' where id='cccccccc-cccc-cccc-cccc-cccccccccccc'$q$, false);
select rls_test.write('staff: DELETE shipment denied',
  $q$delete from public.shipments where id='dddddddd-dddd-dddd-dddd-dddddddddddd'$q$, false);
select rls_test.write('staff: INSERT tracking history allowed',
  $q$insert into public.shipment_tracking_history (shipment_id, status, location)
     values ('dddddddd-dddd-dddd-dddd-dddddddddddd','delivered','Mogadishu')$q$, true);

reset role;

-- Staff calling an admin-only function must be rejected with an error.
do $$
begin
  perform set_config('request.jwt.claims',
                     json_build_object('sub','22222222-2222-2222-2222-222222222222','role','authenticated')::text, true);
  set local role authenticated;
  begin
    perform public.admin_list_users();
    insert into rls_test.results values ('staff: admin_list_users denied', false);
  exception when others then
    insert into rls_test.results values ('staff: admin_list_users denied', true);
  end;
end $$;
reset role;

-- ===========================================================================
-- ADMIN
-- ===========================================================================
select rls_test.act_as('11111111-1111-1111-1111-111111111111');

select rls_test.sel('admin: SELECT shipments allowed',    'select 1 from public.shipments', true);
select rls_test.sel('admin: read activity_logs allowed',  'select 1 from public.activity_logs', true);
select rls_test.sel('admin: admin_list_users allowed',    'select 1 from public.admin_list_users()', true);
select rls_test.write('admin: UPDATE any shipment allowed',
  $q$update public.shipments set status='delayed' where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$q$, true);
select rls_test.write('admin: INSERT customer allowed',
  $q$insert into public.customers (full_name) values ('New Cust')$q$, true);
select rls_test.write('admin: UPDATE customer allowed',
  $q$update public.customers set city='Berbera' where id='cccccccc-cccc-cccc-cccc-cccccccccccc'$q$, true);
select rls_test.write('admin: DELETE shipment allowed',
  $q$delete from public.shipments where id='eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'$q$, true);
select rls_test.write('admin: UPDATE system_settings allowed',
  $q$update public.system_settings set company_phone='+252 61 999 9999' where lock='X'$q$, true);

reset role;

-- ===========================================================================
-- Summary
-- ===========================================================================
select descr as "Test", case when ok then 'PASS' else 'FAIL' end as "Result"
from rls_test.results order by ok, descr;

do $$
declare failed int; passed int;
begin
  select count(*) filter (where not ok), count(*) filter (where ok)
    into failed, passed from rls_test.results;
  raise notice '=== RLS TEST SUMMARY: % passed, % failed ===', passed, failed;
  if failed > 0 then
    raise exception '% RLS assertion(s) FAILED', failed;
  end if;
end $$;

rollback;
