import { useLocation } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { NotificationsMenu } from '@/components/dashboard/NotificationsMenu'
import { UserMenu } from './UserMenu'
import { routeLabel } from './navigation'
import { BrandMark } from './BrandMark'

interface TopbarProps {
  onOpenMobileNav: () => void
}

/**
 * Global header: where you are on the left, and the two global controls
 * (alerts, account) on the right. Nothing else earns a slot here — the
 * command palette still opens with the keyboard shortcut from anywhere.
 */
export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const location = useLocation()

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-deck-150 bg-panel/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="deck-focus -ml-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-deck-sm text-deck-600 transition-colors hover:bg-deck-100 hover:text-deck-900 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <BrandMark tone="light" compact className="lg:hidden" />

      <h1 className="hidden min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-deck-900 lg:block">
        {routeLabel(location.pathname)}
      </h1>

      <div className="ml-auto flex items-center gap-1 lg:ml-0">
        <NotificationsMenu />
        <span className="mx-1.5 h-6 w-px bg-deck-150" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
