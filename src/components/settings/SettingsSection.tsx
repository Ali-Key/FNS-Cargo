import type { ReactNode } from 'react'

interface SettingsSectionProps {
  title: string
  description?: string
  /** Right-hand slot, e.g. an "Invite user" button. */
  action?: ReactNode
  children: ReactNode
}

/**
 * One band of the Settings page: a heading that sits above the panels rather
 * than inside them, so stacked sections read as separate concerns without
 * nesting a panel in a panel.
 */
export function SettingsSection({ title, description, action, children }: SettingsSectionProps) {
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold tracking-tight text-deck-900">{title}</h2>
          {description && <p className="mt-1 text-[12px] leading-relaxed text-deck-500">{description}</p>}
        </div>
        {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
      </header>
      {children}
    </section>
  )
}
