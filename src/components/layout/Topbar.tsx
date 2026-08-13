import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Command, Menu, Search } from 'lucide-react'
import { NotificationsMenu } from '@/components/dashboard/NotificationsMenu'
import { UserMenu } from './UserMenu'
import { routeLabel } from './navigation'
import { BrandMark } from './BrandMark'

interface TopbarProps {
  onOpenMobileNav: () => void
}

/**
 * Global header: where you are, one search that always means "find a
 * consignment", and the three global controls (quick update, alerts, account).
 */
export function Topbar({ onOpenMobileNav }: TopbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [term, setTerm] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    navigate(`/dashboard/shipments?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-deck-150 bg-panel/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="deck-focus -ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-deck-sm text-deck-600 transition-colors hover:bg-deck-100 hover:text-deck-900 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <BrandMark tone="light" compact className="lg:hidden" />

      <p className="hidden min-w-0 truncate text-[15px] font-semibold text-deck-900 lg:block">
        {routeLabel(location.pathname)}
      </p>

      <form onSubmit={handleSubmit} role="search" className="ml-auto hidden max-w-sm flex-1 md:ml-6 md:block">
        <label htmlFor="deck-search" className="sr-only">
          Search shipments by tracking number or customer
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-deck-400" aria-hidden="true" />
          <input
            id="deck-search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search tracking number or customer"
            className="deck-focus h-10 w-full rounded-deck-sm border border-deck-150 bg-deck-50 pl-9 pr-3 text-[13px] text-deck-900 transition-colors placeholder:text-deck-400 hover:border-deck-200 focus:border-signal-500 focus:bg-panel"
          />
        </div>
      </form>

      <div className="ml-auto flex items-center gap-1.5 md:ml-0">
        {/* Quiet, not solid ink: the page's own primary action is a dark button,
            and two identical dark buttons on one screen means neither is the
            primary. This is a global shortcut, so it reads as chrome. */}
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event('fsn:command'))}
          aria-label="Post a quick tracking update"
          className="deck-focus inline-flex h-9 items-center gap-2 rounded-deck-sm border border-deck-150 px-2.5 text-[13px] font-semibold text-deck-700 transition-colors hover:border-deck-300 hover:bg-deck-50 hover:text-deck-900"
        >
          <Command className="h-4 w-4 text-deck-400" aria-hidden="true" />
          <span className="hidden sm:inline">Quick update</span>
          <kbd className="hidden rounded bg-deck-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-deck-500 lg:inline">
            ⌘K
          </kbd>
        </button>
        <NotificationsMenu />
        <span className="mx-1 hidden h-6 w-px bg-deck-150 sm:block" aria-hidden="true" />
        <UserMenu />
      </div>
    </header>
  )
}
