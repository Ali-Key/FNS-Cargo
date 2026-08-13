import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  /** 'panel' fills a table or list body; 'inline' is a compact strip inside a card. */
  variant?: 'panel' | 'inline'
  className?: string
}

/** Nothing-here state. Always says what would appear here and what to do next. */
export function EmptyState({ icon, title, description, action, variant = 'panel', className }: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-3 px-4 py-6 text-left', className)}>
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-deck-sm bg-deck-100 text-deck-500">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-deck-900">{title}</p>
          {description && <p className="text-[12px] text-deck-500">{description}</p>}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      {icon && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-deck bg-deck-100 text-deck-500 ring-8 ring-deck-50">
          {icon}
        </span>
      )}
      <h3 className="text-[15px] font-semibold text-deck-900">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-deck-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
