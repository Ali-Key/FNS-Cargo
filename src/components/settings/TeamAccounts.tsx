import { useCallback, useState } from 'react'
import { AtSign, ShieldCheck, UserCheck, UserMinus, UserPlus } from 'lucide-react'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  DetailRow,
  MobileRowCard,
  RowActions,
  TableCell,
  TableCellPrimary,
  TableHeadCell,
  TableRow,
} from '@/components/ui'
import { ConfirmDialog, ResponsiveDataList } from '@/components/dashboard'
import { ChangeEmailModal, CreateUserModal } from '@/components/users'
import { useCachedResource } from '@/hooks/useCachedResource'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { listDashboardUsers, updateUserRole, revokeUser, restoreUser } from '@/services/usersService'
import type { UserRole, DashboardUser } from '@/types'
import { formatDate } from '@/utils/date'
import { activeVariant } from '@/utils/status'
import { SettingsSection } from './SettingsSection'

const PAGE_SIZE = 10

/** What each role can reach, so the table explains itself without a legend. */
const ROLE_SCOPE: Record<UserRole, string> = {
  Admin: 'Full access including finance, reports, and team',
  Dispatcher: 'Operations, customers, and quotes',
  Staff: 'Operations, customers, and quotes',
}

/**
 * Admin-only: who can sign in to the console. Rendered by Settings behind
 * `isAdmin`; the database enforces the same boundary through the profiles RLS
 * policies and the admin-gated `admin-create-user` edge function.
 */
export function TeamAccounts() {
  const toast = useToast()
  const { user } = useAuth()

  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState<DashboardUser | null>(null)
  const [revoking, setRevoking] = useState<DashboardUser | null>(null)
  const [revokeLoading, setRevokeLoading] = useState(false)

  const fetchUsers = useCallback(() => listDashboardUsers(), [])
  const { data, loading, error, reload: load, mutate } = useCachedResource('users', fetchUsers)

  const rows = data ?? []
  const loadError = Boolean(error)
  const showSkeleton = loading && rows.length === 0
  /** Optimistic row edit that also lands in the cache, not just on screen. */
  const setRows = (update: (rows: DashboardUser[]) => DashboardUser[]) => mutate(update)

  async function changeRole(row: DashboardUser, role: UserRole) {
    if (role === row.role) return
    try {
      await updateUserRole(row.id, role)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, role } : r)))
      const roleLabel = role === 'Admin' ? 'an admin' : role === 'Dispatcher' ? 'a dispatcher' : 'staff'
      toast.success('Role updated', `${row.email} is now ${roleLabel}.`)
    } catch {
      toast.error('Unable to update role', 'Please try again in a moment.')
    }
  }

  async function confirmRevoke() {
    if (!revoking) return
    setRevokeLoading(true)
    try {
      await revokeUser(revoking.id, revoking.email)
      toast.success('Access revoked', `${revoking.email ?? 'This user'} can no longer reach the console.`)
      setRevoking(null)
      load()
    } catch {
      toast.error('Unable to revoke access', 'Please try again in a moment.')
    } finally {
      setRevokeLoading(false)
    }
  }

  async function restore(row: DashboardUser) {
    try {
      await restoreUser(row.id, row.email)
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status: 'Active' } : r)))
      toast.success('Access restored', `${row.email ?? 'This user'} can sign in to the console again.`)
    } catch {
      toast.error('Unable to restore access', 'Please try again in a moment.')
    }
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const pageRows = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function userActionItems(u: DashboardUser) {
    return [
      { label: 'Change email', icon: <AtSign className="h-4 w-4" />, onClick: () => setEditingEmail(u) },
      ...(['Dispatcher', 'Staff', 'Admin'] as UserRole[])
        .filter((role) => role !== u.role)
        .map((role) => ({ label: `Set as ${role}`, onClick: () => changeRole(u, role) })),
      u.status === 'Active'
        ? { label: 'Revoke access', icon: <UserMinus className="h-4 w-4" />, onClick: () => setRevoking(u), danger: true }
        : { label: 'Restore access', icon: <UserCheck className="h-4 w-4" />, onClick: () => void restore(u) },
    ]
  }

  return (
    <SettingsSection
      title="Team accounts"
      description="Who can sign in to the FSN Cargo console, and what each of them can reach."
      action={
        <Button variant="deck" size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
          Invite user
        </Button>
      }
    >
      {loadError && rows.length === 0 && (
        <Alert
          variant="error"
          title="Could not load the team"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={load}>
              Retry
            </Button>
          }
        >
          Something went wrong fetching dashboard accounts.
        </Alert>
      )}

      <ResponsiveDataList
        rows={pageRows}
        loading={showSkeleton}
        columnCount={5}
        skeletonRows={4}
        tableClassName="min-w-[720px]"
        tableHead={
          <TableRow>
            <TableHeadCell>User</TableHeadCell>
            <TableHeadCell>Role</TableHeadCell>
            <TableHeadCell>Status</TableHeadCell>
            <TableHeadCell>Added</TableHeadCell>
            <TableHeadCell className="text-right">
              <span className="sr-only">Actions</span>
            </TableHeadCell>
          </TableRow>
        }
        renderRow={(u) => {
          const isSelf = u.auth_user_id === user?.id
          return (
            <TableRow key={u.id}>
              <TableCellPrimary>
                <div className="flex items-center gap-3">
                  <Avatar name={u.full_name || u.email} />
                  <div className="min-w-0">
                    <p className="truncate text-deck-900">
                      {u.full_name}
                      {isSelf && <span className="ml-2 text-[11px] font-medium text-deck-400">You</span>}
                    </p>
                    <p className="truncate text-[11px] font-normal text-deck-500">{u.email}</p>
                  </div>
                </div>
              </TableCellPrimary>
              <TableCell>
                <Badge variant={u.role === 'Admin' ? 'signal' : 'neutral'}>{u.role}</Badge>
                <span className="mt-1 block max-w-[240px] truncate text-[11px] text-deck-400">{ROLE_SCOPE[u.role]}</span>
              </TableCell>
              <TableCell>
                <Badge variant={activeVariant(u.status)}>{u.status}</Badge>
              </TableCell>
              <TableCell className="font-tabular text-deck-500">{formatDate(u.created_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end">
                  {!isSelf && <RowActions label={`Actions for ${u.email}`} items={userActionItems(u)} />}
                </div>
              </TableCell>
            </TableRow>
          )
        }}
        renderMobileCard={(u) => {
          const isSelf = u.auth_user_id === user?.id
          return (
            <MobileRowCard
              key={u.id}
              header={
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={u.full_name || u.email} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-deck-900">
                      {u.full_name}
                      {isSelf && <span className="ml-2 text-[11px] font-medium text-deck-400">You</span>}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge variant={u.role === 'Admin' ? 'signal' : 'neutral'}>{u.role}</Badge>
                      <Badge variant={activeVariant(u.status)}>{u.status}</Badge>
                    </div>
                  </div>
                </div>
              }
              actions={!isSelf ? <RowActions label={`Actions for ${u.email}`} items={userActionItems(u)} /> : undefined}
            >
              <DetailRow label="Email" value={u.email} />
              <DetailRow label="Access" value={ROLE_SCOPE[u.role]} stacked />
              <DetailRow label="Added" value={formatDate(u.created_at)} />
            </MobileRowCard>
          )
        }}
        emptyIcon={<ShieldCheck className="h-5 w-5" />}
        emptyTitle="No dashboard accounts"
        emptyDescription="Invite a colleague to give them access to the FSN Cargo console."
        emptyAction={
          <Button variant="deck" size="sm" icon={<UserPlus className="h-4 w-4" />} onClick={() => setCreateOpen(true)}>
            Invite user
          </Button>
        }
        pagination={{ page, pageCount, onPageChange: setPage, totalItems: rows.length, pageSize: PAGE_SIZE }}
      />

      <CreateUserModal open={createOpen} onClose={() => setCreateOpen(false)} onSaved={load} />

      <ChangeEmailModal
        open={Boolean(editingEmail)}
        user={editingEmail}
        onClose={() => setEditingEmail(null)}
        onSaved={(email) =>
          setRows((prev) => prev.map((r) => (r.id === editingEmail?.id ? { ...r, email } : r)))
        }
      />

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={confirmRevoke}
        loading={revokeLoading}
        title="Revoke console access?"
        confirmLabel="Revoke access"
        description={
          <>
            <span className="font-semibold text-deck-900">{revoking?.email}</span> will lose access to the FSN Cargo
            console. Their login account is preserved, but it can no longer sign in here.
          </>
        }
      />
    </SettingsSection>
  )
}
