import {
  CheckCircle2,
  Truck,
  Clock,
  Package,
  Warehouse,
  PackageCheck,
  ClipboardCheck,
  MapPin,
  Send,
  type LucideIcon,
} from 'lucide-react'
import type { InvoiceStatus, PaymentStatus, ShipmentStatus, ShippingMethod } from '@/types'

// Enum values are already human-readable labels, so the label map is identity.
export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  Received: 'Received',
  Processing: 'Processing',
  Warehouse: 'Warehouse',
  Shipped: 'Shipped',
  'In Transit': 'In Transit',
  'Customs Clearance': 'Customs Clearance',
  Arrived: 'Arrived',
  'Out for Delivery': 'Out for Delivery',
  Delivered: 'Delivered',
}

export const STATUS_ICON: Record<ShipmentStatus, LucideIcon> = {
  Received: Package,
  Processing: Clock,
  Warehouse: Warehouse,
  Shipped: PackageCheck,
  'In Transit': Truck,
  'Customs Clearance': ClipboardCheck,
  Arrived: MapPin,
  'Out for Delivery': Send,
  Delivered: CheckCircle2,
}

type StatusStyle = { bg: string; text: string; dot: string; ring: string }

// Three visual buckets mapped onto the existing status color tokens.
// Color is never the only signal — badges pair this with an icon + label.
const GREEN: StatusStyle = { bg: 'bg-status-delivered/10', text: 'text-status-delivered', dot: 'bg-status-delivered', ring: 'ring-status-delivered/25' }
const BLUE: StatusStyle = { bg: 'bg-status-transit/10', text: 'text-status-transit', dot: 'bg-status-transit', ring: 'ring-status-transit/25' }
const AMBER: StatusStyle = { bg: 'bg-status-pending/10', text: 'text-status-pending', dot: 'bg-status-pending', ring: 'ring-status-pending/25' }

export const STATUS_STYLES: Record<ShipmentStatus, StatusStyle> = {
  Received: AMBER,
  Processing: AMBER,
  Warehouse: AMBER,
  'Customs Clearance': AMBER,
  Shipped: BLUE,
  'In Transit': BLUE,
  Arrived: BLUE,
  'Out for Delivery': BLUE,
  Delivered: GREEN,
}

// Hex mirrors of the status buckets — Recharts / inline styles need literal colors.
const GREEN_HEX = '#0f8a54'
const BLUE_HEX = '#f26b1d'
const AMBER_HEX = '#d97706'

export const STATUS_HEX: Record<ShipmentStatus, string> = {
  Received: AMBER_HEX,
  Processing: AMBER_HEX,
  Warehouse: AMBER_HEX,
  'Customs Clearance': AMBER_HEX,
  Shipped: BLUE_HEX,
  'In Transit': BLUE_HEX,
  Arrived: BLUE_HEX,
  'Out for Delivery': BLUE_HEX,
  Delivered: GREEN_HEX,
}

// Approximate journey completion per status, for the public route bar.
export const STATUS_PROGRESS: Record<ShipmentStatus, number> = {
  Received: 6,
  Processing: 16,
  Warehouse: 28,
  Shipped: 44,
  'In Transit': 62,
  'Customs Clearance': 76,
  Arrived: 88,
  'Out for Delivery': 95,
  Delivered: 100,
}

// ---- Money states ----------------------------------------------------------
// Payment state is money, not motion, so it gets its own scale rather than
// reusing the shipment buckets: unpaid reads as an outstanding action (amber),
// paid as settled (green), refunded as neutral so it does not compete.
type BadgeVariant = 'neutral' | 'success' | 'info' | 'warning' | 'danger'

export const PAYMENT_STATUS_VARIANT: Record<PaymentStatus, BadgeVariant> = {
  Unpaid: 'warning',
  'Partially Paid': 'info',
  Paid: 'success',
  Refunded: 'neutral',
}

export const INVOICE_STATUS_VARIANT: Record<InvoiceStatus, BadgeVariant> = {
  Draft: 'neutral',
  Issued: 'warning',
  'Partially Paid': 'info',
  Paid: 'success',
  Void: 'neutral',
}

/** True when an unsettled invoice has passed its due date. */
export function isInvoiceOverdue(status: InvoiceStatus, dueDate: string | null, balance: number | null): boolean {
  if (!dueDate || status === 'Paid' || status === 'Void' || status === 'Draft') return false
  if ((balance ?? 0) <= 0) return false
  return dueDate < new Date().toISOString().slice(0, 10)
}

/** True when a shipment is past its estimate and still moving. */
export function isShipmentDelayed(status: ShipmentStatus, estimatedDelivery: string | null): boolean {
  if (status === 'Delivered' || !estimatedDelivery) return false
  return estimatedDelivery < new Date().toISOString().slice(0, 10)
}

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  'Air Express': 'Air Express',
  'Air Freight': 'Air Freight',
  'Sea Freight': 'Sea Freight',
  'Road Freight': 'Road Freight',
  'Door to Door': 'Door to Door',
}

export function isValidTrackingNumberInput(value: string): boolean {
  return value.trim().length >= 6
}
