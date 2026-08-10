import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Dropdown } from '@/components/dash'

export interface FilterOption<T extends string> {
  value: T
  label: string
}

interface FilterDropdownProps<T extends string> {
  label: string
  options: FilterOption<T>[]
  value: T
  onChange: (value: T) => void
  /** Sentinel value treated as "no filter applied" for the active-state style. Defaults to 'all'. */
  allValue?: T
}

/** Compact "Label: Selection ▾" filter control — the standard filter-bar building block. */
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
            'inline-flex items-center gap-1.5 rounded-control border px-3 py-1.5 text-sm font-medium transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1',
            active
              ? 'border-navy-300 bg-navy-50 text-navy-800'
              : 'border-gray-300 bg-white text-steel-600 hover:border-navy-300 hover:text-navy-800',
          )}
        >
          <span className="text-steel-400">{label}:</span>
          {selected?.label ?? 'All'}
          <ChevronDown className="h-3.5 w-3.5 text-steel-400" />
        </button>
      }
      items={options.map((opt) => ({
        label: opt.label,
        onClick: () => onChange(opt.value),
        icon: opt.value === value ? <Check className="h-4 w-4" /> : <span className="w-4" />,
      }))}
    />
  )
}
