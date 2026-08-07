import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface PageHeaderProps {
  title: ReactNode
  description?: string
  actions?: ReactNode
  /** Renders a small back-link above the title, for detail pages nested under a list. */
  back?: { to: string; label: string }
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="border-b border-gray-200 pb-5">
      {back && (
        <Link
          to={back.to}
          className="mb-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-text-secondary hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span aria-hidden className="mt-1 hidden h-8 w-1.5 shrink-0 rounded-full bg-primary-500 sm:block" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-navy-900">{title}</h1>
            {description && <p className="mt-1 text-sm text-text-secondary">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
