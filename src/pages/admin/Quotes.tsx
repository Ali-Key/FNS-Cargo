import { useCallback, useEffect, useState } from 'react'
import { FileText, Trash2, Mail, Phone, ArrowRight } from 'lucide-react'
import { Badge, Button, Card, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, Pagination, EmptyState, SkeletonTableRows, RowActions, Alert, PageHeader, DataToolbar, ConfirmDialog } from '@/components/dash'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { listQuotes, updateQuoteStatus, deleteQuote } from '@/services/quotesService'
import { QUOTE_STATUSES, type Quote, type QuoteStatus } from '@/types'
import { formatDate } from '@/utils/date'

const PAGE_SIZE = 10

const STATUS_VARIANT: Record<QuoteStatus, 'warning' | 'info' | 'success' | 'neutral'> = {
  Pending: 'warning',
  Reviewed: 'info',
  Quoted: 'success',
  Closed: 'neutral',
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  ...QUOTE_STATUSES.map((s) => ({ value: s, label: s })),
]

export default function Quotes() {
  useDocumentTitle('Quote Requests | FNS Cargo')
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [rows, setRows] = useState<Quote[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<QuoteStatus | 'all'>('all')
  const debouncedSearch = useDebouncedValue(search)

  const [deleting, setDeleting] = useState<Quote | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listQuotes({ page, pageSize: PAGE_SIZE, search: debouncedSearch, status })
      setRows(result.rows)
      setCount(result.count)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, status])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function changeStatus(quote: Quote, next: QuoteStatus) {
    const previous = quote.status
    setRows((rs) => rs.map((r) => (r.id === quote.id ? { ...r, status: next } : r)))
    try {
      await updateQuoteStatus(quote.id, next)
      toast.success('Status updated', `${quote.full_name}'s request is now ${next}.`)
    } catch {
      setRows((rs) => rs.map((r) => (r.id === quote.id ? { ...r, status: previous } : r)))
      toast.error('Unable to update status', 'Please try again in a moment.')
    }
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteQuote(deleting.id, deleting.email)
      toast.success('Request removed', `${deleting.full_name}'s request has been deleted.`)
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else load()
    } catch {
      toast.error('Unable to remove request', 'Please try again in a moment.')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quote Requests"
        description="Enquiries submitted from the public contact form."
      />

      {loadError && rows.length === 0 && (
        <Alert variant="error" title="Could not load quote requests">
          <p>Please try again.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      <DataToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search name, email, origin, destination…"
      >
        <Select
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => setStatus(e.target.value as QuoteStatus | 'all')}
          aria-label="Filter by status"
          className="h-11"
        />
      </DataToolbar>

      <Card padding="none" className="overflow-hidden">
        <Table className="border-0">
          <TableHead>
            <TableRow>
              <TableHeadCell>Contact</TableHeadCell>
              <TableHeadCell>Route</TableHeadCell>
              <TableHeadCell>Cargo</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Received</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={6} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={<FileText className="h-6 w-6" />}
                    title="No quote requests found"
                    description={
                      search || status !== 'all'
                        ? 'Try a different search or filter.'
                        : 'Requests from the contact form will appear here.'
                    }
                  />
                </td>
              </tr>
            ) : (
              rows.map((q) => (
                <TableRow key={q.id}>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="font-medium text-navy-900">{q.full_name}</p>
                      <span className="flex items-center gap-1.5 text-sm text-steel-600">
                        <Mail className="h-3.5 w-3.5 text-steel-400" />
                        <a href={`mailto:${q.email}`} className="hover:text-navy-800">
                          {q.email}
                        </a>
                      </span>
                      {q.phone && (
                        <span className="flex items-center gap-1.5 text-sm text-steel-600">
                          <Phone className="h-3.5 w-3.5 text-steel-400" /> {q.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="flex items-center gap-1.5 text-navy-900">
                      {q.origin}
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-steel-400" />
                      {q.destination}
                    </span>
                    {q.message && (
                      <p className="mt-1 max-w-xs truncate text-xs text-text-secondary" title={q.message}>
                        {q.message}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {q.cargo_type}
                    {q.weight != null && (
                      <span className="block font-tabular text-xs text-text-secondary">{q.weight} kg</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[q.status]}>{q.status}</Badge>
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-text-secondary">
                    {formatDate(q.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <RowActions
                        label={`Actions for ${q.full_name}`}
                        items={[
                          ...QUOTE_STATUSES.filter((s) => s !== q.status).map((s) => ({
                            label: `Mark as ${s}`,
                            onClick: () => changeStatus(q, s),
                          })),
                          ...(isAdmin
                            ? [
                                {
                                  label: 'Delete request',
                                  icon: <Trash2 className="h-4 w-4" />,
                                  onClick: () => setDeleting(q),
                                  danger: true,
                                },
                              ]
                            : []),
                        ]}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && rows.length > 0 && (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={count}
            pageSize={PAGE_SIZE}
          />
        )}
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove quote request?"
        confirmLabel="Remove"
        description={
          <>
            This permanently deletes the request from{' '}
            <span className="font-semibold text-navy-800">{deleting?.full_name}</span>.
          </>
        }
      />
    </div>
  )
}
