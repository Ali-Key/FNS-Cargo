import type { ReactNode } from 'react'
import { Card } from './Card'

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
    <Card padding="sm" className={className}>
      <div className="flex items-start justify-between gap-3">
        {header}
        {actions}
      </div>
      {children && <div className="mt-3 space-y-2">{children}</div>}
      {footer}
    </Card>
  )
}
