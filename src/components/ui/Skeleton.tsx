import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer rounded-chip', className)} {...props} />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

/** Rows shaped like the real table body, so the layout does not jump on load. */
export function SkeletonTableRows({ rows = 6, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className={cn('h-3.5', c === 0 ? 'w-32' : 'w-full max-w-[110px]')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

/** Placeholder for a panel-framed card, e.g. a mobile list row. */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-deck bg-panel p-4 shadow-deck', className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-16 rounded-badge" />
      </div>
      <div className="mt-3 space-y-2 border-t border-deck-100 pt-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  )
}
