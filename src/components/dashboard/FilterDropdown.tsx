import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Dropdown } from '@/components/ui'

export interface FilterOption<T extends string> {
  value: T
  label: string
}

interface FilterDropdownProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Sentinel treated as "no filter applied" for the active style. Defaults to 'all'. */
  allValue?: T
}

/** Compact "Label · Selection ▾" control — the standard filter-bar building block.
 *  Control-shaped, not pill-shaped, and the same 36px height as the search box
 *  beside it, so the whole filter row sits on one baseline. */
export function FilterDropdown<T extends string>({
  label,
  options,
  value,
  onChange,
  allValue = 'all' as T,
}: FilterDropdownProps<T>) {
  const active = value !== allValue
  const selected = options.find((opt) => opt.value === value)

  return (
    <Dropdown
      align="left"
      trigger={
        <button
          type="button"
          className={cn(
            'deck-focus inline-flex h-9 items-center gap-1.5 rounded-deck-sm px-2.5 text-[12px] font-semibold transition-colors',
            active
              ? 'bg-deck-900 text-white hover:bg-deck-800'
              : 'bg-deck-100 text-deck-600 hover:bg-deck-150 hover:text-deck-900',
          )}
        >
          <span className={active ? 'text-deck-300' : 'text-deck-400'}>{label}</span>
          {selected?.label ?? 'All'}
          <ChevronDown className={cn('h-3.5 w-3.5', active ? 'text-deck-300' : 'text-deck-400')} aria-hidden="true" />
        </button>
      }
      items={options.map((opt) => ({
        label: opt.label,
        onClick: () => onChange(opt.value),
        icon:
          opt.value === value ? (
            <Check className="h-4 w-4 text-signal-600" aria-hidden="true" />
          ) : (
            <span className="w-4" aria-hidden="true" />
          ),
      }))}
    />
  )
}
