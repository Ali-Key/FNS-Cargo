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
import { Badge } from '@/components/ui'
import type { InvoiceStatus, PaymentStatus } from '@/types'
import { INVOICE_STATUS_VARIANT, PAYMENT_STATUS_VARIANT } from '@/utils/status'

// Money badges are dashboard-only: a customer never sees an invoice's state,
// only where their parcel is. `StatusBadge` stays in ui/ because the public
// tracking widget renders it.

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
