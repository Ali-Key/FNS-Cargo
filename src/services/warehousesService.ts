import { supabase } from '@/lib/supabase'
import type { WarehouseWithCountry } from '@/types'

/**
 * Warehouses are the handling facilities a booking is routed through. Each one
 * belongs to a country, and that is the whole rule the shipment form runs on:
 * the origin country decides which warehouses are valid, so a dispatcher never
 * has to know an id or pick from a global list.
 *
 * A warehouse is also the branch: `code` is the branch code printed on the
 * waybill for cargo it handles, which is why it is read on every query here —
 * the shipment form shows it, and the database stamps it onto the booking.
 *
 * Reads are gated by the "Ops read warehouses" RLS policy — the signed-in
 * authenticated client is used everywhere, exactly as for every other table.
 */
const WAREHOUSE_COLUMNS =
  'id, country_id, name, code, city, is_active, sort_order, created_at, country:countries(id, name, code)'

/**
 * Every warehouse a new shipment may be assigned to, newest markets last.
 *
 * The whole list is fetched once and matched against the origin in memory: it
 * is a handful of rows that change a few times a year, and doing it this way
 * means changing the origin re-resolves the warehouse instantly instead of
 * firing a request per keystroke.
 */
export async function listActiveWarehouses(): Promise<WarehouseWithCountry[]> {
  const { data, error } = await supabase
    .from('warehouses')
    .select(WAREHOUSE_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as unknown as WarehouseWithCountry[]) ?? []
}

/**
 * One warehouse by id, active or retired.
 *
 * Editing a shipment booked through a warehouse that has since been retired
 * must still show its name rather than an empty field, and the retired row is
 * by definition absent from `listActiveWarehouses()`.
 */
export async function getWarehouse(id: string): Promise<WarehouseWithCountry | null> {
  const { data, error } = await supabase
    .from('warehouses')
    .select(WAREHOUSE_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return (data as unknown as WarehouseWithCountry | null) ?? null
}
