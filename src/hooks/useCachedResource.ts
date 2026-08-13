import { useCallback, useEffect, useRef, useState } from 'react'

const CACHE_PREFIX = 'FSN.cache.'
/** Envelope version. Entries written by an older shape are ignored, not migrated. */
const CACHE_VERSION = 2
/**
 * How long a cached entry is treated as current. Inside this window a remount
 * (route change, back/forward) reuses what is already there and issues no
 * request at all; outside it the cached copy still paints instantly and a
 * background request confirms it.
 */
const DEFAULT_STALE_MS = 20_000

interface Entry<T> {
  v: number
  data: T
  /** Epoch ms the payload was fetched. 0 marks it explicitly stale. */
  at: number
}

/**
 * In-memory mirror of the localStorage cache. It is the fast path: a route
 * change reads an object that is already parsed, and two components mounting
 * against the same key share one entry instead of two JSON.parse calls.
 */
const memory = new Map<string, Entry<unknown>>()
/** Keyed promises, so concurrent mounts of the same resource make one request. */
const inflight = new Map<string, Promise<unknown>>()

function readEntry<T>(key: string): Entry<T> | null {
  const hit = memory.get(key)
  if (hit) return hit as Entry<T>

  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Entry<T>
    if (!parsed || parsed.v !== CACHE_VERSION) return null
    memory.set(key, parsed as Entry<unknown>)
    return parsed
  } catch {
    return null
  }
}

function writeEntry<T>(key: string, data: T) {
  const entry: Entry<T> = { v: CACHE_VERSION, data, at: Date.now() }
  memory.set(key, entry as Entry<unknown>)
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry))
  } catch {
    // Storage unavailable or over quota. The in-memory copy still serves this
    // tab; only cross-tab and post-reload reuse are lost.
  }
}

/**
 * Drops every cached resource, in memory and on disk. Called on sign-out so a
 * shared machine never paints one account's data for the next.
 */
export function clearAllCachedResources() {
  memory.clear()
  inflight.clear()
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(CACHE_PREFIX)) localStorage.removeItem(k)
    }
  } catch {
    // Storage unavailable — the in-memory clear above is what matters.
  }
}

/**
 * Marks cached entries stale without discarding them. Use after a mutation that
 * changes data other pages show: those pages still paint instantly from cache
 * on the next visit, but revalidate immediately instead of waiting out the
 * freshness window. Pass a prefix to scope it (e.g. `'shipments:'`).
 */
export function invalidateCachedResources(prefix = '') {
  for (const [key, entry] of memory) {
    if (key.startsWith(prefix)) memory.set(key, { ...entry, at: 0 })
  }
  try {
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(CACHE_PREFIX + prefix)) continue
      const raw = localStorage.getItem(k)
      if (!raw) continue
      const parsed = JSON.parse(raw) as Entry<unknown>
      if (parsed?.v === CACHE_VERSION) localStorage.setItem(k, JSON.stringify({ ...parsed, at: 0 }))
    }
  } catch {
    // Storage unavailable — the in-memory pass above already applies.
  }
}

/** One request per key at a time, so concurrent mounts don't duplicate it. */
function request<T>(key: string, fetcher: () => Promise<T>, force: boolean): Promise<T> {
  if (!force) {
    const pending = inflight.get(key)
    if (pending) return pending as Promise<T>
  }

  const promise = fetcher()
    .then((result) => {
      writeEntry(key, result)
      return result
    })
    .finally(() => {
      if (inflight.get(key) === promise) inflight.delete(key)
    })

  inflight.set(key, promise as Promise<unknown>)
  return promise
}

export interface CachedResourceOptions {
  /** Milliseconds a cached copy is reused without a background request. */
  staleTime?: number
}

export interface CachedResource<T> {
  data: T | null
  /** True only when there is nothing to show yet. Never true for a refresh. */
  loading: boolean
  /** A background request is confirming data that is already on screen. */
  refreshing: boolean
  error: string | null
  reload: () => void
  /** Applies a local change to the cached payload (optimistic list updates). */
  mutate: (updater: (current: T) => T) => void
}

/**
 * Stale-while-revalidate for read-heavy pages.
 *
 * Mount order is: paint whatever is cached, then decide whether to talk to the
 * network at all. A cached copy inside the freshness window is reused as-is, so
 * navigating back to a page costs zero requests; an older copy still paints
 * first and is confirmed behind the UI. Only a cold key ever shows a loading
 * state, and a failed background revalidation keeps the last good data on
 * screen instead of clearing it.
 *
 * This is a rendering hint, never a trust boundary: every read still goes
 * through the same RLS-gated query, and sign-out clears the cache.
 */
export function useCachedResource<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CachedResourceOptions = {},
): CachedResource<T> {
  const { staleTime = DEFAULT_STALE_MS } = options

  const [data, setData] = useState<T | null>(() => readEntry<T>(key)?.data ?? null)
  const [loading, setLoading] = useState(() => readEntry<T>(key) === null)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mounted = useRef(true)
  /** Guards against an older in-flight load overwriting a newer one. */
  const requestId = useRef(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const dataRef = useRef(data)
  dataRef.current = data

  const run = useCallback(async (cacheKey: string, background: boolean, force = false) => {
    const id = ++requestId.current
    if (background) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await request(cacheKey, () => fetcherRef.current(), force)
      if (!mounted.current || id !== requestId.current) return
      setData(result)
      setError(null)
    } catch (err) {
      if (!mounted.current || id !== requestId.current) return
      // A failed background refresh must never wipe what is already on screen.
      if (!background) setError(err instanceof Error ? err.message : 'Unable to load data.')
    } finally {
      if (mounted.current && id === requestId.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true

    const entry = readEntry<T>(key)
    if (entry) {
      setData(entry.data)
      setError(null)
      setLoading(false)
      // Fresh enough to trust: reuse it and make no request at all.
      if (Date.now() - entry.at < staleTime) setRefreshing(false)
      else void run(key, true)
    } else {
      // Nothing cached for this key. Any data still on screen belongs to the
      // previous key (a filter or page change), so it stays visible while the
      // new view loads rather than flashing an empty table.
      void run(key, false)
    }

    return () => {
      mounted.current = false
    }
  }, [key, staleTime, run])

  // A manual reload follows a mutation, so it must bypass both the freshness
  // window and any request that was already in flight before the write.
  const reload = useCallback(() => void run(key, Boolean(data), true), [run, key, data])

  // An optimistic row edit has to reach the cache as well as the screen,
  // otherwise navigating away and back would resurrect the pre-edit row.
  const mutate = useCallback((updater: (current: T) => T) => {
    const current = dataRef.current
    if (current === null) return
    const next = updater(current)
    writeEntry(key, next)
    setData(next)
  }, [key])

  return { data, loading, error, refreshing, reload, mutate }
}
