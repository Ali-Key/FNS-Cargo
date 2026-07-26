import type { Tables } from './database'

export type { Json, Tables, TablesInsert, TablesUpdate } from './database'

export type Customer = Tables<'customers'>
export type Shipment = Tables<'shipments'>
export type ShipmentTrackingHistory = Tables<'shipment_tracking_history'>
export type ActivityLog = Tables<'activity_logs'>
export type SystemSettings = Tables<'system_settings'>
export type AdminUser = Tables<'admin_users'>

export type ShipmentStatus = 'pending' | 'in_transit' | 'delivered' | 'delayed' | 'cancelled'
export type ShippingMethod = 'air' | 'sea' | 'road'
export type AdminRole = 'admin' | 'staff'

export const SHIPMENT_STATUSES: ShipmentStatus[] = [
  'pending',
  'in_transit',
  'delivered',
  'delayed',
  'cancelled',
]

export const SHIPPING_METHODS: ShippingMethod[] = ['air', 'sea', 'road']

/** Shipment row with the joined customer name (dashboard list/detail queries). */
export type ShipmentWithCustomer = Shipment & {
  customers: Pick<Customer, 'id' | 'full_name'> | null
}

/** A tracking event joined with its parent shipment's tracking number (activity feed). */
export type TrackingEventWithShipment = ShipmentTrackingHistory & {
  shipments: Pick<Shipment, 'id' | 'tracking_number'> | null
}

/** Row returned by the admin_list_users() SECURITY DEFINER function. */
export interface DashboardUser {
  admin_id: string
  user_id: string
  email: string | null
  role: AdminRole
  created_at: string
  last_sign_in_at: string | null
}

export interface DashboardStats {
  total: number
  byStatus: Record<ShipmentStatus, number>
  customers: number
  activeCustomers: number
}

export interface PublicTrackingHistoryEvent {
  status: ShipmentStatus
  location: string
  description: string | null
  event_time: string
}

export interface PublicTrackingResult {
  tracking_number: string
  origin: string
  destination: string
  shipping_method: ShippingMethod
  weight_kg: number
  pieces: number
  status: ShipmentStatus
  estimated_delivery: string | null
  created_at: string
  updated_at: string
  tracking_history: PublicTrackingHistoryEvent[]
}
