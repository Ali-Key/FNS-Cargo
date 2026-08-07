import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface FieldGroupProps {
  children: ReactNode
  /** Columns at the `sm` breakpoint and up; always one column below it. Defaults to 2. */
  columns?: 2 | 3
  className?: string
}

/** Groups related `Input`/`Select`/`Textarea` fields into one responsive row. */
export function FieldGroup({ children, columns = 2, className }: FieldGroupProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-5', columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2', className)}>
      {children}
    </div>
  )
}
