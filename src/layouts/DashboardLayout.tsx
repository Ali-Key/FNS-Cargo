import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Users,
  MapPinned,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { CommandPalette } from '@/components/dashboard/CommandPalette'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/utils/cn'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Roles allowed to see this link; omit for all authenticated admins/staff. */
  roles?: ('admin' | 'staff')[]
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/dashboard/shipments', label: 'Shipments', icon: Package },
  { to: '/dashboard/tracking', label: 'Tracking Updates', icon: MapPinned },
  { to: '/dashboard/customers', label: 'Customers', icon: Users },
  { to: '/dashboard/users', label: 'Users', icon: UserCog, roles: ['admin'] },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['admin'] },
]

export default function DashboardLayout() {
  const { user, role, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items = NAV_ITEMS.filter((item) => !item.roles || (role && item.roles.includes(role)))

  async function handleSignOut() {
    await signOut()
    toast.info('Signed out', 'You’ve been securely signed out. See you soon.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-steel-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-navy-950/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-steel-100 bg-white transition-transform duration-240 ease-out-premium lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-steel-100 px-5">
          <Logo variant="dark" />
          <button
            type="button"
            className="rounded-control p-1.5 text-steel-500 hover:bg-steel-100 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
                  isActive
                    ? 'bg-accent-50 text-accent-700'
                    : 'text-steel-600 hover:bg-steel-100 hover:text-navy-800',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent-500" />
                  )}
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-steel-100 p-3">
          <NavLink
            to="/dashboard/profile"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-control px-3 py-2 transition-colors duration-180',
                isActive ? 'bg-navy-50' : 'hover:bg-steel-100',
              )
            }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-sm font-bold uppercase text-navy-700">
              {user?.email?.charAt(0) ?? 'U'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">{user?.email}</p>
              <p className="text-xs font-medium capitalize text-steel-500">{role ?? 'member'}</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold text-steel-600 transition-colors duration-180 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-steel-100 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="rounded-control p-1.5 text-steel-600 hover:bg-steel-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-navy-900 lg:hidden">Dashboard</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('fns:command'))}
              className="inline-flex items-center gap-2 rounded-control border border-steel-200 bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-steel-600 transition-colors duration-180 hover:border-navy-300 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
              aria-label="Open quick tracking update"
            >
              <Zap className="h-4 w-4 text-accent-500" />
              <span className="hidden sm:inline">Quick update</span>
              <kbd className="rounded border border-steel-200 bg-steel-50 px-1.5 py-0.5 font-sans text-xs font-semibold text-steel-500">
                ⌘K
              </kbd>
            </button>
            <Link
              to="/"
              className="hidden text-sm font-medium text-steel-500 transition-colors duration-180 hover:text-navy-800 sm:inline"
            >
              View website →
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette />
    </div>
  )
}
