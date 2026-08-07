import { supabase } from '@/lib/supabase'
import type { SystemSettings } from '@/types'

export async function getSystemSettings(): Promise<SystemSettings | null> {
  // Read through the public_settings() SECURITY DEFINER RPC so anonymous
  // visitors (footer, contact, home) never need a direct SELECT on the table.
  const { data, error } = await supabase.rpc('public_settings')
  if (!error) return (data as unknown as SystemSettings | null) ?? null

  // Graceful fallback: if the RPC is unavailable (e.g. not yet deployed),
  // try a direct read so the site still shows live settings for signed-in users.
  const fallback = await supabase.from('system_settings').select('*').limit(1).maybeSingle()
  if (fallback.error) throw error
  return fallback.data
}

/**
 * Full settings row, including admin-only fields. `public_settings()` deliberately
 * omits `vat_rate` (it is not part of the anon-facing payload), so anything that
 * reads or edits the VAT rate must go through this direct, RLS-gated read —
 * otherwise the rate silently reads as 0 and a save would overwrite the real one.
 */
export async function getAdminSystemSettings(): Promise<SystemSettings | null> {
  const { data, error } = await supabase.from('system_settings').select('*').limit(1).maybeSingle()
  if (error) throw error
  return data
}

export async function updateSystemSettings(
  id: string,
  updates: Partial<
    Pick<
      SystemSettings,
      | 'company_name'
      | 'company_email'
      | 'company_phone'
      | 'company_address'
      | 'company_website'
      | 'logo_url'
      | 'vat_rate'
    >
  >,
) {
  const { data, error } = await supabase.from('system_settings').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}
