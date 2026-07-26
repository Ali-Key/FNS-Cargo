import { supabase } from '@/lib/supabase'
import type { AdminRole, DashboardUser } from '@/types'
import { logActivity } from './activityService'

export async function listDashboardUsers(): Promise<DashboardUser[]> {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw error
  return (data as DashboardUser[]) ?? []
}

export async function updateUserRole(adminId: string, role: AdminRole): Promise<void> {
  const { error } = await supabase.from('admin_users').update({ role }).eq('id', adminId)
  if (error) throw error
  await logActivity('user.role_changed', 'admin_user', adminId, { role })
}

/** Removes dashboard access (deletes the admin_users link). The auth account is left intact. */
export async function revokeUser(adminId: string, email: string | null): Promise<void> {
  const { error } = await supabase.from('admin_users').delete().eq('id', adminId)
  if (error) throw error
  await logActivity('user.revoked', 'admin_user', adminId, { email })
}

export interface CreateUserInput {
  email: string
  password: string
  role: AdminRole
}

/** Creates a new dashboard user via the admin-create-user edge function (service-role gated). */
export async function createDashboardUser(input: CreateUserInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', {
    body: input,
  })
  if (error) {
    // Edge functions surface app errors in the response body; pull the message out.
    let message = error.message
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error) message = body.error
      }
    } catch {
      // keep the generic message
    }
    throw new Error(message)
  }
  await logActivity('user.created', 'admin_user', data?.user_id ?? null, {
    email: input.email,
    role: input.role,
  })
}
