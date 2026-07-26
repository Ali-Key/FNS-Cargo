import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button, Spinner } from '@/components/ui'
import type { AdminRole } from '@/types'

interface ProtectedRouteProps {
  /** When set, the signed-in admin must hold one of these roles. */
  allow?: AdminRole[]
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { session, isAdmin, role, loading, unauthorized, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-steel-50">
        <Spinner className="h-7 w-7 text-navy-700" />
        <p className="text-sm font-medium text-steel-500">Verifying access…</p>
      </div>
    )
  }

  // Not signed in → send to login, remembering where they were headed.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Signed in with a valid Supabase session but no admin_users record.
  if (unauthorized || !isAdmin) {
    return <NoAccess onSignOut={signOut} />
  }

  // Signed in and an admin, but lacks the specific role this area requires.
  if (allow && role && !allow.includes(role)) {
    return <NoAccess onSignOut={signOut} restricted />
  }

  return <Outlet />
}

function NoAccess({ onSignOut, restricted }: { onSignOut: () => void; restricted?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-steel-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-steel-100 bg-white p-8 text-center shadow-elevation-2">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-navy-900">
          {restricted ? 'Insufficient permissions' : 'No dashboard access'}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-steel-500">
          {restricted
            ? 'Your account does not have permission to view this area. Contact an administrator if you believe this is a mistake.'
            : 'This account is signed in but is not authorised for the FNS Cargo dashboard. If you need access, please contact an administrator.'}
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={onSignOut}>
          Sign out
        </Button>
      </div>
    </div>
  )
}
