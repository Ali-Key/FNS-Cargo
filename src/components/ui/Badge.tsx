import type { HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'
import type { InvoiceStatus, PaymentStatus, ShipmentStatus } from '@/types'
import {
  INVOICE_STATUS_VARIANT,
  PAYMENT_STATUS_VARIANT,
  STATUS_ICON,
  STATUS_LABEL,
  STATUS_STYLES,
} from '@/utils/status'
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDollarSign,
  CircleSlash,
  FileText,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

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

const PAYMENT_ICON: Record<PaymentStatus, LucideIcon> = {
  Unpaid: Wallet,
  'Partially Paid': CircleDollarSign,
  Paid: CheckCircle2,
  Refunded: CircleSlash,
}

/** Money state of a shipment. Icon + label carry the meaning, not colour alone. */
export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const Icon = PAYMENT_ICON[status]
  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status]} className={className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {status}
    </Badge>
  )
}

const INVOICE_ICON: Record<InvoiceStatus, LucideIcon> = {
  Draft: CircleDashed,
  Issued: FileText,
  'Partially Paid': CircleDollarSign,
  Paid: CheckCircle2,
  Void: CircleSlash,
}

/** Invoice state. `overdue` overrides the styling because it is the actionable case. */
export function InvoiceBadge({
  status,
  overdue,
  className,
}: {
  status: InvoiceStatus
  overdue?: boolean
  className?: string
}) {
  if (overdue) {
    return (
      <Badge variant="danger" className={className}>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
        Overdue
      </Badge>
    )
  }
  const Icon = INVOICE_ICON[status]
  return (
    <Badge variant={INVOICE_STATUS_VARIANT[status]} className={className}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {status}
    </Badge>
  )
}
