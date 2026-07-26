import { useCallback, useEffect, useState } from 'react'
import { Plus, Users, Pencil, Trash2, Mail, Phone } from 'lucide-react'
import {
  Button,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  Pagination,
  EmptyState,
  SkeletonTableRows,
} from '@/components/ui'
import { PageHeader, DataToolbar, ConfirmDialog } from '@/components/dashboard'
import { CustomerFormModal } from '@/components/dashboard/CustomerFormModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { listCustomers, deleteCustomer } from '@/services/customersService'
import type { Customer } from '@/types'
import { formatDate } from '@/utils/date'
import { initials } from '@/utils/format'

const PAGE_SIZE = 10

export default function Customers() {
  useDocumentTitle('Customers · FNS Cargo')
  const toast = useToast()
  const { role } = useAuth()
  const isAdmin = role === 'admin'

  const [rows, setRows] = useState<Customer[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listCustomers({ page, pageSize: PAGE_SIZE, search: debouncedSearch })
      setRows(result.rows)
      setCount(result.count)
    } catch {
      toast.error('Unable to load customers', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [page, debouncedSearch, toast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  async function confirmDelete() {
    if (!deleting) return
    setDeleteLoading(true)
    try {
      await deleteCustomer(deleting.id, deleting.full_name)
      toast.success('Customer removed', `${deleting.full_name}'s record has been deleted.`)
      setDeleting(null)
      if (rows.length === 1 && page > 1) setPage((p) => p - 1)
      else load()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (/foreign key|violates/i.test(message)) {
        toast.error(
          'Customer is in use',
          'This customer is linked to existing shipments and cannot be deleted.',
        )
      } else {
        toast.error('Unable to remove customer', 'Please try again in a moment.')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description={isAdmin ? "Keep track of your customers and how to reach them." : 'A read-only list of your customers.'}
        actions={
          isAdmin ? (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" />}
              onClick={() => {
                setEditing(null)
                setFormOpen(true)
              }}
            >
              New customer
            </Button>
          ) : undefined
        }
      />

      <DataToolbar search={search} onSearchChange={setSearch} placeholder="Search name, email, phone, city…" />

      <div className="overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-elevation-1">
        <Table className="border-0">
          <TableHead>
            <TableRow>
              <TableHeadCell>Customer</TableHeadCell>
              <TableHeadCell>Contact</TableHeadCell>
              <TableHeadCell>Location</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Added</TableHeadCell>
              {isAdmin && <TableHeadCell className="text-right">Actions</TableHeadCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={8} columns={isAdmin ? 6 : 5} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 6 : 5}>
                  <EmptyState
                    icon={<Users className="h-6 w-6" />}
                    title="No customers found"
                    description={search ? 'Try a different search.' : 'Add your first customer to get started.'}
                  />
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                        {initials(c.full_name)}
                      </span>
                      <span className="font-medium text-navy-900">{c.full_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div className="space-y-0.5">
                      {c.email && (
                        <span className="flex items-center gap-1.5 text-steel-600">
                          <Mail className="h-3.5 w-3.5 text-steel-400" /> {c.email}
                        </span>
                      )}
                      {c.phone && (
                        <span className="flex items-center gap-1.5 text-steel-600">
                          <Phone className="h-3.5 w-3.5 text-steel-400" /> {c.phone}
                        </span>
                      )}
                      {!c.email && !c.phone && <span className="text-steel-400">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-steel-600">
                    {[c.city, c.country].filter(Boolean).join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    {c.is_active ? (
                      <Badge variant="success">Active</Badge>
                    ) : (
                      <Badge variant="neutral">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-tabular text-sm text-steel-500">{formatDate(c.created_at)}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditing(c)
                            setFormOpen(true)
                          }}
                          className="rounded-control p-1.5 text-steel-500 hover:bg-steel-100 hover:text-navy-800"
                          aria-label="Edit customer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(c)}
                          className="rounded-control p-1.5 text-steel-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
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
      </div>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        customer={editing}
      />

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Remove customer?"
        confirmLabel="Remove"
        description={
          <>
            This permanently removes <span className="font-semibold text-navy-800">{deleting?.full_name}</span> from
            your customer records.
          </>
        }
      />
    </div>
  )
}
