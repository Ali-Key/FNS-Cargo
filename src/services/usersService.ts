import { supabase } from '@/lib/supabase'
import type { DashboardUser, UserRole } from '@/types'
import { logActivity } from './activityService'

/** Dashboard users = all profiles, with a shipment count, via the admin RPC. */
export async function listDashboardUsers(): Promise<DashboardUser[]> {
  const { data, error } = await supabase.rpc('admin_users_overview')
  if (error) throw error
  return (data as DashboardUser[]) ?? []
}

export async function updateUserRole(profileId: string, role: UserRole): Promise<void> {
  const { error } = await supabase.from('profiles').update({ role }).eq('id', profileId)
  if (error) throw error
  await logActivity('user.role_changed', 'profile', profileId, { role })
}

/** Removes dashboard access by disabling the profile (the account is preserved). */
export async function revokeUser(profileId: string, email: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status: 'Disabled' }).eq('id', profileId)
  if (error) throw error
  await logActivity('user.revoked', 'profile', profileId, { email })
}

/** Re-enables a disabled profile. */
export async function restoreUser(profileId: string, email: string | null): Promise<void> {
  const { error } = await supabase.from('profiles').update({ status: 'Active' }).eq('id', profileId)
  if (error) throw error
  await logActivity('user.restored', 'profile', profileId, { email })
}

export interface CreateUserInput {
  email: string
  password: string
  full_name: string
  role: UserRole
}

/** Creates a new dashboard user via the admin-create-user edge function (service-role gated). */
export async function createDashboardUser(input: CreateUserInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('admin-create-user', { body: input })
  if (error) {
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
  await logActivity('user.created', 'profile', data?.profile_id ?? null, {
    email: input.email,
    role: input.role,
  })
}
