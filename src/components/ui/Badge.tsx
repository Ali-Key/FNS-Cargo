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
  variant?: 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'signal'
  /** Solid ink fill — for the one badge on a row that must win, e.g. a count. */
  solid?: boolean
}

// Text uses the `-ink` pair of each hue so labels clear WCAG AA on the matching
// tint; the saturated token stays the fill/ring colour.
const VARIANT_STYLES: Record<NonNullable<BadgeProps['variant']>, string> = {
  neutral: 'bg-deck-100 text-deck-700 ring-deck-500/15',
  signal: 'bg-signal-50 text-signal-700 ring-signal-500/25',
  success: 'bg-status-delivered/10 text-status-delivered-ink ring-status-delivered/25',
  info: 'bg-status-transit/10 text-status-transit-ink ring-status-transit/25',
  warning: 'bg-status-pending/10 text-status-pending-ink ring-status-pending/25',
  danger: 'bg-status-delayed/10 text-status-delayed-ink ring-status-delayed/25',
}

const BADGE_BASE =
  'inline-flex items-center gap-1.5 rounded-badge px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset'

export function Badge({ className, variant = 'neutral', solid, ...props }: BadgeProps) {
  return (
    <span
      className={cn(BADGE_BASE, solid ? 'bg-deck-900 text-white ring-transparent' : VARIANT_STYLES[variant], className)}
      {...props}
    />
  )
}

// Status is never conveyed by colour alone: an icon and a text label always
// accompany it. `delayed` overrides the stage styling because it is the
// actionable case — mirrors InvoiceBadge's `overdue`.
export function StatusBadge({
  status,
  delayed,
  className,
}: {
  status: ShipmentStatus
  delayed?: boolean
  className?: string
}) {
  if (delayed) {
    return (
      <Badge variant="danger" className={className}>
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Delayed
      </Badge>
    )
  }
  const style = STATUS_STYLES[status]
  const Icon = STATUS_ICON[status]
  return (
    <span className={cn(BADGE_BASE, style.bg, style.text, style.ring, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
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

/** Money state of a shipment. Icon and label carry the meaning, not colour alone. */
export function PaymentBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const Icon = PAYMENT_ICON[status]
  return (
    <Badge variant={PAYMENT_STATUS_VARIANT[status]} className={className}>
      <Icon className="h-3 w-3" aria-hidden="true" />
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
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        Overdue
      </Badge>
    )
  }
  const Icon = INVOICE_ICON[status]
  return (
    <Badge variant={INVOICE_STATUS_VARIANT[status]} className={className}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {status}
    </Badge>
  )
}
