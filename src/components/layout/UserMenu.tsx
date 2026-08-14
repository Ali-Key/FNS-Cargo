import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ExternalLink, LogOut, UserRound } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/utils/cn'

/**
 * Account control in the topbar. The old rail put the signed-in user at the
 * bottom of the navigation, where it competed with the routes; identity and
 * session actions belong in the header beside the other global controls.
 */
export function UserMenu() {
  const { user, profile, role, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const name = profile?.full_name ?? user?.email ?? 'Account'

  async function handleSignOut() {
    setSigningOut(true)
    await signOut()
    toast.info('Signed out', 'Your FSN Cargo session has been closed.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="deck-focus flex h-9 items-center gap-2 rounded-deck-sm pl-0.5 pr-1 transition-colors hover:bg-deck-100 sm:pr-2"
      >
        <Avatar name={name} size="sm" className="h-8 w-8 border-0 bg-deck-800 text-white" />
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block max-w-[140px] truncate text-[13px] font-semibold leading-tight text-deck-900">{name}</span>
          <span className="block text-[11px] font-medium leading-tight text-deck-500">{role ?? 'Member'}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-deck-400 transition-transform', open && 'rotate-180')} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="menu"
          className="deck-enter absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-deck bg-panel p-1.5 shadow-deck-pop"
        >
          <div className="mb-1 border-b border-deck-100 px-3 pb-2.5 pt-2">
            <p className="truncate text-[13px] font-semibold text-deck-900">{name}</p>
            <p className="truncate text-xs text-deck-500">{user?.email}</p>
          </div>
          <Link
            to="/dashboard/settings"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="deck-focus flex items-center gap-2.5 rounded-deck-sm px-3 py-2 text-[13px] font-medium text-deck-700 transition-colors hover:bg-deck-50"
          >
            <UserRound className="h-4 w-4 text-deck-400" aria-hidden="true" />
            Account settings
          </Link>
          <Link
            to="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="deck-focus flex items-center gap-2.5 rounded-deck-sm px-3 py-2 text-[13px] font-medium text-deck-700 transition-colors hover:bg-deck-50"
          >
            <ExternalLink className="h-4 w-4 text-deck-400" aria-hidden="true" />
            View public site
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="deck-focus mt-1 flex w-full items-center gap-2.5 rounded-deck-sm border-t border-deck-100 px-3 py-2 text-[13px] font-medium text-status-delayed-ink transition-colors hover:bg-status-delayed/10 disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
