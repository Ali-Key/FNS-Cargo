import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { cn } from '@/utils/cn'
import { Card } from './Card'

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
    <Card padding="none" className={cn('flex flex-wrap items-center gap-2 p-3', className)}>
      <div className="min-w-[220px] flex-1">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          icon={<Search className="h-4 w-4" />}
          aria-label={placeholder}
        />
      </div>
      {filters}
      {filtersActive && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      )}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </Card>
  )
}
