import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface MobileRowCardProps {
  /** The row's identifying line — tracking number, invoice number, name. */
  header: ReactNode
  /** Row actions, placed opposite `header`. */
  actions?: ReactNode
  /** `DetailRow`s describing the record. */
  children?: ReactNode
  /** Full-width control below the details, e.g. "Record payment". */
  footer?: ReactNode
  className?: string
}

/** The card every list view renders below the `sm` breakpoint in place of a table row. */
export function MobileRowCard({ header, actions, children, footer, className }: MobileRowCardProps) {
  return (
    <div className={cn('rounded-deck bg-panel p-4 shadow-deck', className)}>
      <div className="flex items-start justify-between gap-2">
        {header}
        {actions}
      </div>
      {/* A `dl`, not a div: the children are `DetailRow`s, whose dt/dd pairs are
          only valid — and only announced as label/value — inside one. */}
      {children && <dl className="mt-3 space-y-2 border-t border-deck-100 pt-3">{children}</dl>}
      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}
