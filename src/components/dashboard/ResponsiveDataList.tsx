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
  /** Column count for the skeleton and the empty-state colSpan. */
  columnCount: number
  skeletonRows?: number
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
  /** The search/filter bar. Rendered as the top band of the list's own frame. */
  toolbar?: ReactNode
}

/**
 * One list, two shapes: a table from `sm` up, stacked cards below it, driven by
 * the same row data. Loading and empty states are shared so every list in the
 * console behaves identically; only the row content is written per page.
 *
 * Filters, column heads, rows and the page count are all parts of one list, so
 * they share one frame. They used to be three separately-bordered slabs stacked
 * on the canvas with gaps between them, which made a single list read as three
 * unrelated widgets and wasted two hairlines of vertical space.
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
  toolbar,
}: ResponsiveDataListProps<T>) {
  const isEmpty = !loading && rows.length === 0
  const showPagination = !loading && rows.length > 0 && pagination

  return (
    <div className="space-y-3">
      {/* `overflow-hidden` clips the table head's fill to the frame's corners.
          It is safe here because `Dropdown` portals its menu to `body` with
          fixed positioning, so the toolbar's filters are not trapped by it. */}
      <section className="overflow-hidden rounded-deck bg-panel shadow-deck">
        {toolbar && <div className="border-b border-deck-100 p-2.5">{toolbar}</div>}

        <div className="hidden sm:block">
          <Table className={tableClassName ?? 'min-w-[680px]'}>
            <TableHead>{tableHead}</TableHead>
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

        {showPagination && (
          <div className="hidden border-t border-deck-100 px-4 py-2.5 sm:block">
            <Pagination
              page={pagination.page}
              pageCount={pagination.pageCount}
              onPageChange={pagination.onPageChange}
              totalItems={pagination.totalItems}
              pageSize={pagination.pageSize}
            />
          </div>
        )}
      </section>

      <div className="space-y-3 sm:hidden">
        {loading ? (
          Array.from({ length: skeletonCards }).map((_, i) => <SkeletonCard key={i} />)
        ) : isEmpty ? (
          <div className="rounded-deck bg-panel shadow-deck">
            <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} action={emptyAction} />
          </div>
        ) : (
          rows.map(renderMobileCard)
        )}

        {showPagination && (
          <Pagination
            page={pagination.page}
            pageCount={pagination.pageCount}
            onPageChange={pagination.onPageChange}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
          />
        )}
      </div>
    </div>
  )
}
