import { Check, CircleAlert, Loader2, Building2 } from 'lucide-react'
import type { BranchCodeResolution } from '@/utils/warehouse'

interface BranchCodeFieldProps {
  /** Resolution from `resolveBranchCode`, owned by the form. */
  branch: BranchCodeResolution
  /** The branch that issued the code, for the one-line explanation. */
  branchName?: string | null
  /** Origin country name currently on the form, for the wording. */
  origin?: string | null
}

const LABEL = 'text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500'

/**
 * The branch code, shown and never typed.
 *
 * It is not an input in any state. The code belongs to the branch handling the
 * cargo, the origin decides that branch, and the database stamps it onto the
 * booking from the same link — so there is nothing here for an operator to
 * decide, and a field that looked editable would only invite a value the save
 * would overwrite.
 */
export function BranchCodeField({ branch, branchName, origin }: BranchCodeFieldProps) {
  const { status, code } = branch

  return (
    <div className="flex flex-col gap-1.5">
      <span className={LABEL} id="branch-code-field-label">
        Branch code
      </span>

      <div
        aria-live="polite"
        aria-labelledby="branch-code-field-label"
        className={
          'flex min-h-10 items-center gap-2 rounded-deck-sm border px-3 text-sm ' +
          (code
            ? 'border-deck-150 bg-deck-50 font-mono text-base font-bold tracking-[0.08em] text-deck-900'
            : 'border-dashed border-deck-150 bg-deck-50 text-deck-500')
        }
      >
        {status === 'pending' && (
          <>
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-signal-500" aria-hidden="true" />
            <span>Waiting for the branch…</span>
          </>
        )}

        {status === 'unavailable' && (
          <>
            <CircleAlert className="h-4 w-4 shrink-0 text-status-delayed" aria-hidden="true" />
            <span className="text-status-delayed-ink">No branch code available</span>
          </>
        )}

        {code && (
          <>
            <Building2 className="h-4 w-4 shrink-0 text-deck-400" aria-hidden="true" />
            <span>{code}</span>
          </>
        )}
      </div>

      {status === 'assigned' && (
        <p className="flex items-center gap-1 text-[12px] font-medium text-status-delivered-ink">
          <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Automatically assigned{branchName ? ` from ${branchName}` : ''}
        </p>
      )}

      {status === 'existing' && (
        <p className="text-[12px] text-deck-500">
          Issued when this shipment was booked. It updates once a branch is assigned.
        </p>
      )}

      {status === 'pending' && (
        <p className="text-[12px] text-deck-500">Assigned automatically once the warehouse is known.</p>
      )}

      {status === 'unavailable' && (
        <p className="text-[12px] font-medium text-status-delayed-ink">
          {origin ? `${origin} has no branch that can issue a code.` : 'No branch could be determined.'} This shipment
          cannot be saved until one is available — ask an administrator to set up a warehouse for this origin.
        </p>
      )}
    </div>
  )
}
