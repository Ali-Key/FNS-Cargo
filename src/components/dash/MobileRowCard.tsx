import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface MobileRowCardProps {
  /** Tracking number / invoice number / amount — the row's identifying line. */
  header: ReactNode
  /** Row actions (usually a `RowActions` kebab), placed opposite `header`. */
  actions?: ReactNode
  /** `DetailRow`s describing the record. */
  children?: ReactNode
  /** Optional full-width control below the details, e.g. "Record payment". */
  footer?: ReactNode
  className?: string
}

/** The card shell every mobile list view (< sm breakpoint) uses in place of a table row. */
export function MobileRowCard({ header, actions, children, footer, className }: MobileRowCardProps) {
  return (
    <div className={cn('rounded-card border border-gray-200 bg-white p-4 shadow-elevation-1', className)}>
      <div className="flex items-start justify-between gap-3">
        {header}
        {actions}
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
      {footer}
    </div>
  )
}
