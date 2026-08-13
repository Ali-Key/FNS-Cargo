import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/utils/cn'

interface DropdownItem {
  label: string
  onClick: () => void
  icon?: ReactNode
  danger?: boolean
}

interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  /** Optional section label above the items — names the record being acted on. */
  title?: string
}

/** Props cloned onto the trigger so the control that opens the menu is the one
 *  that announces it — a wrapper `div` with the click handler leaves the button
 *  itself with no `aria-expanded` for a screen reader to read. */
interface TriggerProps {
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void
  'aria-haspopup'?: 'menu'
  'aria-expanded'?: boolean
}

const GAP = 6

export function Dropdown({ trigger, items, align = 'right', title }: DropdownProps) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CSSProperties>({ position: 'fixed', top: -9999, left: -9999 })
  const anchorRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  /** The menu is portalled to `body` and positioned from the trigger's rect.
   *  Row actions sit inside `Table`'s `overflow-x-auto` wrapper, which computes
   *  `overflow-y` to `auto`; an absolutely positioned menu there is clipped by
   *  that box and the last rows' menus get cut off. Fixed + portal escapes it. */
  const place = useCallback(() => {
    const anchor = anchorRef.current
    const menu = menuRef.current
    if (!anchor || !menu) return
    const r = anchor.getBoundingClientRect()
    const spaceBelow = window.innerHeight - r.bottom - GAP
    const spaceAbove = r.top - GAP
    const flip = menu.offsetHeight > spaceBelow && spaceAbove > spaceBelow
    setStyle({
      position: 'fixed',
      top: flip ? undefined : Math.round(r.bottom + GAP),
      bottom: flip ? Math.round(window.innerHeight - r.top + GAP) : undefined,
      left: align === 'left' ? Math.round(r.left) : undefined,
      right: align === 'right' ? Math.round(window.innerWidth - r.right) : undefined,
      maxHeight: Math.round(Math.max(160, (flip ? spaceAbove : spaceBelow) - GAP)),
    })
  }, [align])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place, items.length])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    // A fixed menu goes stale the moment the page moves behind it, so close
    // rather than chase the scroll — except when the scroll is the menu's own.
    const onViewportChange = (e: Event) => {
      if (e.target instanceof Node && menuRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    window.addEventListener('resize', onViewportChange)
    window.addEventListener('scroll', onViewportChange, true)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      window.removeEventListener('resize', onViewportChange)
      window.removeEventListener('scroll', onViewportChange, true)
    }
  }, [open])

  function focusTrigger() {
    anchorRef.current?.querySelector('button')?.focus()
  }

  function close() {
    setOpen(false)
    focusTrigger()
  }

  /** Roving focus across the menu, so the keyboard path matches the mouse one. */
  function handleMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const options = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [],
    )
    if (!options.length) return
    const index = options.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'Escape' || e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      close()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      options[(index + 1) % options.length]?.focus()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      options[(index - 1 + options.length) % options.length]?.focus()
    } else if (e.key === 'Home') {
      e.preventDefault()
      options[0]?.focus()
    } else if (e.key === 'End') {
      e.preventDefault()
      options[options.length - 1]?.focus()
    }
  }

  // Only reserve the icon gutter when the menu actually has icons, so plain
  // menus (export lists, alerts) do not sit on a phantom indent.
  const hasIcons = items.some((item) => item.icon)

  const triggerNode = isValidElement<TriggerProps>(trigger)
    ? cloneElement(trigger as ReactElement<TriggerProps>, {
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        onClick: (event: ReactMouseEvent<HTMLElement>) => {
          trigger.props.onClick?.(event)
          setOpen((v) => !v)
        },
      })
    : // Non-element triggers (a bare string, a fragment) keep the wrapper handler.
      <div onClick={() => setOpen((v) => !v)}>{trigger}</div>

  return (
    <div
      className="inline-flex"
      ref={anchorRef}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation()
          close()
        }
      }}
    >
      {triggerNode}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            style={style}
            onKeyDown={handleMenuKeyDown}
            aria-label={title}
            className="deck-enter deck-scroll z-[70] w-max min-w-[216px] max-w-[300px] overflow-y-auto rounded-deck border border-deck-100 bg-panel p-1.5 shadow-deck-pop"
          >
            {title && (
              <p className="truncate border-b border-deck-100 px-2 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.08em] text-deck-400">
                {title}
              </p>
            )}
            {items.map((item, i) => (
              <button
                key={i}
                type="button"
                role="menuitem"
                autoFocus={i === 0}
                onClick={() => {
                  item.onClick()
                  setOpen(false)
                  focusTrigger()
                }}
                className={cn(
                  'deck-focus group flex w-full items-center gap-2.5 rounded-deck-sm px-2 py-1.5 text-left text-[13px] font-medium transition-colors',
                  // Destructive items are fenced off from the safe ones above.
                  item.danger && !items[i - 1]?.danger && i > 0 && 'mt-1.5 border-t border-deck-100 pt-2.5',
                  (title || i > 0) && !item.danger && 'mt-0.5',
                  item.danger
                    ? 'text-status-delayed-ink hover:bg-status-delayed/10'
                    : 'text-deck-700 hover:bg-deck-50 hover:text-deck-900',
                )}
              >
                {hasIcons && (
                  // A bordered tile, not a loose glyph: it keeps the labels on one
                  // optical line and gives the danger item its own colour block.
                  <span
                    className={cn(
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-deck-sm border transition-colors [&>svg]:h-4 [&>svg]:w-4',
                      item.danger
                        ? 'border-status-delayed/25 bg-status-delayed/10 text-status-delayed-ink'
                        : 'border-deck-150 bg-deck-50 text-deck-500 group-hover:border-deck-300 group-hover:bg-panel group-hover:text-deck-900',
                    )}
                  >
                    {item.icon}
                  </span>
                )}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  )
}
