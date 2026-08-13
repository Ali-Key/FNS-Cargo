import type { ReactNode } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

const FIELD_LABEL = 'text-[12px] font-semibold uppercase tracking-[0.06em] text-deck-500'

/**
 * The control surface every form input shares: a hairline ring that thickens
 * to the signal colour on focus, and an error state that reads as a state
 * rather than a repaint.
 */
export const FIELD_CONTROL =
  'w-full rounded-deck-sm border border-deck-150 bg-panel text-deck-900 placeholder:text-deck-400 transition-colors duration-180 focus:outline-none focus:border-signal-500 focus:ring-2 focus:ring-signal-500/25 disabled:cursor-not-allowed disabled:bg-deck-50 disabled:text-deck-400'

export const FIELD_ERROR =
  'border-status-delayed focus:border-status-delayed focus:ring-status-delayed/25'

interface FieldShellProps {
  id?: string
  label?: string
  error?: string
  hint?: string
  /** Right-aligned note beside the label, e.g. "Optional". */
  note?: string
  className?: string
  children: ReactNode
}

/** Label + control + hint/error stack shared by Input, Select, and Textarea. */
export function FieldShell({ id, label, error, hint, note, className, children }: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className={FIELD_LABEL}>
            {label}
          </label>
          {note && <span className="text-[11px] font-medium text-deck-400">{note}</span>}
        </div>
      )}
      {children}
      {error ? (
        <p id={id ? `${id}-error` : undefined} className="flex items-center gap-1 text-[12px] font-medium text-status-delayed-ink">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && (
          <p id={id ? `${id}-hint` : undefined} className="text-[12px] text-deck-500">
            {hint}
          </p>
        )
      )}
    </div>
  )
}
