import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'deck' | 'signal' | 'secondary' | 'subtle' | 'outline' | 'ghost' | 'danger'
type Size = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  /** Stretch to the container width — used by mobile row footers and forms. */
  block?: boolean
}

const VARIANT_STYLES: Record<Variant, string> = {
  // `primary` stays the public marketing blue so the website is untouched.
  primary: 'bg-primary-500 text-white hover:bg-primary-600 shadow-sm',
  // `deck` is the console's default action: solid FSN brand blue, no glow.
  deck: 'bg-signal-500 text-white hover:bg-signal-600 shadow-sm',
  signal: 'bg-signal-500 text-white hover:bg-signal-600 shadow-sm',
  secondary: 'bg-panel text-deck-800 shadow-deck hover:bg-deck-50',
  subtle: 'bg-deck-100 text-deck-700 hover:bg-deck-150',
  outline: 'bg-transparent text-white border border-white/40 hover:bg-white/10',
  ghost: 'bg-transparent text-deck-600 hover:bg-deck-100 hover:text-deck-900',
  danger: 'bg-status-delayed text-white hover:bg-status-delayed/90 shadow-sm',
}

const SIZE_STYLES: Record<Size, string> = {
  xs: 'h-8 px-2.5 text-[12px] gap-1.5',
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'deck', size = 'md', loading, icon, iconPosition = 'left', block, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'deck-focus inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-deck-sm font-semibold transition-colors duration-180 disabled:cursor-not-allowed disabled:opacity-55',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        block && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
    </button>
  ),
)
Button.displayName = 'Button'
