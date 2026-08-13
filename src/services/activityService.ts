import { supabase } from '@/lib/supabase'
import type { Json } from '@/types'

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
    // getSession() reads the token already in memory; getUser() would add a
    // round trip to the auth server to every single mutation the console makes.
    const {
      data: { session },
    } = await supabase.auth.getSession()
    await supabase.from('activity_logs').insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      user_id: session?.user.id ?? null,
      details: (details ?? null) as Json,
    })
  } catch {
    // swallow — logging is non-critical
  }
}
