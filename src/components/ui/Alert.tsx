import type { HTMLAttributes, ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
  /** Trailing slot, e.g. a "Retry" button. */
  action?: ReactNode
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }

const STYLES: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'bg-status-transit/[0.07] text-status-transit-ink ring-status-transit/20',
  success: 'bg-status-delivered/[0.08] text-status-delivered-ink ring-status-delivered/20',
  warning: 'bg-status-pending/[0.09] text-status-pending-ink ring-status-pending/25',
  error: 'bg-status-delayed/[0.07] text-status-delayed-ink ring-status-delayed/20',
}

export function Alert({ className, variant = 'info', title, action, children, ...props }: AlertProps) {
  const Icon = ICONS[variant]
  return (
    <div
      className={cn('flex items-start gap-3 rounded-deck px-4 py-3 ring-1 ring-inset', STYLES[variant], className)}
      role={variant === 'error' ? 'alert' : undefined}
      {...props}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
