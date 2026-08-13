import { useEffect, useState } from 'react'
import { getSystemSettings } from '@/services/settingsService'
import type { SystemSettings } from '@/types'

const FALLBACK: SystemSettings = {
  id: '',
  singleton: true,
  company_name: 'FSN Cargo',
  company_email: 'info@FSNcargo.com',
  company_phone: '+252 61 1189286',
  company_address: 'Mogadishu, Somalia',
  company_website: 'https://FSNcargo.com',
  logo_url: null,
  default_shipping_method: 'Air Freight',
  vat_rate: 5,
  created_at: '',
  updated_at: '',
}

/**
 * Company settings are the same row for everyone and change rarely, but the
 * header, footer and page body all want them at once. Resolving through one
 * module-level promise means a page render costs a single public_settings()
 * round trip instead of one per consumer, and later navigations cost none.
 */
let cached: SystemSettings | null = null
let inflight: Promise<SystemSettings | null> | null = null

function loadSettings(): Promise<SystemSettings | null> {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = getSystemSettings()
      .then((data) => {
        if (data) cached = data
        return data
      })
      .catch(() => null)
      .finally(() => {
        inflight = null
      })
  }
  return inflight
}

/** Drops the shared copy after an admin edits the settings row. */
export function clearSystemSettingsCache() {
  cached = null
  inflight = null
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(() => cached ?? FALLBACK)
  const [loading, setLoading] = useState(() => cached === null)

  useEffect(() => {
    if (cached) return

    let active = true
    void loadSettings()
      .then((data) => {
        // Keep the fallback values if the fetch failed.
        if (active && data) setSettings(data)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  return { settings, loading }
}
