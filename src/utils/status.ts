import { CheckCircle2, Truck, Clock, AlertTriangle, XCircle, type LucideIcon } from 'lucide-react'
import type { ShipmentStatus, ShippingMethod } from '@/types'

export const STATUS_LABEL: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
}

export const STATUS_ICON: Record<ShipmentStatus, LucideIcon> = {
  delivered: CheckCircle2,
  in_transit: Truck,
  pending: Clock,
  delayed: AlertTriangle,
  cancelled: XCircle,
}

// Exact status palette — color is never the only signal, every badge pairs
// this with an icon (STATUS_ICON) and the text label (STATUS_LABEL).
export const STATUS_STYLES: Record<ShipmentStatus, { bg: string; text: string; dot: string; ring: string }> = {
  delivered: { bg: 'bg-status-delivered/10', text: 'text-status-delivered', dot: 'bg-status-delivered', ring: 'ring-status-delivered/25' },
  in_transit: { bg: 'bg-status-transit/10', text: 'text-status-transit', dot: 'bg-status-transit', ring: 'ring-status-transit/25' },
  pending: { bg: 'bg-status-pending/10', text: 'text-status-pending', dot: 'bg-status-pending', ring: 'ring-status-pending/25' },
  delayed: { bg: 'bg-status-delayed/10', text: 'text-status-delayed', dot: 'bg-status-delayed', ring: 'ring-status-delayed/25' },
  cancelled: { bg: 'bg-status-cancelled/10', text: 'text-status-cancelled', dot: 'bg-status-cancelled', ring: 'ring-status-cancelled/25' },
}

export const SHIPPING_METHOD_LABEL: Record<ShippingMethod, string> = {
  air: 'Air Freight',
  sea: 'Sea Freight',
  road: 'Road Freight',
}

export function isValidTrackingNumberInput(value: string): boolean {
  return value.trim().length >= 6
}
