import type { Tables } from './database'
import { Constants } from './database'

export type { Json, Tables, TablesInsert, TablesUpdate, Enums } from './database'

// ---- Table row types -------------------------------------------------------
export type Profile = Tables<'profiles'>
export type Shipment = Tables<'shipments'>
export type TrackingUpdate = Tables<'tracking_updates'>
export type Country = Tables<'countries'>
export type Quote = Tables<'quotes'>
export type SystemSettings = Tables<'system_settings'>
export type ActivityLog = Tables<'activity_logs'>
export type Invoice = Tables<'invoices'>
export type Payment = Tables<'payments'>

/** Public customer records. Separate from `profiles`, which is dashboard-only. */
export type Customer = Tables<'customers'>

// ---- Enum unions -----------------------------------------------------------
export type UserRole = Profile['role'] // 'Admin' | 'Dispatcher'
export type UserStatus = Profile['status'] // 'Active' | 'Disabled'
export type ShipmentStatus = Shipment['status']
export type ShippingMethod = Shipment['shipping_method']
export type CargoType = Shipment['cargo_type']
export type QuoteStatus = Quote['status']
export type PaymentStatus = Shipment['payment_status']
export type InvoiceStatus = Invoice['status']
export type PaymentMethod = Payment['method']

// ---- Enum value lists (for selects / iteration) ----------------------------
export const SHIPMENT_STATUSES = Constants.public.Enums.shipment_status
export const SHIPPING_METHODS = Constants.public.Enums.shipping_method
export const CARGO_TYPES = Constants.public.Enums.cargo_type
export const QUOTE_STATUSES = Constants.public.Enums.quote_status
export const USER_ROLES = Constants.public.Enums.user_role
export const PAYMENT_STATUSES = Constants.public.Enums.payment_status
export const INVOICE_STATUSES = Constants.public.Enums.invoice_status
export const PAYMENT_METHODS = Constants.public.Enums.payment_method

/** Roles allowed into the dashboard at all. Mirrors the DB's is_ops() gate. */
export const OPS_ROLES: UserRole[] = ['Admin', 'Dispatcher']

/** Statuses that count as "in progress" (everything before Delivered). */
export const ACTIVE_STATUSES: ShipmentStatus[] = SHIPMENT_STATUSES.filter(
  (s) => s !== 'Delivered',
) as ShipmentStatus[]

// ---- Joined shapes ---------------------------------------------------------
/** Shipment row with the joined customer record (dashboard list/detail). */
export type ShipmentWithCustomer = Shipment & {
  customer: Pick<Customer, 'id' | 'full_name' | 'email'> | null
  assignee?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'> | null
}

/** Invoice joined with the shipment it bills and the customer it bills to. */
export type InvoiceWithRelations = Invoice & {
  shipment: Pick<Shipment, 'id' | 'tracking_number' | 'origin' | 'destination' | 'status'> | null
  customer: Pick<Customer, 'id' | 'full_name' | 'email'> | null
}

/** A payment joined with its invoice, for the finance ledger view. */
export type PaymentWithInvoice = Payment & {
  invoice: Pick<Invoice, 'id' | 'invoice_number' | 'shipment_id'> | null
}

/** A tracking update joined with its parent shipment (activity feed). */
export type TrackingUpdateWithShipment = TrackingUpdate & {
  shipment: Pick<Shipment, 'id' | 'tracking_number'> | null
}

/** Row returned by the admin_users_overview() function. */
export interface DashboardUser {
  id: string
  auth_user_id: string | null
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  created_at: string
  shipment_count: number
}

// ---- dashboard_stats() shape ----------------------------------------------
export interface MonthlyVolumePoint {
  month: string // e.g. "Feb"
  shipments: number
  /** Null for dispatchers — dashboard_stats() withholds money from non-admins. */
  revenue?: number | null
}

export interface DashboardStats {
  total_shipments: number
  active_shipments: number
  delivered_shipments: number
  customers: number
  active_customers: number
  countries_served: number
  pending_quotes: number
  total_quotes: number
  delayed_shipments: number
  unpaid_shipments: number
  /** Money keys are null unless the caller is an Admin. */
  revenue_total: number | null
  revenue_month: number | null
  outstanding_amount: number | null
  overdue_invoices: number | null
  status_breakdown: Partial<Record<ShipmentStatus, number>>
  method_breakdown: Partial<Record<ShippingMethod, number>>
  monthly_volume: MonthlyVolumePoint[]
}

// ---- analytics_report() shape ----------------------------------------------
export interface RevenuePoint {
  month: string // e.g. "Feb 2026"
  collected: number
  invoiced: number
}

export interface RoutePoint {
  origin: string
  destination: string
  shipments: number
  value: number
  avg_weight: number | null
}

export interface DeliveryPerformance {
  delivered: number
  on_time: number
  late: number
  in_progress: number
  overdue: number
  avg_transit_days: number | null
}

export interface CustomerGrowthPoint {
  month: string
  new_customers: number
  total: number
}

export interface MixPoint {
  name: string
  value: number
  revenue?: number
}

export interface TopCustomer {
  id: string
  full_name: string
  email: string
  shipments: number
  value: number
}

export interface AnalyticsReport {
  months: number
  revenue_trend: RevenuePoint[]
  top_routes: RoutePoint[]
  delivery_performance: DeliveryPerformance
  customer_growth: CustomerGrowthPoint[]
  method_mix: MixPoint[]
  cargo_mix: MixPoint[]
  top_customers: TopCustomer[]
}

// ---- track_shipment() shape (public, no PII) -------------------------------
export interface PublicTrackingEvent {
  id: string
  date: string
  time: string // "HH:MM"
  country: string
  city: string
  location: string
  status: ShipmentStatus
  description: string | null
}

export interface PublicTrackingResult {
  id: string
  tracking_number: string
  customer_name: string
  origin: string
  destination: string
  shipping_method: ShippingMethod
  cargo_type: CargoType
  weight: number | null
  status: ShipmentStatus
  estimated_delivery: string | null
  created_at: string
  events: PublicTrackingEvent[]
}
