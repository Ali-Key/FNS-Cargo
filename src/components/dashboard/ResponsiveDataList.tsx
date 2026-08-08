import type { ReactNode } from 'react'
import {
  Table,
  TableHead,
  TableBody,
  Pagination,
  EmptyState,
  SkeletonTableRows,
  SkeletonCard,
} from '@/components/ui'

interface ResponsiveDataListPagination {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  totalItems: number
  pageSize: number
}

interface ResponsiveDataListProps<T> {
  rows: T[]
  loading: boolean
  /** Column count for the loading-skeleton and empty-state colSpan. */
  columnCount: number
  /** Row count for the desktop skeleton. Defaults to 8. */
  skeletonRows?: number
  /** Card count for the mobile skeleton. Defaults to 4. */
  skeletonCards?: number
  tableClassName?: string
  /** A `<TableRow>` of `<TableHeadCell>`s. */
  tableHead: ReactNode
  /** Returns a keyed `<TableRow>` for the desktop table. */
  renderRow: (row: T) => ReactNode
  /** Returns a keyed `<MobileRowCard>` for the sub-`sm` layout. */
  renderMobileCard: (row: T) => ReactNode
  emptyIcon: ReactNode
  emptyTitle: string
  emptyDescription: string
  emptyAction?: ReactNode
  pagination?: ResponsiveDataListPagination
}

/**
 * The desktop-table + mobile-card + skeleton + empty-state scaffold every list
 * page (Shipments, Invoices, Payments, Customers, Users) rebuilt by hand. Row
 * content stays fully bespoke per page — only the surrounding shell, loading
 * state, and empty state are shared.
 */
export function ResponsiveDataList<T>({
  rows,
  loading,
  columnCount,
  skeletonRows = 8,
  skeletonCards = 4,
  tableClassName,
  tableHead,
  renderRow,
  renderMobileCard,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  pagination,
}: ResponsiveDataListProps<T>) {
  const isEmpty = !loading && rows.length === 0

  return (
    <>
      <div className="hidden overflow-hidden border border-gray-200 bg-white sm:block">
        <Table className={tableClassName ?? 'min-w-[640px] border-0'}>
          <TableHead className="sticky top-0">{tableHead}</TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={skeletonRows} columns={columnCount} />
            ) : isEmpty ? (
              <tr>
                <td colSpan={columnCount}>
                  <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              rows.map(renderRow)
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: skeletonCards }).map((_, i) => <SkeletonCard key={i} />)
        ) : isEmpty ? (
          <div className="border border-gray-200 bg-white">
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
          </div>
        ) : (
          rows.map(renderMobileCard)
        )}
      </div>

      {!loading && rows.length > 0 && pagination && (
        <Pagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          onPageChange={pagination.onPageChange}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
        />
      )}
    </>
  )
}
