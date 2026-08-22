import type { WarehouseWithCountry } from '@/types'

/**
 * What the warehouse field should be showing right now.
 *
 * `idle`    no origin picked yet — there is nothing to resolve against
 * `loading` waiting on the warehouse list, so nothing is shown yet
 * `error`   the list could not be read; the field offers a retry
 * `none`    the origin genuinely has no warehouse
 * `auto`    exactly one candidate, already assigned
 * `choice`  several candidates, the dispatcher picks one
 *
 * `error` and `none` are deliberately separate: a failed read is not evidence
 * that a country has no warehouse, and saying it has none would be a lie that
 * ends in a shipment booked without one.
 */
export type WarehouseAssignmentStatus = 'idle' | 'loading' | 'error' | 'none' | 'auto' | 'choice'

/**
 * The warehouses valid for one origin country, in the order given.
 *
 * Matching is on the country name because that is what `shipments.origin`
 * stores — the same value the origin picker writes, taken from `countries.name`
 * — and it is compared case-insensitively so a legacy row that recorded "china"
 * still resolves. A warehouse whose country row did not join is dropped rather
 * than offered: an unattributable warehouse is never "valid for this origin".
 */
export function warehousesForOrigin(
  warehouses: WarehouseWithCountry[],
  origin: string | null | undefined,
): WarehouseWithCountry[] {
  const key = (origin ?? '').trim().toLowerCase()
  if (!key) return []
  return warehouses.filter((w) => (w.country?.name ?? '').trim().toLowerCase() === key)
}

/**
 * What `warehouse_id` should become, given what the origin currently allows.
 * Returns the id to set, `''` to clear, or `null` to leave the value alone.
 *
 * This is the whole assignment rule, kept apart from React so it can be read —
 * and tested — as the single sentence it is: the origin's candidates decide the
 * value, one candidate needs no decision, and a value that is not a candidate
 * cannot stay.
 *
 * `loading` and `error` deliberately change nothing. A slow or failing read
 * must never blank the warehouse on a booking that already has one.
 */
export function nextWarehouseValue(
  status: WarehouseAssignmentStatus,
  optionIds: string[],
  current: string,
): string | null {
  if (status === 'auto') return optionIds[0] === current ? null : optionIds[0]
  if (status === 'choice') return current && !optionIds.includes(current) ? '' : null
  if (status === 'none') return current ? '' : null
  return null
}

/**
 * What the branch code field should be showing right now.
 *
 * `pending`     the warehouse is not decided yet, so neither is the branch
 * `assigned`    the linked branch issued this code — the normal case
 * `existing`    the code this shipment was booked with, before branches had one
 * `unavailable` no branch can be determined, so no code can be issued
 *
 * `pending` and `unavailable` are separate for the same reason `loading` and
 * `none` are on the warehouse: "not known yet" must never be presented — or
 * saved — as "there is none".
 */
export type BranchCodeStatus = 'pending' | 'assigned' | 'existing' | 'unavailable'

export interface BranchCodeResolution {
  status: BranchCodeStatus
  /** The code to display. `null` whenever none can be shown. */
  code: string | null
}

/**
 * The branch code for a booking, derived from the branch handling it.
 *
 * There is one rule and no input: a shipment is linked to a warehouse, the
 * warehouse is the branch, and the branch carries the code. The database
 * stamps `shipments.branch_code` from that same link on write
 * (sync_shipment_warehouse_link()), so this only decides what the operator
 * sees while the form is open — it can never disagree with what is stored.
 *
 * `existingCode` is the code already on the shipment being edited. It is shown
 * when the link cannot produce one, so a booking made before branches had
 * codes keeps displaying — and saving — what is printed on its waybill.
 */
export function resolveBranchCode(
  status: WarehouseAssignmentStatus,
  selected: WarehouseWithCountry | null,
  existingCode?: string | null,
): BranchCodeResolution {
  const issued = (selected?.code ?? '').trim().toUpperCase()
  if (issued) return { status: 'assigned', code: issued }

  const existing = (existingCode ?? '').trim().toUpperCase()
  if (existing) return { status: 'existing', code: existing }

  // Still resolving, or waiting on a warehouse the operator has to pick.
  if (status === 'idle' || status === 'loading' || status === 'choice') {
    return { status: 'pending', code: null }
  }

  return { status: 'unavailable', code: null }
}
