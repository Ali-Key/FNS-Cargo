import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Panel, PanelBody, PanelHeader } from './Panel'

interface SectionCardProps {
  icon?: LucideIcon
  title: ReactNode
  description?: string
  /** Small note shown on the header's right side, e.g. a period label. */
  note?: string
  /** Header-right action, e.g. an "Add" button. */
  action?: ReactNode
  /** 'panel' (default): titled panel for a chart or list.
   *  'compact': tight header over a `dl` of label/value rows.
   *  'form': generous padding for a settings or profile form section. */
  variant?: 'panel' | 'compact' | 'form'
  /** Remove content padding — for a table or list that manages its own rows. */
  flush?: boolean
  className?: string
  children: ReactNode
}

/**
 * Titled section built on `Panel`. Kept as its own component because dozens of
 * call sites describe a section by props rather than composing a header — this
 * is the shorthand, `Panel` + `PanelHeader` is the long form.
 */
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
      <Panel className={cn('p-4', className)} as="div">
        <div className="mb-3 flex items-center gap-2">
          {Icon && <Icon className="h-3.5 w-3.5 text-signal-600" aria-hidden="true" />}
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-deck-500">{title}</h3>
        </div>
        <dl className="space-y-2">{children}</dl>
      </Panel>
    )
  }

  if (variant === 'form') {
    return (
      <Panel className={className}>
        <PanelHeader title={title} description={description} icon={Icon} action={action} />
        <PanelBody className="p-5 sm:p-6">{children}</PanelBody>
      </Panel>
    )
  }

  return (
    <Panel className={className}>
      <PanelHeader
        title={title}
        description={description}
        icon={Icon}
        dense
        action={
          note || action ? (
            <>
              {note && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-deck-400">{note}</span>
              )}
              {action}
            </>
          ) : undefined
        }
      />
      <PanelBody flush={flush} className={flush ? undefined : 'p-4'}>
        {children}
      </PanelBody>
    </Panel>
  )
}
