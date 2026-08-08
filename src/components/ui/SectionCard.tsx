import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface SectionCardProps {
  icon?: LucideIcon
  title: string
  description?: string
  /** Small uppercase note shown on the header's right side, e.g. a period label. */
  note?: string
  /** Header-right action, e.g. an "Add" button. */
  action?: ReactNode
  /** 'panel' (default): border under a title/note/action header row, e.g. a chart or list card.
   *  'compact': small header with no border, for a tight dl of label/value rows.
   *  'form': large header, generous padding, for a settings/profile form section. */
  variant?: 'panel' | 'compact' | 'form'
  /** Remove the content padding — for a list/table that manages its own row spacing. */
  flush?: boolean
  className?: string
  children: ReactNode
}

export function SectionCard({
  icon: Icon,
  title,
  description,
  note,
  action,
  variant = 'panel',
  flush,
  className,
  children,
}: SectionCardProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('border border-gray-200 bg-white p-4', className)}>
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-primary-500" />}
          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-navy-900">{title}</h3>
        </div>
        <dl className="space-y-2">{children}</dl>
      </div>
    )
  }

  if (variant === 'form') {
    return (
      <section className={cn('border border-gray-200 bg-white p-6 sm:p-8', className)}>
        <div className="mb-6 flex items-center gap-2.5">
          {Icon && <Icon className="h-5 w-5 text-primary-500" />}
          <h2 className="font-bold text-navy-900">{title}</h2>
        </div>
        {children}
      </section>
    )
  }

  return (
    <div className={cn('border border-gray-200 bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-3.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-primary-500" />}
            <h2 className="text-sm font-bold text-navy-900">{title}</h2>
          </div>
          {description && <p className="mt-0.5 text-xs text-text-secondary">{description}</p>}
        </div>
        {(note || action) && (
          <div className="flex shrink-0 items-center gap-3">
            {note && <span className="text-xs font-semibold uppercase tracking-[0.1em] text-steel-400">{note}</span>}
            {action}
          </div>
        )}
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </div>
  )
}
