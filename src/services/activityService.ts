import { supabase } from '@/lib/supabase'
import type { ActivityLog, Json } from '@/types'

/**
 * Best-effort audit log. Never throws — a failed log must not break the action
 * that triggered it. RLS lets any staff/admin insert; only admins can read back.
 */
export async function logActivity(
  action: string,
  entityType: string,
  entityId: string | null,
  details?: Record<string, unknown>,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    await supabase.from('activity_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: user?.id ?? null,
      details: (details ?? null) as Json,
    })
  } catch {
    // swallow — logging is non-critical
  }
}

export async function listRecentActivity(limit = 12): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
