import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, PackageSearch, LogIn, ChevronRight } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useSystemSettings } from '@/hooks/useSystemSettings'

/** Single source of truth for primary navigation (desktop and mobile). */
const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { settings } = useSystemSettings()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-240 ease-out-premium',
        scrolled
          ? 'border-b border-border bg-white/85 shadow-elevation-1 backdrop-blur-xl supports-[backdrop-filter]:bg-white/75'
          : 'border-b border-transparent bg-white',
      )}
    >
      <div className="container-page flex items-center justify-between py-3.5">
        <Logo companyName={settings.company_name} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative rounded-control px-3.5 py-2 text-sm font-semibold transition-colors',
                  'after:absolute after:inset-x-3.5 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary-500 after:transition-transform after:duration-240 after:ease-out-premium',
                  isActive
                    ? 'text-navy-900 after:scale-x-100'
                    : 'text-text-secondary hover:text-navy-800 after:scale-x-0 hover:after:scale-x-100',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-control px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <Link
            to="/tracking"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-primary-500 px-4 text-sm font-semibold text-white  shadow-elevation-2 transition-all duration-180 ease-out-premium hover:bg-primary-500 hover:shadow-elevation-3 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <PackageSearch className="h-4 w-4 " />
            Track Shipment
          </Link>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-control text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div
            id="mobile-nav-panel"
            className="absolute inset-y-0 right-0 flex w-full max-w-xs animate-fade-up flex-col bg-white p-6 shadow-elevation-3"
          >
            <div className="flex items-center justify-between">
              <Logo companyName={settings.company_name} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-control text-text-secondary hover:bg-steel-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile primary">
              {NAV_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-card px-4 py-3.5 text-base font-semibold transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                      isActive ? 'bg-navy-50 text-navy-900' : 'text-steel-600 hover:bg-surface',
                    )
                  }
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4 text-navy-200" />
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Link to="/login" onClick={() => setMobileOpen(false)}>
                <Button variant="secondary" className="w-full">
                  Login
                </Button>
              </Link>
              <Link to="/tracking" onClick={() => setMobileOpen(false)}>
                <Button variant="primary" className="w-full" icon={<PackageSearch className="h-4 w-4" />}>
                  Track Shipment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
