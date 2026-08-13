import { NavLink } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, LifeBuoy, X } from 'lucide-react'
import { BrandMark } from './BrandMark'
import { visibleSections } from './navigation'
import { cn } from '@/utils/cn'
import type { UserRole } from '@/types'

interface SidebarProps {
  role: UserRole | null | undefined
  collapsed: boolean
  onToggleCollapsed: () => void
  mobileOpen: boolean
  onCloseMobile: () => void
}

/**
 * The command rail. Dark, full-height, and the only persistently dark surface
 * in the console — it anchors the eye at the left edge so every working page
 * can stay light and dense without losing its frame.
 */
export function Sidebar({ role, collapsed, onToggleCollapsed, mobileOpen, onCloseMobile }: SidebarProps) {
  const sections = visibleSections(role)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-deck-900 shadow-deck-rail transition-[width,transform] duration-240 ease-out-premium lg:translate-x-0',
        collapsed ? 'w-[72px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
      aria-label="FSN Cargo dashboard navigation"
    >
      <div
        className={cn(
          'deck-rail-texture flex h-16 shrink-0 items-center border-b border-white/[0.07]',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        <BrandMark compact={collapsed} />
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className={cn(
            'deck-focus-dark -mr-1 inline-flex h-9 w-9 items-center justify-center rounded-deck-sm text-deck-300 transition-colors hover:bg-white/10 hover:text-white lg:hidden',
            collapsed && 'hidden',
          )}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="deck-scroll flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden="true" />
            ) : (
              <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-deck-500">
                {section.label}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'deck-focus-dark group relative flex items-center rounded-deck-sm text-[13px] font-medium transition-colors duration-180',
                        collapsed ? 'h-10 justify-center' : 'h-10 gap-3 px-3',
                        isActive
                          ? 'bg-white/[0.08] text-white'
                          : 'text-deck-300 hover:bg-white/[0.05] hover:text-white',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active marker rides the rail edge, so the state reads
                            identically whether the rail is open or collapsed. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-signal-400 transition-opacity',
                            isActive ? 'opacity-100' : 'opacity-0',
                          )}
                        />
                        <item.icon
                          className={cn(
                            'h-[18px] w-[18px] shrink-0 transition-colors',
                            isActive ? 'text-signal-300' : 'text-deck-400 group-hover:text-deck-200',
                          )}
                          aria-hidden="true"
                        />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                        {collapsed && <span className="sr-only">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-white/[0.07] p-3">
        {!collapsed && (
          <a
            href="/contact"
            className="deck-focus-dark mb-2 flex items-center gap-3 rounded-deck-sm px-3 py-2 text-[13px] font-medium text-deck-300 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <LifeBuoy className="h-[18px] w-[18px] shrink-0 text-deck-400" aria-hidden="true" />
            Support
          </a>
        )}
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
          className={cn(
            'deck-focus-dark hidden h-10 w-full items-center rounded-deck-sm text-[13px] font-medium text-deck-400 transition-colors hover:bg-white/[0.05] hover:text-white lg:flex',
            collapsed ? 'justify-center' : 'gap-3 px-3',
          )}
        >
          {collapsed ? (
            <ChevronsRight className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <>
              <ChevronsLeft className="h-[18px] w-[18px]" aria-hidden="true" />
              Collapse
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
