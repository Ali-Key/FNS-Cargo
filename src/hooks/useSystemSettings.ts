import { useEffect, useState } from 'react'
import { getSystemSettings } from '@/services/settingsService'
import type { SystemSettings } from '@/types'

const FALLBACK: SystemSettings = {
  id: '',
  singleton: true,
  company_name: 'FNS Cargo',
  company_email: 'info@fnscargo.com',
  company_phone: '+252 61 1189286',
  company_address: 'Mogadishu, Somalia',
  company_website: 'https://fnscargo.com',
  logo_url: null,
  default_shipping_method: 'Air Freight',
  created_at: '',
  updated_at: '',
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>(FALLBACK)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getSystemSettings()
      .then((data) => {
        if (active && data) setSettings(data)
      })
      .catch(() => {
        // keep fallback values if the fetch fails
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
