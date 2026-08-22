import { supabase } from '@/lib/supabase'
import type { Country } from '@/types'
import { logActivity } from './activityService'

// `countries` is the served-market list. Every country selector in the app
// reads it; nothing keeps a parallel copy in the frontend.
const COUNTRY_COLUMNS = 'id, name, code, hub_city, lane, is_active, sort_order, created_at'

/** Every country, active or not. Console-only — the RLS select policy hands the
 *  full list to ops and active rows alone to everyone else. */
export async function listCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select(COUNTRY_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Country[]) ?? []
}

/**
 * The countries a new shipment may actually be routed through, and the ones the
 * public site advertises. Deactivating a country removes it from here without
 * touching a single historical shipment.
 */
export async function listActiveCountries(): Promise<Country[]> {
  const { data, error } = await supabase
    .from('countries')
    .select(COUNTRY_COLUMNS)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return (data as Country[]) ?? []
}

export interface CountryInput {
  name: string
  code: string
  hub_city: string
  lane: string | null
  is_active: boolean
  sort_order: number
}

/**
 * Which field already exists on another row, so the form can point at the field
 * instead of surfacing a raw constraint violation. The unique indexes on
 * `lower(name)` and `upper(code)` remain the actual guard — this only decides
 * the wording, and a race still lands on the 23505 branch in the caller.
 */
export type CountryConflict = 'name' | 'code' | null

export async function findCountryConflict(
  name: string,
  code: string,
  excludeId?: string,
): Promise<CountryConflict> {
  const nameQuery = supabase.from('countries').select('id').ilike('name', name).limit(1)
  const codeQuery = supabase.from('countries').select('id').ilike('code', code).limit(1)

  const [byName, byCode] = await Promise.all([
    excludeId ? nameQuery.neq('id', excludeId) : nameQuery,
    excludeId ? codeQuery.neq('id', excludeId) : codeQuery,
  ])
  if (byName.error) throw byName.error
  if (byCode.error) throw byCode.error

  if ((byName.data?.length ?? 0) > 0) return 'name'
  if ((byCode.data?.length ?? 0) > 0) return 'code'
  return null
}

export async function createCountry(input: CountryInput): Promise<Country> {
  const { data, error } = await supabase
    .from('countries')
    .insert(input)
    .select(COUNTRY_COLUMNS)
    .single()
  if (error) throw error
  await logActivity('country.created', 'country', data.id, { name: data.name, code: data.code })
  return data as Country
}

export async function updateCountry(id: string, input: Partial<CountryInput>): Promise<Country> {
  const { data, error } = await supabase
    .from('countries')
    .update(input)
    .eq('id', id)
    .select(COUNTRY_COLUMNS)
    .single()
  if (error) throw error
  await logActivity('country.updated', 'country', id, { name: data.name, code: data.code })
  return data as Country
}

/** Activate or retire a market. Never touches shipments already routed through it. */
export async function setCountryActive(id: string, isActive: boolean): Promise<Country> {
  const { data, error } = await supabase
    .from('countries')
    .update({ is_active: isActive })
    .eq('id', id)
    .select(COUNTRY_COLUMNS)
    .single()
  if (error) throw error
  await logActivity(isActive ? 'country.activated' : 'country.deactivated', 'country', id, {
    name: data.name,
  })
  return data as Country
}

/**
 * How much history a country is named in. `shipments.origin`/`destination` and
 * `tracking_updates.country` hold the country *name* rather than a foreign key,
 * so Postgres will happily delete a row that historical records still refer to
 * by name and leave those records pointing at nothing. This is what makes the
 * delete safe: the console refuses the delete while the count is non-zero and
 * offers deactivation instead.
 */
export interface CountryUsage {
  shipments: number
  trackingEvents: number
  total: number
}

export async function getCountryUsage(name: string): Promise<CountryUsage> {
  const [routed, scanned] = await Promise.all([
    supabase
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      // Quoted so a country name containing a comma cannot be read as a second
      // filter term.
      .or(`origin.eq."${name}",destination.eq."${name}"`),
    supabase.from('tracking_updates').select('id', { count: 'exact', head: true }).eq('country', name),
  ])
  if (routed.error) throw routed.error
  if (scanned.error) throw scanned.error

  const shipments = routed.count ?? 0
  const trackingEvents = scanned.count ?? 0
  return { shipments, trackingEvents, total: shipments + trackingEvents }
}

/**
 * Hard delete, refused while any shipment or tracking event still names the
 * country. Callers check `getCountryUsage` first for the explanatory message;
 * the re-check here closes the window between that read and this write.
 */
export async function deleteCountry(id: string, name: string): Promise<void> {
  const usage = await getCountryUsage(name)
  if (usage.total > 0) {
    throw new Error(
      `${name} is used by ${usage.shipments} shipment(s) and ${usage.trackingEvents} tracking event(s). Deactivate it instead.`,
    )
  }

  const { error } = await supabase.from('countries').delete().eq('id', id)
  if (error) throw error
  await logActivity('country.deleted', 'country', id, { name })
}
