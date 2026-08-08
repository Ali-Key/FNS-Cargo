import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton-shimmer rounded-md', className)} {...props} />
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

export function SkeletonTableRows({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: columns }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skeleton className="h-4 w-full max-w-[140px]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('border border-l-4 border-gray-200 border-l-gray-200 bg-white px-4 py-3.5', className)}>
      <Skeleton className="mb-3 h-3 w-1/3" />
      <Skeleton className="mb-2 h-6 w-1/2" />
      <Skeleton className="h-3 w-1/4" />
    </div>
  )
}
