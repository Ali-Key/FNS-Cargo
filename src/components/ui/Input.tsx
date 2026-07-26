import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
  containerClassName?: string
  inputSize?: 'md' | 'lg'
}

const SIZE_STYLES: Record<NonNullable<InputProps['inputSize']>, string> = {
  md: 'h-11 px-3.5 text-sm',
  lg: 'h-14 px-4 text-lg font-mono',
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, containerClassName, label, error, hint, icon, id, inputSize = 'md', ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <div className={cn('flex flex-col gap-1.5', containerClassName)}>
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-navy-800">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full rounded-control border border-steel-200 bg-white text-navy-900 placeholder:text-steel-400 transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:border-navy-500',
              SIZE_STYLES[inputSize],
              icon && (inputSize === 'lg' ? 'pl-12' : 'pl-10'),
              error && 'border-red-400 focus-visible:ring-red-500 focus-visible:border-red-500',
              props.disabled && 'cursor-not-allowed bg-steel-50 text-steel-400',
              className,
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="text-xs text-steel-500">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'
