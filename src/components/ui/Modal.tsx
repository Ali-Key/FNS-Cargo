import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const SIZE_STYLES: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
}

const SHEET =
  // Full-height sheet on phones, centred dialog from `sm` up. A tall shipment
  // form is unusable as a floating card on a 360px screen.
  'relative z-10 flex max-h-[100dvh] w-full flex-col overflow-hidden bg-panel shadow-deck-pop sm:max-h-[90vh] sm:rounded-deck-lg'

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  // Held in a ref so the effects below key on `open` alone. Callers pass a fresh
  // arrow every render; keying on it would re-run the focus effect on any parent
  // re-render and yank the caret back to the first field mid-typing.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      // Tab wraps inside the dialog: without this, tabbing past the last field
      // walks into the page behind the overlay.
      if (e.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open])

  // Move focus into the dialog on open, and hand it back to whatever opened it
  // on close — otherwise a keyboard user is dropped at the top of the document
  // and has to tab all the way back to the row they came from.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    const focusTimer = window.setTimeout(() => {
      const target = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      ;(target ?? dialogRef.current)?.focus()
    }, 0)
    return () => {
      window.clearTimeout(focusTimer)
      opener?.focus?.()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fade-in bg-deck-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        className={cn(SHEET, 'deck-enter', SIZE_STYLES[size])}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-deck-100 px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id="modal-title" className="text-[16px] font-bold tracking-tight text-deck-900">
                {title}
              </h2>
              {description && <p className="mt-1 text-[13px] leading-relaxed text-deck-500">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="deck-focus -mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-deck-sm text-deck-400 transition-colors hover:bg-deck-100 hover:text-deck-900"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        )}
        {/* The body scrolls, not the dialog: the header stays put and the footer
            stays reachable on a 17-field shipment form. */}
        <div className="deck-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-deck-100 bg-deck-50/60 px-5 py-3.5 sm:px-6">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
