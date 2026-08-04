import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface PillOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface PillGroupProps<T extends string> {
  label: string
  options: PillOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Segmented pill toggles used for table filters — active is navy, never orange. */
export function PillGroup<T extends string>({ label, options, value, onChange }: PillGroupProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
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
              'inline-flex items-center gap-1.5 rounded-badge border px-3 py-1.5 text-sm font-semibold transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-1',
              active
                ? 'border-navy-800 bg-navy-800 text-white'
                : 'border-gray-300 bg-white text-steel-600 hover:border-navy-300 hover:text-navy-800',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
