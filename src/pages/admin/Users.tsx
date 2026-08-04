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
  Avatar,
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

export default function Users() {
  useDocumentTitle('Users | FNS Cargo')
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

  async function changeRole(row: DashboardUser, role: UserRole) {
    if (role === row.role) return
    setSavingRole(row.id)
    try {
      await updateUserRole(row.id, role)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role } : r)))
      toast.success('Role updated', `${row.email} is now ${role === 'Admin' ? 'an admin' : 'a customer'}.`)
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
              rows.map((u) => {
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
                      {isSelf ? (
                        <Badge variant={u.role === 'Admin' ? 'info' : 'neutral'}>{u.role}</Badge>
                      ) : (
                        <Select
                          aria-label={`Role for ${u.email}`}
                          className="h-9 w-32"
                          value={u.role}
                          disabled={savingRole === u.id}
                          onChange={(e) => changeRole(u, e.target.value as UserRole)}
                          options={[
                            { value: 'Staff', label: 'Staff' },
                            { value: 'Admin', label: 'Admin' },
                          ]}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={activeVariant(u.status)}>{u.status}</Badge>
                    </TableCell>
                    <TableCell className="font-tabular text-sm text-text-secondary">{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {!isSelf && (
                          <button
                            onClick={() => setRevoking(u)}
                            className="inline-flex items-center gap-1.5 rounded-control px-2.5 py-1.5 text-sm font-medium text-text-secondary hover:bg-status-delayed/10 hover:text-status-delayed"
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
