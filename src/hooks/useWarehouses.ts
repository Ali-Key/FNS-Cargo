import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCachedResource, invalidateCachedResources } from './useCachedResource'
import { getWarehouse, listActiveWarehouses } from '@/services/warehousesService'
import { nextWarehouseValue, warehousesForOrigin, type WarehouseAssignmentStatus } from '@/utils/warehouse'
import type { WarehouseWithCountry } from '@/types'

/** Stable empty reference, so a consumer's `useMemo` deps don't churn while loading. */
const NONE: WarehouseWithCountry[] = []

const ACTIVE_KEY = 'warehouses:active'

/** Warehouses change about as often as the served-market list they hang off. */
const STALE_MS = 5 * 60_000

/** Call after any warehouse mutation so every other consumer picks the change up. */
export function invalidateWarehouses() {
  invalidateCachedResources('warehouses:')
}

export interface WarehousesResource {
  warehouses: WarehouseWithCountry[]
  /** True only with nothing to show yet; a background refresh never sets it. */
  loading: boolean
  error: string | null
  reload: () => void
}

/** Every warehouse a new booking may be routed through. */
export function useActiveWarehouses(): WarehousesResource {
  const fetcher = useCallback(() => listActiveWarehouses(), [])
  const { data, loading, error, reload } = useCachedResource<WarehouseWithCountry[]>(ACTIVE_KEY, fetcher, {
    staleTime: STALE_MS,
  })
  return { warehouses: data ?? NONE, loading: loading && data === null, error, reload }
}

export interface WarehouseAssignment {
  status: WarehouseAssignmentStatus
  /** The warehouses valid for the current origin, in display order. */
  options: WarehouseWithCountry[]
  /** The currently assigned warehouse, resolved to its row. */
  selected: WarehouseWithCountry | null
  error: string | null
  retry: () => void
}

interface UseWarehouseAssignmentParams {
  /** Origin country name, as stored on `shipments.origin`. */
  origin: string | null | undefined
  /** The form's current `warehouse_id`. */
  value: string | null | undefined
  /** Called when the origin makes the current value wrong, or picks it for the operator. */
  onChange: (warehouseId: string) => void
  /** Pause resolution entirely (the dialog is closed). */
  enabled?: boolean
  /**
   * The warehouse an existing shipment already carries. Kept selectable even if
   * it has since been retired, so editing an old booking cannot silently
   * re-route the cargo — but only while it still belongs to the origin.
   */
  existingWarehouseId?: string | null
}

/**
 * Resolves the origin country to its warehouse and keeps the form value honest.
 *
 * The rule is the same in every direction: whatever the origin currently is
 * decides the candidates, and a value that is not among them cannot survive. So
 * changing China to Turkey drops the China warehouse and assigns the Turkish
 * one, and changing to a country with several clears the field back to a
 * deliberate choice rather than leaving a stale, wrong warehouse on the
 * booking.
 */
export function useWarehouseAssignment({
  origin,
  value,
  onChange,
  enabled = true,
  existingWarehouseId,
}: UseWarehouseAssignmentParams): WarehouseAssignment {
  const { warehouses, loading, error, reload } = useActiveWarehouses()

  // A retired warehouse is absent from the active list, so an existing booking
  // that uses one is fetched separately and folded back in.
  const [retained, setRetained] = useState<WarehouseWithCountry | null>(null)
  const [retainedFailed, setRetainedFailed] = useState(false)

  useEffect(() => {
    if (!enabled || !existingWarehouseId) {
      setRetained(null)
      setRetainedFailed(false)
      return
    }
    if (warehouses.some((w) => w.id === existingWarehouseId)) {
      setRetained(null)
      setRetainedFailed(false)
      return
    }
    let cancelled = false
    setRetainedFailed(false)
    getWarehouse(existingWarehouseId)
      .then((row) => {
        if (!cancelled) setRetained(row)
      })
      .catch(() => {
        // Not fatal: the active list still resolves the origin. The booking's
        // own warehouse just cannot be shown, which the reconciliation below
        // treats as "no longer valid".
        if (!cancelled) {
          setRetained(null)
          setRetainedFailed(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [enabled, existingWarehouseId, warehouses])

  const options = useMemo(() => {
    if (!enabled) return NONE
    const pool = retained ? [...warehouses, retained] : warehouses
    return warehousesForOrigin(pool, origin)
  }, [enabled, warehouses, retained, origin])

  const status: WarehouseAssignmentStatus = !enabled
    ? 'idle'
    : !(origin ?? '').trim()
      ? 'idle'
      : loading
        ? 'loading'
        : error
          ? 'error'
          : options.length === 0
            ? 'none'
            : options.length === 1
              ? 'auto'
              : 'choice'

  // `field.onChange` from react-hook-form is a fresh identity every render, so
  // it is read through a ref rather than depended on — otherwise the effect
  // below would re-run on every keystroke elsewhere in the form.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // The single place the form value is corrected. It runs only once the
  // candidates are actually known: while loading or after a failed read the
  // value is left alone, so a slow network never blanks an existing booking.
  const optionIds = options.map((w) => w.id).join(',')
  useEffect(() => {
    const next = nextWarehouseValue(status, optionIds ? optionIds.split(',') : [], value ?? '')
    if (next !== null) onChangeRef.current(next)
    // `retainedFailed` is a dep so that a booking whose own warehouse could not
    // be read is reconciled once that is known, not left half-resolved.
  }, [status, optionIds, value, retainedFailed])

  const selected = useMemo(() => options.find((w) => w.id === (value ?? '')) ?? null, [options, value])

  return { status, options, selected, error, retry: reload }
}
