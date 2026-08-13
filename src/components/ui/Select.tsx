import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/utils/cn'
import { FIELD_CONTROL, FIELD_ERROR, FieldShell } from './Field'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  note?: string
  options: SelectOption[]
  placeholder?: string
  selectSize?: 'sm' | 'md'
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, note, options, placeholder, id, selectSize = 'md', ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <FieldShell id={inputId} label={label} error={error} hint={hint} note={note}>
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              FIELD_CONTROL,
              'appearance-none pr-9',
              selectSize === 'sm' ? 'h-9 pl-3 text-[13px]' : 'h-10 pl-3 text-sm',
              error && FIELD_ERROR,
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deck-400"
            aria-hidden="true"
          />
        </div>
      </FieldShell>
    )
  },
)
Select.displayName = 'Select'
