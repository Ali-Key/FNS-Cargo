import type { ReactNode } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface DataToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  /** Trailing controls beside the search box, e.g. an export menu. */
  children?: ReactNode
  /** Filter controls; wrap to their own row when the toolbar runs out of width. */
  filters?: ReactNode
  /** Whether any filter (or the search box) differs from its default. */
  filtersActive?: boolean
  /** Clears every filter including search. */
  onReset?: () => void
  /** Row count line shown on the left of the filter row, e.g. "128 shipments". */
  summary?: ReactNode
  /** Drop the toolbar's own frame — it is the top band of the list's frame. */
  embedded?: boolean
  className?: string
}

/**
 * The search and filter bar above every list. One row: search, then filters,
 * then the row count pushed right. It only breaks into a second line when the
 * viewport genuinely runs out of width, because a list screen should spend its
 * vertical space on rows, not on chrome.
 */
export function DataToolbar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  children,
  filters,
  filtersActive,
  onReset,
  summary,
  embedded,
  className,
}: DataToolbarProps) {
  return (
    <div className={cn(!embedded && 'rounded-deck bg-panel p-2.5 shadow-deck', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64 lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deck-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="deck-focus h-9 w-full rounded-deck-sm border border-deck-150 bg-deck-50 pl-9 pr-9 text-[13px] text-deck-900 transition-colors placeholder:text-deck-400 hover:border-deck-200 focus:border-signal-500 focus:bg-panel"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="deck-focus absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-chip text-deck-400 transition-colors hover:bg-deck-150 hover:text-deck-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {filters}

        {filtersActive && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="deck-focus inline-flex h-9 items-center gap-1.5 rounded-deck-sm px-2.5 text-[12px] font-semibold text-status-delayed-ink transition-colors hover:bg-status-delayed/10"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Clear filters
          </button>
        )}

        {(summary || children) && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {summary && <span className="text-[12px] font-medium text-deck-500">{summary}</span>}
            {children}
          </div>
        )}
      </div>
    </div>
  )
}
