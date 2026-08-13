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
export type UserRole = Profile['role'] // 'Admin' | 'Dispatcher' | 'Staff'
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

/**
 * The methods a counter can actually take money by, and the only ones offered
 * when recording a payment. `PAYMENT_METHODS` stays the full enum so historic
 * rows recorded under a retired method still filter and display.
 */
export const RECORDABLE_PAYMENT_METHODS = [
  'Bank Transfer',
  'Cheque',
  'EVC Plus',
  'Edahab',
] as const satisfies readonly PaymentMethod[]

/**
 * Roles allowed into the dashboard at all. Must mirror the DB's is_ops() gate
 * exactly (public.is_ops(): role in ('Admin', 'Dispatcher', 'Staff')) — if this
 * list is narrower than is_ops(), a role the database authorizes gets blocked
 * by the client instead ("No dashboard access" for a legitimately active user).
 */
export const OPS_ROLES: UserRole[] = ['Admin', 'Dispatcher', 'Staff']

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

/**
 * A payment as the ledger reads it: the money, the shipment it was taken for,
 * and who took it. `payments` carries no `shipment_id`, so the shipment is
 * reached through the invoice row — a join, not a billing concept: the ledger
 * shows no invoice number, amount, or balance.
 */
export type PaymentLedgerRow = Payment & {
  invoice:
    | (Pick<Invoice, 'id' | 'shipment_id'> & {
        shipment: Pick<Shipment, 'id' | 'tracking_number' | 'customer_name'> | null
      })
    | null
  /** Profile that took the money at the counter. */
  recorder: Pick<Profile, 'full_name'> | null
}

/** Invoice joined with every field the invoice PDF/preview needs (fuller than `InvoiceWithRelations`). */
export type InvoiceDocumentData = Invoice & {
  shipment:
    | (Pick<
        Shipment,
        | 'id'
        | 'tracking_number'
        | 'origin'
        | 'destination'
        | 'status'
        | 'shipping_method'
        | 'cargo_type'
        | 'weight'
        | 'price_per_kg'
        | 'total_price'
        | 'pieces'
        | 'booking_contact'
        | 'flight_number'
        | 'created_at'
      >)
    | null
  customer: Pick<Customer, 'id' | 'full_name' | 'email' | 'phone' | 'company' | 'address'> | null
  /** Profile that raised the invoice, printed as the cashier name. */
  issuer: Pick<Profile, 'full_name'> | null
}

/** Every shipment field the waybill label needs. */
export type LabelDocumentData = Pick<
  Shipment,
  'tracking_number' | 'origin' | 'destination' | 'cn_number' | 'pieces' | 'branch_code'
>

/** A payment joined with the invoice, customer, and shipment it receipts against. */
export type PaymentReceiptData = Payment & {
  invoice:
    | (Pick<Invoice, 'id' | 'invoice_number'> & {
        customer: Pick<Customer, 'full_name' | 'email' | 'phone'> | null
        shipment: Pick<Shipment, 'tracking_number'> | null
      })
    | null
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
  /** Days the still-moving shipments have been open. Null when none are. */
  avg_open_days: number | null
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
  date: string
  time: string // "HH:MM"
  country: string
  city: string
  location: string
  status: ShipmentStatus
  description: string | null
}

export interface PublicTrackingResult {
  tracking_number: string
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
