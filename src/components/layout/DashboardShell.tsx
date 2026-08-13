import { Suspense, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { CommandPalette } from '@/components/dashboard/CommandPalette'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'

const RAIL_KEY = 'fsn.deck.rail'

/**
 * The FSN Cargo console frame: dark command rail, sticky global header, and a
 * single scrolling work area. Every dashboard route renders inside it.
 */
export function DashboardShell() {
  const { role } = useAuth()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(RAIL_KEY) === '1'
  })

  useEffect(() => {
    window.localStorage.setItem(RAIL_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // A route change closes the mobile drawer; leaving it open would cover the
  // page the user just navigated to.
  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <div className="min-h-screen bg-canvas">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-deck-950/60 backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((v) => !v)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className={cn('transition-[padding] duration-240 ease-out-premium', collapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} />
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {/* The boundary sits here, not around the whole app: a route whose
              chunk is still downloading replaces this area only, so the rail
              and topbar never unmount and never re-run their queries. */}
          <Suspense fallback={<PageFallback />}>
            <Outlet />
          </Suspense>
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}

/** Shown only while a page's JS chunk downloads for the first time. */
function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size={26} className="text-deck-400" />
    </div>
  )
}
