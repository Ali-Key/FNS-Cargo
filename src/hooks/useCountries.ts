import { useCallback } from 'react'
import { useCachedResource, invalidateCachedResources } from './useCachedResource'
import { listActiveCountries, listCountries } from '@/services/countriesService'
import type { Country } from '@/types'

/** Stable empty reference, so a consumer's `useMemo` deps don't churn while loading. */
const NONE: Country[] = []

const ACTIVE_KEY = 'countries:active'
const ALL_KEY = 'countries:all'

/**
 * The served-market list changes a few times a year, and the shipment form, the
 * tracking form and the public site all want it. Five minutes of freshness means
 * opening the shipment dialog ten times costs one request, while an admin edit
 * still lands everywhere on the next render — `invalidateCountries()` marks the
 * cached copies stale so they revalidate instead of waiting out the window.
 */
const STALE_MS = 5 * 60_000

/** Call after any country mutation so every other consumer picks the change up. */
export function invalidateCountries() {
  invalidateCachedResources('countries:')
}

export interface CountriesResource {
  countries: Country[]
  /** True only with nothing to show yet; a background refresh never sets it. */
  loading: boolean
  error: string | null
  reload: () => void
}

/** Countries a new shipment may be routed through, and the ones the site shows. */
export function useActiveCountries(): CountriesResource {
  const fetcher = useCallback(() => listActiveCountries(), [])
  const { data, loading, error, reload } = useCachedResource<Country[]>(ACTIVE_KEY, fetcher, {
    staleTime: STALE_MS,
  })
  return { countries: data ?? NONE, loading: loading && data === null, error, reload }
}

/** The full list including retired markets. Console-only. */
export function useAllCountries(): CountriesResource {
  const fetcher = useCallback(() => listCountries(), [])
  const { data, loading, error, reload } = useCachedResource<Country[]>(ALL_KEY, fetcher, {
    staleTime: STALE_MS,
  })
  return { countries: data ?? NONE, loading: loading && data === null, error, reload }
}
