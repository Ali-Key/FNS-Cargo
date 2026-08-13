import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * The console's one container. Depth comes from the `deck` shadow — a hairline
 * ring plus a very soft drop — so panels never need a border class and never
 * double-stroke when they sit next to each other.
 */
export function Panel({
  className,
  children,
  as: Tag = 'section',
}: {
  className?: string
  children: ReactNode
  as?: 'section' | 'div' | 'article'
}) {
  return <Tag className={cn('overflow-hidden rounded-deck bg-panel shadow-deck', className)}>{children}</Tag>
}

interface PanelHeaderProps {
  title: ReactNode
  description?: ReactNode
  icon?: LucideIcon
  /** Right-hand slot: a button, filter, or period label. */
  action?: ReactNode
  /** Tighten padding for panels stacked in a narrow column. */
  dense?: boolean
  className?: string
}

export function PanelHeader({ title, description, icon: Icon, action, dense, className }: PanelHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-deck-100',
        dense ? 'px-4 py-3' : 'px-5 py-4',
        className,
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-signal-50 text-signal-600">
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          )}
          <h2 className="truncate text-[14px] font-semibold text-deck-900">{title}</h2>
        </div>
        {description && <p className="mt-1 text-[12px] leading-relaxed text-deck-500">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  )
}

export function PanelBody({
  className,
  children,
  flush,
}: {
  className?: string
  children: ReactNode
  /** Remove padding for a table or list that manages its own row rhythm. */
  flush?: boolean
}) {
  return <div className={cn(flush ? '' : 'p-5', className)}>{children}</div>
}

export function PanelFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-t border-deck-100 bg-deck-50/60 px-5 py-3', className)}>
      {children}
    </div>
  )
}
