import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DetailRowProps {
  label: string
  value?: ReactNode
  children?: ReactNode
  mono?: boolean
  /** Adds a divider below the row — for a stacked list of facts (e.g. an account summary). */
  divider?: boolean
}

/** Label/value row for a `SectionCard`'s `dl`. Pass `value` for plain text, or `children` for a badge/node. */
export function DetailRow({ label, value, children, mono, divider }: DetailRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 text-sm',
        divider && 'border-b border-gray-200 pb-3 last:border-0 last:pb-0',
      )}
    >
      <dt className="text-text-secondary">{label}</dt>
      <dd className={cn('text-right font-medium text-navy-800', mono && 'font-tabular')}>{children ?? value}</dd>
    </div>
  )
}
