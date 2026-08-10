import { cn } from '@/utils/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BASE =
  'inline-flex items-center justify-center rounded-control font-semibold transition-all duration-180 ease-out-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]'

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 shadow-elevation-2 hover:shadow-elevation-3 focus-visible:ring-primary-600 disabled:hover:bg-primary-500',
  secondary:
    'bg-white text-ink border border-border hover:border-primary-300 hover:bg-primary-50 shadow-sm',
  outline: 'bg-transparent text-white border border-white/40 hover:bg-white/10',
  ghost: 'bg-transparent text-text-secondary hover:bg-steel-100 hover:text-ink',
  danger: 'bg-status-delayed text-white hover:bg-status-delayed/90 shadow-elevation-2',
}

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-7 text-base gap-2.5',
}

/**
 * The button's classes without the `<button>`.
 *
 * A call to action that navigates has to be an `<a>`, not a button inside one —
 * the public pages used to wrap `<Button>` in `<Link>`, which nests a control
 * inside a link and hands assistive technology two overlapping targets for the
 * same thing. `ButtonLink` in components/site renders a real link from these.
 *
 * It lives in its own module rather than beside the component because a file
 * that exports both a component and a helper breaks Fast Refresh.
 */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
) {
  return cn(BASE, VARIANT_STYLES[variant], SIZE_STYLES[size], className)
}
