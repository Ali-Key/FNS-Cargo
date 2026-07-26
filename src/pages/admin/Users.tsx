import { useCallback, useEffect, useState } from 'react'
import { UserPlus, ShieldCheck, UserMinus } from 'lucide-react'
import {
  Button,
  Badge,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  EmptyState,
  SkeletonTableRows,
} from '@/components/ui'
import { PageHeader, ConfirmDialog } from '@/components/dashboard'
import { CreateUserModal } from '@/components/dashboard/CreateUserModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { listDashboardUsers, updateUserRole, revokeUser } from '@/services/usersService'
import type { AdminRole, DashboardUser } from '@/types'
import { formatDate, formatRelativeToNow } from '@/utils/date'
import { initials } from '@/utils/format'

export default function Users() {
  useDocumentTitle('Users · FNS Cargo')
  const toast = useToast()
  const { user } = useAuth()

  const [rows, setRows] = useState<DashboardUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [revoking, setRevoking] = useState<DashboardUser | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)
  const [savingRole, setSavingRole] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setRows(await listDashboardUsers())
    } catch {
      toast.error('Unable to load users', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  async function changeRole(row: DashboardUser, role: AdminRole) {
    if (role === row.role) return
    setSavingRole(row.admin_id)
    try {
      await updateUserRole(row.admin_id, role)
      setRows((prev) => prev.map((r) => (r.admin_id === row.admin_id ? { ...r, role } : r)))
      toast.success('Role updated', `${row.email ?? 'This user'} is now ${role === 'admin' ? 'an admin' : 'staff'}.`)
    } catch {
      toast.error('Unable to update role', 'Please try again in a moment.')
    } finally {
      setSavingRole(null)
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeLoading(true)
    try {
      await revokeUser(revoking.admin_id, revoking.email)
      toast.success('Access revoked', `${revoking.email ?? 'This user'} can no longer access the dashboard.`)
      setRevoking(null)
      load()
    } catch {
      toast.error('Unable to revoke access', 'Please try again in a moment.')
    } finally {
      setRevokeLoading(false)
    }
  }

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

      <div className="overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-elevation-1">
        <Table className="border-0">
          <TableHead>
            <TableRow>
              <TableHeadCell>User</TableHeadCell>
              <TableHeadCell>Role</TableHeadCell>
              <TableHeadCell>Last sign in</TableHeadCell>
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
              rows.map((u) => {
                const isSelf = u.user_id === user?.id
                return (
                  <TableRow key={u.admin_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-xs font-bold uppercase text-navy-700">
                          {initials(u.email ?? '?')}
                        </span>
                        <div>
                          <span className="font-medium text-navy-900">{u.email ?? '—'}</span>
                          {isSelf && <span className="ml-2 text-xs font-medium text-steel-400">(you)</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {isSelf ? (
                        <Badge variant={u.role === 'admin' ? 'info' : 'neutral'}>
                          {u.role === 'admin' ? 'Admin' : 'Staff'}
                        </Badge>
                      ) : (
                        <Select
                          aria-label={`Role for ${u.email}`}
                          className="h-9 w-32"
                          value={u.role}
                          disabled={savingRole === u.admin_id}
                          onChange={(e) => changeRole(u, e.target.value as AdminRole)}
                          options={[
                            { value: 'staff', label: 'Staff' },
                            { value: 'admin', label: 'Admin' },
                          ]}
                        />
                      )}
                    </TableCell>
                    <TableCell className="font-tabular text-sm text-steel-500">
                      {u.last_sign_in_at ? formatRelativeToNow(u.last_sign_in_at) : 'Never'}
                    </TableCell>
                    <TableCell className="font-tabular text-sm text-steel-500">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {!isSelf && (
                          <button
                            onClick={() => setRevoking(u)}
                            className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-steel-500 hover:bg-red-50 hover:text-red-600"
                          >
                            <UserMinus className="h-4 w-4" /> Revoke
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
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
