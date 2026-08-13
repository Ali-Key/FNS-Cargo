import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { FIELD_CONTROL, FIELD_ERROR, FieldShell } from './Field'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  note?: string
  icon?: ReactNode
  /** Trailing adornment, e.g. a unit or a clear button. */
  suffix?: ReactNode
  containerClassName?: string
  inputSize?: 'sm' | 'md' | 'lg'
}

const SIZE_STYLES: Record<NonNullable<InputProps['inputSize']>, string> = {
  sm: 'h-9 px-3 text-[13px]',
  md: 'h-10 px-3 text-sm',
  lg: 'h-[52px] px-4 text-lg font-mono tracking-wide',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, error, hint, note, icon, suffix, id, inputSize = 'md', ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <FieldShell id={inputId} label={label} error={error} hint={hint} note={note} className={containerClassName}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-deck-400">{icon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              FIELD_CONTROL,
              SIZE_STYLES[inputSize],
              icon && (inputSize === 'lg' ? 'pl-11' : 'pl-9'),
              suffix && 'pr-10',
              error && FIELD_ERROR,
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-medium text-deck-400">{suffix}</span>
          )}
        </div>
      </FieldShell>
    )
  },
)
Input.displayName = 'Input'
