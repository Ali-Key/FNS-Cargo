import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/utils/cn'

interface DataToolbarProps {
  search: string
  onSearchChange: (value: string) => void
  placeholder?: string
  /** Trailing controls next to the search input, e.g. an export menu. */
  children?: ReactNode
  /** Filter chips shown on their own row below the search input. */
  filters?: ReactNode
  /** Whether any filter (or the search box) currently differs from its default. */
  filtersActive?: boolean
  /** Clears every filter, including search. Renders the "Reset filters" button when set alongside `filtersActive`. */
  onReset?: () => void
  className?: string
}

/** The single search/filter bar shell every list page uses — owns its own card frame. */
export function DataToolbar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  children,
  filters,
  filtersActive,
  onReset,
  className,
}: DataToolbarProps) {
  return (
    <div className={cn('space-y-3 border border-gray-200 bg-white p-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:max-w-xs sm:flex-1">
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder}
            icon={<Search className="h-4 w-4" />}
            aria-label={placeholder}
          />
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
      {(filters || (filtersActive && onReset)) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          {filtersActive && onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Reset filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
