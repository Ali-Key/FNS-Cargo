import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
}

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    'bg-navy-800 text-white hover:bg-navy-900 shadow-elevation-2 hover:shadow-elevation-3 focus-visible:ring-navy-600 disabled:hover:bg-navy-800',
  secondary:
    'bg-white text-navy-800 border border-steel-200 hover:border-navy-300 hover:bg-navy-50 shadow-sm',
  outline:
    'bg-transparent text-white border border-white/40 hover:bg-white/10',
  ghost: 'bg-transparent text-steel-600 hover:bg-steel-100 hover:text-navy-800',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-elevation-2',
  accent:
    'bg-accent-500 text-white hover:bg-accent-600 shadow-elevation-2 hover:shadow-elevation-3',
}

const SIZE_STYLES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'primary', size = 'md', loading, icon, iconPosition = 'left', children, disabled, ...props },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center rounded-control font-semibold transition-all duration-180 ease-out-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]',
          VARIANT_STYLES[variant],
          SIZE_STYLES[size],
          className,
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          icon && iconPosition === 'left' && <span className="inline-flex shrink-0">{icon}</span>
        )}
        {children}
        {!loading && icon && iconPosition === 'right' && <span className="inline-flex shrink-0">{icon}</span>}
      </button>
    )
  },
)
Button.displayName = 'Button'
