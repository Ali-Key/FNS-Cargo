import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, rows = 4, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-semibold text-navy-800">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(
            'w-full rounded-control border border-steel-200 bg-white px-3.5 py-3 text-sm text-navy-900 placeholder:text-steel-400 transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:border-navy-500',
            error && 'border-red-400 focus-visible:ring-red-500 focus-visible:border-red-500',
            className,
          )}
          aria-invalid={!!error}
          {...props}
        />
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        {!error && hint && <p className="text-xs text-steel-500">{hint}</p>}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'
