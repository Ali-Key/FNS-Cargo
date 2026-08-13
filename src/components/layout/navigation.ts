import {
  BarChart3,
  FileText,
  LayoutDashboard,
  MapPinned,
  Package,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import type { UserRole } from '@/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Roles allowed to see this link; omit for every dashboard user. */
  roles?: UserRole[]
  /** Matched exactly instead of by prefix (the dashboard root). */
  end?: boolean
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * The console's information architecture. Route paths are unchanged from the
 * previous dashboard on purpose — bookmarks and the DB gates key off them; only
 * the presentation is new.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Operate',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/dashboard/shipments', label: 'Shipments', icon: Package },
      { to: '/dashboard/tracking', label: 'Tracking', icon: MapPinned },
    ],
  },
  {
    label: 'Commercial',
    items: [
      { to: '/dashboard/customers', label: 'Customers', icon: Users },
      { to: '/dashboard/quotes', label: 'Quote Requests', icon: FileText },
      { to: '/dashboard/payments', label: 'Payments', icon: Wallet, roles: ['Admin'] },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/dashboard/analytics', label: 'Reports', icon: BarChart3, roles: ['Admin'] },
      { to: '/dashboard/settings', label: 'Settings', icon: Settings },
    ],
  },
]

/** Sections with role-gated links removed, and empty sections dropped. */
export function visibleSections(role: UserRole | null | undefined): NavSection[] {
  return NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.roles || (role != null && item.roles.includes(role))),
  })).filter((section) => section.items.length > 0)
}

/** Human label for the current route, used by the topbar crumb and page title. */
export function routeLabel(pathname: string): string {
  const all = NAV_SECTIONS.flatMap((s) => s.items)
  const exact = all.find((i) => i.to === pathname)
  if (exact) return exact.label
  const prefix = all
    .filter((i) => !i.end && pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]
  if (prefix) return prefix.label
  return 'Dashboard'
}
