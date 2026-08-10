import type { ElementType, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Padding = 'none' | 'sm' | 'md' | 'lg'

const PADDING: Record<Padding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-8',
}

interface CardProps {
  children: ReactNode
  as?: ElementType
  /** Padding density. `none` (default) suits a table or list that manages its own row spacing. */
  padding?: Padding
  /**
   * Border (and, where needed, ring) override for a state-dependent surface —
   * e.g. `StatTile`'s attention border. Kept as one prop rather than a second
   * `border-*` class in `className`, since two border-color utilities on one
   * element resolve by generated CSS order, not by position in the class
   * string, and that order isn't something to depend on.
   */
  border?: string
  className?: string
  /** Forwarded to `as`, e.g. `to` when `as={Link}`. */
  [key: string]: unknown
}

/**
 * The dashboard's one surface: one radius, one border, one shadow.
 *
 * Before this existed, `rounded-card border border-gray-200 bg-white
 * shadow-elevation-1` was retyped by hand in roughly a dozen places — every
 * list page's table wrapper, `StatTile`, `DataToolbar`, `MobileRowCard`,
 * `DeliveryProofCard` — and `SectionCard` reimplemented the same string a
 * further three times for its own three variants. One definition now backs
 * all of it.
 */
export function Card({
  children,
  as: Tag = 'div',
  padding = 'none',
  border = 'border-gray-200',
  className,
  ...rest
}: CardProps) {
  return (
    <Tag
      className={cn('rounded-card border bg-white shadow-elevation-1', border, PADDING[padding], className)}
      {...rest}
    >
      {children}
    </Tag>
  )
}
