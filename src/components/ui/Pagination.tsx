import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PaginationProps {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalItems?: number
  pageSize?: number
}

export function Pagination({ page, pageCount, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (pageCount <= 1 && !totalItems) return null

  const start = totalItems && pageSize ? Math.min((page - 1) * pageSize + 1, totalItems) : null
  const end = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : null

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-steel-100 px-4 py-3.5 sm:flex-row">
      {totalItems !== undefined && (
        <p className="text-sm text-steel-500">
          Showing <span className="font-semibold text-navy-800">{start}</span>–
          <span className="font-semibold text-navy-800">{end}</span> of{' '}
          <span className="font-semibold text-navy-800">{totalItems}</span>
        </p>
      )}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 w-9 items-center justify-center rounded-control border border-steel-200 text-steel-600 transition hover:bg-steel-50 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="px-3 text-sm font-medium text-navy-800">
          Page {page} of {Math.max(pageCount, 1)}
        </span>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-control border border-steel-200 text-steel-600 transition hover:bg-steel-50 disabled:cursor-not-allowed disabled:opacity-40',
          )}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
