import type { ReactNode } from 'react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

export interface Crumb {
  label: string
  to?: string
}

interface PageHeaderProps {
  title: ReactNode
  description?: string
  actions?: ReactNode
  /** Back-link above the title, for a detail page nested under a list. */
  back?: { to: string; label: string }
  /** Trail above the title. Rendered only from `sm` up; `back` covers phones. */
  crumbs?: Crumb[]
  /** Status chips or metadata shown under the title, e.g. a StatusBadge. */
  meta?: ReactNode
  className?: string
}

/**
 * The opening block of every dashboard page: where you are, what the page is,
 * and the actions that belong to the page as a whole. No card frame — it sits
 * directly on the canvas so the panels below it read as the content.
 */
export function PageHeader({ title, description, actions, back, crumbs, meta, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-4 border-b border-deck-150 pb-4', className)}>
      {back && (
        <Link
          to={back.to}
          className="deck-focus mb-3 inline-flex items-center gap-1.5 rounded-chip text-[13px] font-medium text-deck-500 transition-colors hover:text-deck-900 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {back.label}
        </Link>
      )}

      {crumbs && crumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 hidden sm:block">
          <ol className="flex items-center gap-1.5 text-[12px] font-medium text-deck-500">
            {crumbs.map((crumb, i) => (
              <li key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-deck-300" aria-hidden="true" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="deck-focus rounded-chip transition-colors hover:text-deck-900">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-deck-700">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {/* Title and actions share a baseline. A console page opens on its work,
          not on a paragraph about itself, so the type steps down to 20px and the
          hairline below does the separating that whitespace used to. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[19px] font-bold leading-tight tracking-tight text-deck-900 sm:text-[21px]">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-deck-500">{description}</p>}
          {meta && <div className="mt-2.5 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>}
      </div>
    </div>
  )
}
