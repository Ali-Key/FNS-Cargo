import { supabase } from '@/lib/supabase'
import type { DashboardStats, MonthlyVolumePoint } from '@/types'

export interface DashboardData {
  stats: DashboardStats
  monthlyVolume: MonthlyVolumePoint[]
}

/**
 * Single-round-trip dashboard overview via the dashboard_stats() RPC
 * (SECURITY DEFINER, admin-only). All counts + breakdowns come back in one call.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const { data, error } = await supabase.rpc('dashboard_stats')
  if (error) throw error

  const stats = (data as unknown as DashboardStats) ?? emptyStats()
  return { stats, monthlyVolume: stats.monthly_volume ?? [] }
}

function emptyStats(): DashboardStats {
  return {
    total_shipments: 0,
    active_shipments: 0,
    delivered_shipments: 0,
    delayed_shipments: 0,
    unpaid_shipments: 0,
    customers: 0,
    active_customers: 0,
    countries_served: 0,
    pending_quotes: 0,
    total_quotes: 0,
    revenue_total: null,
    revenue_month: null,
    outstanding_amount: null,
    overdue_invoices: null,
    status_breakdown: {},
    method_breakdown: {},
    monthly_volume: [],
  }
}
