import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'default' | 'danger'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control has no visible text to announce. */
  label: string
  icon: ReactNode
  tone?: Tone
  /** Tooltip text. Defaults to `label`. */
  title?: string
}

const TONE_STYLES: Record<Tone, string> = {
  default: 'text-deck-500 hover:border-deck-300 hover:bg-deck-50 hover:text-deck-900',
  danger:
    'text-deck-500 hover:border-status-delayed/40 hover:bg-status-delayed/10 hover:text-status-delayed-ink',
}

/**
 * The single icon-only control used by every table row and card action. Four
 * pages previously hand-rolled this shell with three different radii, two
 * shadow treatments and raw `red-*` classes; keeping one component is what
 * stops a manifest row and a ledger row from looking like different products.
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, icon, tone = 'default', title, className, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={title ?? label}
      className={cn(
        'deck-focus inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-deck-sm border border-deck-150 bg-transparent transition-colors duration-180',
        'disabled:cursor-not-allowed disabled:border-deck-100 disabled:text-deck-300 disabled:hover:border-deck-100 disabled:hover:bg-transparent disabled:hover:text-deck-300',
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  ),
)
IconButton.displayName = 'IconButton'
