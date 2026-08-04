import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ShieldAlert, WifiOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button, Spinner } from '@/components/ui'
import type { UserRole } from '@/types'

interface ProtectedRouteProps {
  /** When set, the signed-in user must hold one of these roles. */
  allow?: UserRole[]
}

export function ProtectedRoute({ allow }: ProtectedRouteProps) {
  const { session, isOps, role, loading, unauthorized, profileError, refreshProfile, signOut } =
    useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface">
        <Spinner className="h-7 w-7 text-navy-700" />
        <p className="text-sm font-medium text-text-secondary">Verifying access</p>
      </div>
    )
  }

  // Not signed in, so send to login and remember where they were headed.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // The profile lookup failed. This is a connection or permission fault, not a
  // decision about the account, so offer a retry instead of a dead end.
  if (profileError) {
    return (
      <Shell
        icon={<WifiOff className="h-7 w-7" />}
        tone="amber"
        title="Could not verify your access"
        body="We signed you in but could not load your account profile. This is usually a temporary connection problem."
        detail={profileError}
      >
        <Button variant="primary" className="w-full" onClick={() => void refreshProfile()}>
          Try again
        </Button>
        <Button variant="secondary" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </Shell>
    )
  }

  // Signed in, profile resolved, but holds no active dashboard role.
  if (unauthorized || !isOps) {
    return (
      <Shell
        icon={<ShieldAlert className="h-7 w-7" />}
        tone="red"
        title="No dashboard access"
        body="This account is signed in but is not authorised for the FNS Cargo dashboard. Ask an administrator to grant you access."
      >
        <Button variant="secondary" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </Shell>
    )
  }

  // A dashboard user, but this area requires a role they do not hold. They keep
  // their session — this is one area being closed, not access being revoked.
  if (allow && role && !allow.includes(role)) {
    return (
      <Shell
        icon={<ShieldAlert className="h-7 w-7" />}
        tone="red"
        title="Insufficient permissions"
        body="This area is restricted to administrators. The rest of the dashboard is still available to you."
      >
        <Button variant="primary" className="w-full" onClick={() => navigate('/dashboard')}>
          Back to overview
        </Button>
      </Shell>
    )
  }

  return <Outlet />
}

const TONES = {
  red: 'bg-status-delayed/10 text-status-delayed',
  amber: 'bg-warning-50 text-warning-600',
} as const

function Shell({
  icon,
  tone,
  title,
  body,
  detail,
  children,
}: {
  icon: React.ReactNode
  tone: keyof typeof TONES
  title: string
  body: string
  detail?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md rounded-card border border-gray-200 bg-white p-8 text-center shadow-elevation-2">
        <div className={`mx-auto flex h-14 w-14 items-center justify-center rounded-card ${TONES[tone]}`}>
          {icon}
        </div>
        <h1 className="mt-5 text-xl font-bold text-navy-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">{body}</p>
        {detail && (
          <p className="mt-3 rounded-control bg-surface px-3 py-2 text-xs text-text-secondary">{detail}</p>
        )}
        <div className="mt-6 space-y-2">{children}</div>
      </div>
    </div>
  )
}
