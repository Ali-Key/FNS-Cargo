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

  // Only block on the very first resolution. Once an active ops profile is
  // known, a later re-check (retry, USER_UPDATED, refreshProfile) revalidates
  // behind a console that is already usable instead of throwing the whole
  // screen back to "Verifying access".
  if (loading && !isOps) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-deck-50">
        <Spinner className="h-7 w-7 text-deck-700" />
        <p className="text-sm font-medium text-deck-500">Verifying access</p>
      </div>
    )
  }

  // Verifying the session or the profile failed. This is a connection or
  // permission fault, not a decision about the account, and it is checked
  // before the sign-in redirect so a dropped connection is not misreported as
  // being signed out.
  if (profileError && !isOps) {
    return (
      <Shell
        icon={<WifiOff className="h-7 w-7" />}
        tone="amber"
        title="Could not verify your access"
        body="Your session could not be confirmed. This is usually a temporary connection problem, not a change to your account."
        detail={profileError}
      >
        <Button variant="deck" className="w-full" onClick={() => void refreshProfile()}>
          Try again
        </Button>
        <Button variant="secondary" className="w-full" onClick={signOut}>
          Sign out
        </Button>
      </Shell>
    )
  }

  // Not signed in, so send to login and remember where they were headed.
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // Signed in, profile resolved, but holds no active dashboard role.
  if (unauthorized) {
    return (
      <Shell
        icon={<ShieldAlert className="h-7 w-7" />}
        tone="red"
        title="No dashboard access"
        body="This account is signed in but is not authorised for the FSN Cargo dashboard. Ask an administrator to grant you access."
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
        <Button variant="deck" className="w-full" onClick={() => navigate('/dashboard')}>
          Back to overview
        </Button>
      </Shell>
    )
  }

  return <Outlet />
}

const TONES = {
  red: 'bg-status-delayed/10 text-status-delayed-ink ring-status-delayed/20',
  amber: 'bg-status-pending/10 text-status-pending-ink ring-status-pending/20',
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
    // Same dark field as the sign-in screen: these are all "you are outside the
    // console" states, and they should read as one place, not three stray pages.
    <div className="deck-rail-texture flex min-h-screen flex-col items-center justify-center bg-deck-900 px-4">
      <div className="w-full max-w-md rounded-deck-lg bg-panel p-8 text-center shadow-deck-pop">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-deck ring-8 ${TONES[tone]}`}
        >
          {icon}
        </div>
        <h1 className="mt-5 text-[20px] font-bold tracking-tight text-deck-900">{title}</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-deck-500">{body}</p>
        {detail && (
          <p className="mt-4 rounded-deck-sm bg-deck-50 px-3 py-2 text-left text-[12px] leading-relaxed text-deck-500">
            {detail}
          </p>
        )}
        <div className="mt-6 space-y-2">{children}</div>
      </div>
    </div>
  )
}
