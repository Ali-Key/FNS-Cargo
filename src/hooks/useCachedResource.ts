import { useCallback, useEffect, useRef, useState } from 'react'

const CACHE_PREFIX = 'fns.cache.'

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
  } catch {
    // Storage unavailable (private mode, quota). The fetch still works, just uncached.
  }
}

/** Drops every cached resource. Called on sign-out so a shared machine never paints
 *  one account's data for the next. */
export function clearAllCachedResources() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/**
 * Stale-while-revalidate for read-heavy pages. localStorage is shared across tabs,
 * so a cached copy paints instantly on mount (a new tab reuses what another tab
 * already fetched) while a background request confirms it's current. This is a
 * rendering hint only: the same RLS-gated Supabase query still runs every time, so
 * nothing bypasses security — a failed background revalidation just keeps the last
 * good data on screen instead of clearing it.
 */
export function useCachedResource<T>(key: string, fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(() => readCache<T>(key))
  const [loading, setLoading] = useState(() => readCache<T>(key) === null)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(
    async (background: boolean) => {
      const id = ++requestId.current
      if (!background) setLoading(true)
      try {
        const result = await fetcherRef.current()
        if (!mounted.current || id !== requestId.current) return
        setData(result)
        setError(null)
        writeCache(key, result)
      } catch (err) {
        if (!mounted.current || id !== requestId.current) return
        if (!background) {
          // Never surface the raw Supabase/PostgREST message — it can leak schema
          // or policy detail. Log it for diagnosis and show a human-readable one.
          console.error(err)
          setError('Unable to load data. Please try again.')
        }
      } finally {
        if (mounted.current && id === requestId.current) setLoading(false)
      }
    },
    [key],
  )

  useEffect(() => {
    mounted.current = true
    const cached = readCache<T>(key)
    if (cached !== null) {
      setData(cached)
      setError(null)
      setLoading(false)
      void load(true)
    } else {
      void load(false)
    }
    return () => {
      mounted.current = false
    }
  }, [key, load])

  const reload = useCallback(() => void load(false), [load])

  return { data, loading, error, reload }
}
