import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, PackageSearch, LogIn, ChevronRight } from 'lucide-react'
import { Logo } from './Logo'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'
import { useSystemSettings } from '@/hooks/useSystemSettings'

const DESKTOP_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const MOBILE_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/services', label: 'Services' },
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
        scrolled ? 'border-b border-steel-100 bg-white shadow-elevation-1' : 'border-b border-transparent bg-white',
      )}
    >
      <div className="container-page flex items-center justify-between py-3.5">
        <Logo companyName={settings.company_name} />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
          {DESKTOP_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors',
                  isActive ? 'text-navy-900' : 'text-steel-500 hover:text-navy-800',
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
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-steel-500 transition-colors hover:text-navy-800"
          >
            <LogIn className="h-4 w-4" />
            Login
          </Link>
          <Link
            to="/tracking"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-control bg-accent-500 px-4 text-sm font-semibold text-white shadow-elevation-2 transition-all duration-180 ease-out-premium hover:bg-accent-600 active:scale-[0.98]"
          >
            <PackageSearch className="h-4 w-4" />
            Track Shipment
          </Link>
        </div>

        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-navy-800 lg:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-navy-950/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xs animate-fade-up flex-col bg-white p-6 shadow-elevation-3">
            <div className="flex items-center justify-between">
              <Logo companyName={settings.company_name} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-steel-500 hover:bg-steel-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile primary">
              {MOBILE_LINKS.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center justify-between rounded-card px-4 py-3.5 text-base font-semibold transition-colors',
                      isActive ? 'bg-navy-50 text-navy-900' : 'text-steel-600 hover:bg-steel-50',
                    )
                  }
                >
                  {link.label}
                  <ChevronRight className="h-4 w-4 text-steel-300" />
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
                <Button variant="accent" className="w-full" icon={<PackageSearch className="h-4 w-4" />}>
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
