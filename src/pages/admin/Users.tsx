import { useCallback, useEffect, useState } from 'react'
import { UserPlus, ShieldCheck, UserMinus } from 'lucide-react'
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
  Avatar,
  RowActions,
  Alert,
} from '@/components/ui'
import { PageHeader, ConfirmDialog } from '@/components/dashboard'
import { CreateUserModal } from '@/components/dashboard/CreateUserModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { listDashboardUsers, updateUserRole, revokeUser } from '@/services/usersService'
import type { UserRole, DashboardUser } from '@/types'
import { formatDate } from '@/utils/date'
import { activeVariant } from '@/utils/status'

const PAGE_SIZE = 10

export default function Users() {
  useDocumentTitle('Users | FNS Cargo')
  const toast = useToast()
  const { user } = useAuth()

  const [rows, setRows] = useState<DashboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<DashboardUser | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listDashboardUsers())
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function changeRole(row: DashboardUser, role: UserRole) {
    if (role === row.role) return
    try {
      await updateUserRole(row.id, role)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role } : r)))
      toast.success('Role updated', `${row.email} is now ${role === 'Admin' ? 'an admin' : 'a dispatcher'}.`)
    } catch {
      toast.error('Unable to update role', 'Please try again in a moment.')
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeLoading(true)
    try {
      await revokeUser(revoking.id, revoking.email)
      toast.success('Access revoked', `${revoking.email ?? 'This user'} can no longer access the dashboard.`)
      setRevoking(null)
      load()
    } catch {
      toast.error('Unable to revoke access', 'Please try again in a moment.')
    } finally {
      setRevokeLoading(false)
    }
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage who can access the operations dashboard."
        actions={
          <Button variant="primary" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Invite user
          </Button>
        }
      />

      {loadError && rows.length === 0 && (
        <Alert variant="error" title="Could not load users">
          <p>Please try again.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={load}>
            Retry
          </Button>
        </Alert>
      )}

      <div className="overflow-hidden rounded-card border border-gray-200 bg-white shadow-elevation-1">
        <Table className="border-0">
          <TableHead>
            <TableRow>
              <TableHeadCell>User</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Status</TableHeadCell>
              <TableHeadCell>Added</TableHeadCell>
              <TableHeadCell className="text-right">Actions</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <SkeletonTableRows rows={4} columns={5} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="No dashboard users" />
                </td>
              </tr>
            ) : (
              pageRows.map((u) => {
                const isSelf = u.auth_user_id === user?.id
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={u.full_name || u.email} />
                        <div>
                          <span className="font-medium text-navy-900">{u.full_name}</span>
                          {isSelf && <span className="ml-2 text-xs font-medium text-steel-400">(you)</span>}
                          <p className="text-xs text-text-secondary">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'Admin' ? 'info' : 'neutral'}>{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={activeVariant(u.status)}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="font-tabular text-sm text-text-secondary">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {!isSelf && (
                          <RowActions
                            label={`Actions for ${u.email}`}
                            items={[
                              ...(['Dispatcher', 'Admin'] as UserRole[])
                                .filter((role) => role !== u.role)
                                .map((role) => ({
                                  label: `Set as ${role}`,
                                  onClick: () => changeRole(u, role),
                                })),
                              {
                                label: 'Revoke access',
                                icon: <UserMinus className="h-4 w-4" />,
                                onClick: () => setRevoking(u),
                                danger: true,
                              },
                            ]}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        {!loading && rows.length > 0 && (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            totalItems={rows.length}
            pageSize={PAGE_SIZE}
          />
        )}
      </div>

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} />

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={confirmRevoke}
        loading={revokeLoading}
        title="Revoke dashboard access?"
        confirmLabel="Revoke access"
        description={
          <>
            <span className="font-semibold text-navy-800">{revoking?.email}</span> will lose access to the dashboard.
            Their login account is preserved but can no longer sign in here.
          </>
        }
      />
    </div>
  )
}
