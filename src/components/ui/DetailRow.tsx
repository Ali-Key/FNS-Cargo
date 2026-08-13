import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface DetailRowProps {
  label: string
  value?: ReactNode
  children?: ReactNode
  mono?: boolean
  /** Adds a hairline under the row — for a stacked list of facts. */
  divider?: boolean
  /** Stack the label above the value instead of placing them on one line. */
  stacked?: boolean
}

/** Label/value pair for a `dl`. Pass `value` for text, `children` for a node. */
export function DetailRow({ label, value, children, mono, divider, stacked }: DetailRowProps) {
  if (stacked) {
    return (
      <div className={cn(divider && 'border-b border-deck-100 pb-3 last:border-0 last:pb-0')}>
        <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-deck-500">{label}</dt>
        <dd className={cn('mt-1 text-[13px] font-medium text-deck-900', mono && 'font-tabular')}>{children ?? value}</dd>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 text-[13px]',
        divider && 'border-b border-deck-100 pb-2 last:border-0 last:pb-0',
      )}
    >
      <dt className="shrink-0 text-deck-500">{label}</dt>
      <dd className={cn('min-w-0 truncate text-right font-medium text-deck-900', mono && 'font-tabular')}>
        {children ?? value}
      </dd>
    </div>
  )
}
