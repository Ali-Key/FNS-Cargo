import { supabase } from '@/lib/supabase'
import type { AnalyticsReport } from '@/types'

/**
 * Whole reporting page in one round trip via the analytics_report() RPC
 * (SECURITY DEFINER, admin-only — it returns revenue).
 *
 * @param months how far back to run the trends, 1-24. The RPC clamps out of range.
 */
export async function getAnalyticsReport(months = 6): Promise<AnalyticsReport> {
  const { data, error } = await supabase.rpc('analytics_report', { p_months: months })
  if (error) throw error
  return data as unknown as AnalyticsReport
}
