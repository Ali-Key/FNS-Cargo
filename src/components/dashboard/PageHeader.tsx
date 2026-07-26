import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-steel-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-1 hidden h-8 w-1.5 shrink-0 rounded-full bg-accent-500 sm:block" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-steel-500">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
