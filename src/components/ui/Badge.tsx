import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import type { ShipmentStatus } from '@/types'
import { STATUS_ICON, STATUS_LABEL, STATUS_STYLES } from '@/utils/status'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'success' | 'info' | 'warning' | 'danger'
}

const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-steel-100 text-steel-700 ring-steel-500/20',
  success: 'bg-status-delivered/10 text-status-delivered ring-status-delivered/25',
  info: 'bg-status-transit/10 text-status-transit ring-status-transit/25',
  warning: 'bg-status-pending/10 text-status-pending ring-status-pending/25',
  danger: 'bg-status-delayed/10 text-status-delayed ring-status-delayed/25',
}

export function Badge({ className, variant = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        VARIANT_STYLES[variant],
        className,
      )}
      {...props}
    />
  )
}

// Status is never conveyed by color alone: icon + text label always accompany it.
export function StatusBadge({ status, className }: { status: ShipmentStatus; className?: string }) {
  const style = STATUS_STYLES[status]
  const Icon = STATUS_ICON[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-badge px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
        style.bg,
        style.text,
        style.ring,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}
