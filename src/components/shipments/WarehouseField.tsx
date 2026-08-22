import type { ReactNode } from 'react'
import { Check, CircleAlert, Loader2, MapPin, Warehouse as WarehouseIcon } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import type { WarehouseAssignment } from '@/hooks/useWarehouses'

interface WarehouseFieldProps {
  /** Resolution state from `useWarehouseAssignment`, owned by the form. */
  assignment: WarehouseAssignment
  /** Origin country name currently on the form, for the wording. */
  origin: string | null | undefined
  /** The form's `warehouse_id` value. */
  value: string
  onChange: (warehouseId: string) => void
  /** Validation message from the form. */
  error?: string
  /**
   * A hand-typed warehouse from before this field had a relationship. Shown
   * only to explain what an automatic assignment replaced, never saved.
   */
  legacyLabel?: string | null
}

/** The framed, control-height surface the read-only states share with real inputs. */
function Frame({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'muted' }) {
  return (
    <div
      aria-live="polite"
      className={
        'flex min-h-10 items-center gap-2 rounded-deck-sm border px-3 text-sm ' +
        (tone === 'muted'
          ? 'border-dashed border-deck-150 bg-deck-50 text-deck-500'
          : 'border-deck-150 bg-deck-50 font-medium text-deck-800')
      }
    >
      {children}
    </div>
  )
}

const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500'

/**
 * Where the cargo is handled, decided by the origin rather than typed.
 *
 * One country, one warehouse is the normal case, so the normal case is no
 * interaction at all: the field fills itself in and says so. It becomes a
 * control only when the origin genuinely has more than one warehouse to choose
 * between, and it says plainly when it has none instead of letting a booking
 * proceed on a blank that looks deliberate.
 */
export function WarehouseField({ assignment, origin, value, onChange, error, legacyLabel }: WarehouseFieldProps) {
  const { status, options, selected, retry } = assignment

  // An automatic assignment can replace a hand-typed value that said something
  // else. Worth one line, so nobody thinks the old entry vanished silently.
  const replaced =
    legacyLabel && selected && legacyLabel.trim().toLowerCase() !== selected.name.trim().toLowerCase()
      ? legacyLabel.trim()
      : null

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className={LABEL} id="warehouse-field-label">
          Warehouse
        </span>
        {status === 'choice' && <span className="text-[11px] font-medium text-deck-400">Required</span>}
      </div>

      {status === 'idle' && (
        <Frame tone="muted">
          <MapPin className="h-4 w-4 shrink-0 text-deck-400" aria-hidden="true" />
          <span>Select an origin first</span>
        </Frame>
      )}

      {status === 'loading' && (
        <Frame tone="muted">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-signal-500" aria-hidden="true" />
          <span>Loading warehouses…</span>
        </Frame>
      )}

      {status === 'error' && (
        <>
          <Frame tone="muted">
            <CircleAlert className="h-4 w-4 shrink-0 text-status-delayed" aria-hidden="true" />
            <span className="text-status-delayed-ink">Unable to load warehouses</span>
          </Frame>
          <div>
            <Button type="button" variant="subtle" size="sm" onClick={retry}>
              Try again
            </Button>
          </div>
        </>
      )}

      {status === 'none' && (
        <>
          <Frame tone="muted">
            <CircleAlert className="h-4 w-4 shrink-0 text-status-pending" aria-hidden="true" />
            <span>No warehouse is available for this origin.</span>
          </Frame>
          <p className="text-[12px] text-deck-500">
            {origin} has no warehouse set up yet. Choose another origin, or ask an administrator to add one.
          </p>
        </>
      )}

      {status === 'auto' && selected && (
        <>
          <Frame>
            <WarehouseIcon className="h-4 w-4 shrink-0 text-deck-400" aria-hidden="true" />
            <span className="truncate">{selected.name}</span>
            {selected.city && (
              <span className="ml-auto shrink-0 text-[12px] font-normal text-deck-500">{selected.city}</span>
            )}
          </Frame>
          <p className="flex items-center gap-1 text-[12px] font-medium text-status-delivered-ink">
            <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            Automatically assigned
          </p>
          {replaced && <p className="text-[12px] text-deck-500">Replaces the earlier entry “{replaced}”.</p>}
        </>
      )}

      {status === 'choice' && (
        <>
          <Select
            id="warehouse_id"
            aria-labelledby="warehouse-field-label"
            placeholder="Select warehouse"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            error={error}
            options={options.map((w) => ({
              value: w.id,
              label: w.city ? `${w.name} — ${w.city}` : w.name,
            }))}
          />
          {!error && (
            <p className="text-[12px] text-deck-500">
              {origin} has {options.length} warehouses. Choose the one handling this cargo.
            </p>
          )}
        </>
      )}

      {error && status !== 'choice' && (
        <p className="flex items-center gap-1 text-[12px] font-medium text-status-delayed-ink">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
