import type { HTMLAttributes } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import { cn } from '@/utils/cn'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error'
  title?: string
}

const ICONS = { info: Info, success: CheckCircle2, warning: AlertTriangle, error: XCircle }

const STYLES: Record<NonNullable<AlertProps['variant']>, string> = {
  info: 'border-accent-200 bg-accent-50 text-accent-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  warning: 'border-orange-200 bg-orange-50 text-orange-800',
  error: 'border-red-200 bg-red-50 text-red-800',
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
