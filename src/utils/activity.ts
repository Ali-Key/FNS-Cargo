import {
  PackagePlus,
  PackageCheck,
  PackageX,
  UserPlus,
  UserCog,
  UserMinus,
  MapPin,
  Activity,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityLog } from '@/types'

const META: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  'shipment.created': { label: 'Shipment created', icon: PackagePlus, tone: 'text-status-transit' },
  'shipment.updated': { label: 'Shipment updated', icon: PackageCheck, tone: 'text-navy-600' },
  'shipment.deleted': { label: 'Shipment deleted', icon: PackageX, tone: 'text-status-delayed' },
  'tracking_event.created': { label: 'Tracking update added', icon: MapPin, tone: 'text-status-transit' },
  'tracking_event.updated': { label: 'Tracking update edited', icon: MapPin, tone: 'text-navy-600' },
  'tracking_event.deleted': { label: 'Tracking update removed', icon: MapPin, tone: 'text-status-delayed' },
  'customer.created': { label: 'Customer added', icon: UserPlus, tone: 'text-status-delivered' },
  'customer.updated': { label: 'Customer updated', icon: UserCog, tone: 'text-navy-600' },
  'customer.deleted': { label: 'Customer removed', icon: UserMinus, tone: 'text-status-delayed' },
  'user.created': { label: 'Dashboard user created', icon: UserPlus, tone: 'text-status-delivered' },
  'user.role_changed': { label: 'User role changed', icon: UserCog, tone: 'text-navy-600' },
  'user.revoked': { label: 'User access revoked', icon: UserMinus, tone: 'text-status-delayed' },
}

export function describeActivity(log: ActivityLog): { label: string; icon: LucideIcon; tone: string; detail: string } {
  const meta = META[log.action] ?? { label: log.action, icon: Activity, tone: 'text-steel-500' }
  const details = (log.details ?? {}) as Record<string, unknown>
  const detail =
    (typeof details.tracking_number === 'string' && details.tracking_number) ||
    (typeof details.full_name === 'string' && details.full_name) ||
    (typeof details.email === 'string' && details.email) ||
    (typeof details.location === 'string' && details.location) ||
    ''
  return { ...meta, detail }
}
