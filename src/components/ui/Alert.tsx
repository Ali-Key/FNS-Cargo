import type { HTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }

const STYLES: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-status-transit/25 bg-status-transit/10 text-status-transit',
  success: 'border-status-delivered/25 bg-status-delivered/10 text-status-delivered',
  warning: 'border-status-pending/25 bg-status-pending/10 text-status-pending',
  error: 'border-status-delayed/25 bg-status-delayed/10 text-status-delayed',
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const Icon = ICONS[variant]
  return (
    <div className={cn('flex gap-3 rounded-card border px-4 py-3.5', STYLES[variant], className)} {...props}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="mt-0.5 opacity-90">{children}</div>}
      </div>
    </div>
  )
}
