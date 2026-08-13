import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import { FIELD_CONTROL, FIELD_ERROR, FieldShell } from './Field'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  note?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, note, id, rows = 4, ...props }, ref) => {
    const inputId = id ?? props.name
    return (
      <FieldShell id={inputId} label={label} error={error} hint={hint} note={note}>
        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          className={cn(FIELD_CONTROL, 'resize-y px-3 py-2.5 text-sm leading-relaxed', error && FIELD_ERROR, className)}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...props}
        />
      </FieldShell>
    )
  },
)
Textarea.displayName = 'Textarea'
