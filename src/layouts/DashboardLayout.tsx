import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Users,
  MapPinned,
  FileText,
  Wallet,
  Receipt,
  BarChart3,
  ClipboardList,
  UserCog,
  Settings,
  LogOut,
  Menu,
  X,
  Zap,
  Search,
} from 'lucide-react'
import { Logo } from '@/components/common/Logo'
import { Avatar, Input } from '@/components/ui'
import { CommandPalette } from '@/components/dashboard/CommandPalette'
import { NotificationsMenu } from '@/components/dashboard/NotificationsMenu'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { cn } from '@/utils/cn'
import type { UserRole } from '@/types'

interface NavItem {
  to: string
  label: string
  icon: typeof LayoutDashboard
  /** Roles allowed to see this link; omit for all dashboard users. */
  roles?: UserRole[]
}

interface NavGroup {
  label: string
  items: NavItem[]
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Operations',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/dashboard/shipments', label: 'Shipments', icon: Package },
      { to: '/dashboard/tracking', label: 'Tracking', icon: MapPinned },
      { to: '/dashboard/customers', label: 'Customers', icon: Users },
      { to: '/dashboard/quotes', label: 'Quote Requests', icon: FileText },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/dashboard/payments', label: 'Payments', icon: Wallet, roles: ['Admin'] },
      { to: '/dashboard/invoices', label: 'Invoices', icon: Receipt, roles: ['Admin'] },
      { to: '/dashboard/reports', label: 'Reports', icon: ClipboardList, roles: ['Admin'] },
    ],
  },
  {
    label: 'Insights & Admin',
    items: [
      { to: '/dashboard/analytics', label: 'Analytics', icon: BarChart3, roles: ['Admin'] },
      { to: '/dashboard/users', label: 'Users', icon: UserCog, roles: ['Admin'] },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings, roles: ['Admin'] },
    ],
  },
]

export default function DashboardLayout() {
  const { user, profile, role, signOut } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [search, setSearch] = useState('')

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const term = search.trim()
    if (!term) return
    navigate(`/dashboard/shipments?q=${encodeURIComponent(term)}`)
  }

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (role && item.roles.includes(role))),
  })).filter((group) => group.items.length > 0)

  async function handleSignOut() {
    await signOut()
    toast.info('Signed out', 'You’ve been securely signed out. See you soon.')
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-surface">
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
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform duration-240 ease-out-premium lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <Logo variant="dark" />
          <button
            type="button"
            className="rounded-control p-1.5 text-text-secondary hover:bg-steel-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto p-3">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.1em] text-steel-400">{group.label}</p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/dashboard'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-steel-600 hover:bg-steel-100 hover:text-navy-800',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary-500" />
                      )}
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 p-3">
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
            <Avatar name={profile?.full_name ?? user?.email} src={profile?.avatar_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-navy-900">
                {profile?.full_name ?? user?.email}
              </p>
              <p className="truncate text-xs font-medium text-text-secondary">{role ?? 'Member'}</p>
            </div>
          </NavLink>
          <button
            type="button"
            onClick={handleSignOut}
            className="mt-1 flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-sm font-semibold text-steel-600 transition-colors duration-180 hover:bg-status-delayed/10 hover:text-status-delayed"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            className="rounded-control p-1.5 text-steel-600 hover:bg-steel-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold text-navy-900 lg:hidden">Dashboard</span>
          <form onSubmit={handleSearchSubmit} className="hidden max-w-xs flex-1 sm:block">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tracking #, customer…"
              icon={<Search className="h-4 w-4" />}
              aria-label="Search shipments and customers"
              className="h-9"
            />
          </form>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('fns:command'))}
              className="inline-flex items-center gap-2 rounded-control border border-gray-300 bg-white py-1.5 pl-3 pr-2 text-sm font-medium text-steel-600 transition-colors duration-180 hover:border-navy-300 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
              aria-label="Open quick tracking update"
            >
              <Zap className="h-4 w-4 text-primary-500" />
              <span className="hidden sm:inline">Quick update</span>
              <kbd className="rounded border border-gray-300 bg-surface px-1.5 py-0.5 font-sans text-xs font-semibold text-text-secondary">
                ⌘K
              </kbd>
            </button>
            <NotificationsMenu />
            <Link
              to="/"
              className="hidden text-sm font-medium text-text-secondary transition-colors duration-180 hover:text-navy-800 sm:inline"
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
