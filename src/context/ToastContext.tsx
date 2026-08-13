import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertTriangle, XCircle, Info, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  variant: ToastType
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  push: (toast: Omit<Toast, 'id'>) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  dismissAll: () => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

const ICONS: Record<ToastType, LucideIcon> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

// White-card treatment with a variant-tinted icon chip and progress bar —
// color is always paired with an icon, never the sole signal.
const VARIANT: Record<ToastType, { chip: string; bar: string; primary: string }> = {
  success: { chip: 'bg-success-50 text-success-600', bar: 'bg-success-500', primary: 'ring-success-500/20' },
  error: { chip: 'bg-danger-50 text-danger-600', bar: 'bg-danger-500', primary: 'ring-danger-500/20' },
  warning: { chip: 'bg-warning-50 text-warning-600', bar: 'bg-warning-500', primary: 'ring-warning-500/20' },
  info: { chip: 'bg-signal-50 text-signal-600', bar: 'bg-signal-500', primary: 'ring-signal-500/20' },
}

// Errors linger longer so they can be read; successes clear quickly.
const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 4000,
  info: 4500,
  warning: 5500,
  error: 6500,
}

const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    // Newest on top; cap the stack so a burst never floods the screen.
    setToasts((prev) => [{ ...toast, id }, ...prev].slice(0, MAX_VISIBLE))
  }, [])

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      success: (title, description) => push({ variant: 'success', title, description }),
      error: (title, description) => push({ variant: 'error', title, description }),
      warning: (title, description) => push({ variant: 'warning', title, description }),
      info: (title, description) => push({ variant: 'info', title, description }),
      dismissAll: () => setToasts([]),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:right-6 sm:items-end sm:px-0"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  const Icon = ICONS[toast.variant]
  const styles = VARIANT[toast.variant]
  const duration = toast.duration ?? DEFAULT_DURATION[toast.variant]

  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const barRef = useRef<HTMLDivElement>(null)
  const startRef = useRef(0)
  const remainingRef = useRef(duration)
  const rafRef = useRef(0)
  const pausedRef = useRef(false)
  const closedRef = useRef(false)

  const beginClose = useCallback(() => {
    if (closedRef.current) return
    closedRef.current = true
    cancelAnimationFrame(rafRef.current)
    setLeaving(true)
    setVisible(false)
  }, [])

  // Slide/fade in on the next frame after mount.
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Auto-dismiss countdown that drives the progress bar and pauses on hover/focus.
  useEffect(() => {
    startRef.current = performance.now()
    const tick = (now: number) => {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }
      const remaining = Math.max(0, remainingRef.current - (now - startRef.current))
      if (barRef.current) barRef.current.style.transform = `scaleX(${remaining / duration})`
      if (remaining <= 0) {
        beginClose()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [duration, beginClose])

  function pause() {
    if (pausedRef.current) return
    pausedRef.current = true
    remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startRef.current))
  }
  function resume() {
    if (!pausedRef.current) return
    pausedRef.current = false
    startRef.current = performance.now()
  }

  function handleTransitionEnd(e: React.TransitionEvent) {
    if (leaving && e.propertyName === 'transform') onClose(toast.id)
  }

  return (
    <div
      role={toast.variant === 'error' ? 'alert' : 'status'}
      aria-atomic="true"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={resume}
      onTransitionEnd={handleTransitionEnd}
      className={cn(
        'pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-deck border border-deck-100 bg-white shadow-deck-pop ring-1',
        styles.primary,
        'transition-all duration-240 ease-out-premium motion-reduce:transition-none',
        visible && !leaving ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0',
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-deck-sm', styles.chip)}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <div className="flex-1 pt-0.5">
          <p className="text-sm font-semibold text-deck-900">{toast.title}</p>
          {toast.description && <p className="mt-0.5 text-sm leading-snug text-deck-500">{toast.description}</p>}
        </div>
        <button
          onClick={beginClose}
          className="-mr-1 -mt-1 rounded-md p-1 text-deck-400 transition-colors hover:bg-deck-100 hover:text-deck-700"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {/* Auto-dismiss progress bar */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-deck-100">
        <div ref={barRef} className={cn('h-full origin-left', styles.bar)} style={{ transform: 'scaleX(1)' }} />
      </div>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
