-- Reference waybill/invoice (Safe Express Cargo) prints a flight number (FLT)
-- that has no home in the schema yet. Air shipments only; nullable.
alter table public.shipments
  add column if not exists flight_number text;

comment on column public.shipments.flight_number is 'Flight/voyage reference printed on the invoice (label "FLT"). Air shipments only, null otherwise.';
