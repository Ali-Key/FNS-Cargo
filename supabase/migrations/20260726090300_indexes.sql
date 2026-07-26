-- 20260726090300_indexes.sql
-- Indexes on every hot path: FK columns, filter columns, sort keys, and the
-- public tracking lookup keys. UNIQUE constraints already create indexes for
-- shipments.tracking_number and admin_users.user_id, so those are not repeated.

-- reference_number: unique only among non-null values (partial unique index).
create unique index if not exists shipments_reference_number_key
  on public.shipments (reference_number)
  where reference_number is not null;

-- FKs + common filters/sorts on shipments.
create index if not exists shipments_customer_id_idx  on public.shipments (customer_id);
create index if not exists shipments_assigned_to_idx  on public.shipments (assigned_to);
create index if not exists shipments_status_idx       on public.shipments (status);
create index if not exists shipments_created_at_idx   on public.shipments (created_at desc);

-- Case-insensitive exact match used by track_shipment() (tracking OR reference).
create index if not exists shipments_tracking_upper_idx
  on public.shipments (upper(tracking_number));
create index if not exists shipments_reference_upper_idx
  on public.shipments (upper(reference_number))
  where reference_number is not null;

-- Trigram indexes back the dashboard ILIKE search without full scans.
create index if not exists shipments_search_trgm_idx
  on public.shipments using gin (
    (tracking_number || ' ' || sender_name || ' ' || receiver_name || ' ' || origin || ' ' || destination) extensions.gin_trgm_ops
  );
create index if not exists customers_search_trgm_idx
  on public.customers using gin (
    (full_name || ' ' || coalesce(email, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(city, '')) extensions.gin_trgm_ops
  );

create index if not exists customers_created_at_idx on public.customers (created_at desc);
create index if not exists customers_active_idx     on public.customers (is_active) where is_active;

-- Tracking history: parent FK + timeline sort.
create index if not exists sth_shipment_id_idx on public.shipment_tracking_history (shipment_id);
create index if not exists sth_event_time_idx  on public.shipment_tracking_history (event_time desc);

-- activity_logs feed sort + admin filtering.
create index if not exists activity_logs_created_at_idx on public.activity_logs (created_at desc);
create index if not exists activity_logs_entity_idx     on public.activity_logs (entity_type, entity_id);

-- Rate-limit window scans.
create index if not exists tracking_lookups_ip_time_idx on public.tracking_lookups (ip_hash, looked_up_at desc);
create index if not exists tracking_lookups_time_idx    on public.tracking_lookups (looked_up_at);

-- Archive lookup by tracking number (public tracking of archived shipments).
create index if not exists shipments_archive_tracking_upper_idx
  on public.shipments_archive (upper(tracking_number));
create index if not exists shipments_archive_reference_upper_idx
  on public.shipments_archive (upper(reference_number))
  where reference_number is not null;
create index if not exists sth_archive_shipment_id_idx
  on public.shipment_tracking_history_archive (shipment_id);
