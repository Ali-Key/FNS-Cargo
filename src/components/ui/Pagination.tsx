import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
  className?: string
}

const STEP =
  'deck-focus inline-flex h-9 items-center gap-1 rounded-deck-sm bg-panel px-2.5 text-[12px] font-semibold text-deck-700 shadow-deck transition-colors hover:bg-deck-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-panel'

export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize, className }: PaginationProps) {
  if (pageCount <= 1 && !totalItems) return null

  const start = totalItems && pageSize ? Math.min((page - 1) * pageSize + 1, totalItems) : null
  const end = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : null

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex flex-col items-center justify-between gap-3 pt-1 sm:flex-row', className)}
    >
      {totalItems !== undefined && (
        <p className="font-tabular text-[12px] text-deck-500">
          <span className="font-semibold text-deck-800">{start}</span>–
          <span className="font-semibold text-deck-800">{end}</span> of{' '}
          <span className="font-semibold text-deck-800">{totalItems}</span>
        </p>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => onPageChange(page - 1)} disabled={page <= 1} className={STEP}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <span className="px-1 font-tabular text-[12px] font-medium text-deck-600">
          {page} / {Math.max(pageCount, 1)}
        </span>
        <button onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} className={STEP}>
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
