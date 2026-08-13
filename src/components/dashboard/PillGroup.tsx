import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PillOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
  /** Count shown after the label, e.g. how many rows match this view. */
  count?: number
}

interface PillGroupProps<T extends string> {
  label: string
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
}

/**
 * Segmented view switch. Drawn as one track with a sliding selected segment
 * rather than separate outlined buttons, so it reads as "pick one view" and
 * not as a row of unrelated toggles.
 */
export function PillGroup<T extends string>({ label, options, value, onChange, className }: PillGroupProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-badge bg-deck-100 p-0.5', className)}
    >
      {options.map((opt) => {
        const active = opt.value === value
        const Icon = opt.icon
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'deck-focus inline-flex h-7 items-center gap-1.5 rounded-badge px-2.5 text-[12px] font-semibold transition-colors',
              active ? 'bg-panel text-deck-900 shadow-deck' : 'text-deck-500 hover:text-deck-900',
            )}
          >
            {Icon && <Icon className={cn('h-3.5 w-3.5', active ? 'text-signal-600' : 'text-deck-400')} aria-hidden="true" />}
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  'font-tabular rounded-badge px-1.5 text-[10px] font-bold',
                  active ? 'bg-deck-100 text-deck-700' : 'bg-deck-150 text-deck-500',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
