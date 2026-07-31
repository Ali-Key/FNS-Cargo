import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'
import { logActivity } from './activityService'

/** The signed-in user's own editable record. */
export type MyProfile = Pick<
  Profile,
  'id' | 'full_name' | 'email' | 'phone' | 'avatar_url' | 'role' | 'status' | 'created_at'
>

const COLUMNS = 'id, full_name, email, phone, avatar_url, role, status, created_at'

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

/** Reads the caller's own profile (RLS: auth_user_id = auth.uid()). */
export async function getMyProfile(authUserId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(COLUMNS)
    .eq('auth_user_id', authUserId)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Updates the caller's display fields. Email changes are handled separately (auth). */
export async function updateMyProfile(
  profileId: string,
  updates: Pick<Partial<Profile>, 'full_name' | 'phone'>,
): Promise<MyProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', profileId)
    .select(COLUMNS)
    .single()
  if (error) throw error
  await logActivity('profile.updated', 'profile', profileId, updates as Record<string, unknown>)
  return data
}

/**
 * Uploads a new avatar into the user's own storage folder ({auth uid}/…, per the
 * bucket policy) and saves the public URL on the profile. Returns the new URL.
 */
export async function uploadAvatar(authUserId: string, profileId: string, file: File): Promise<string> {
  const ext = EXT_BY_MIME[file.type]
  if (!ext) throw new Error('Please choose a PNG, JPG, WEBP, or GIF image.')

  const path = `${authUserId}/avatar.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: '3600' })
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust so a replaced photo shows immediately (the constraint only needs https).
  const avatar_url = `${data.publicUrl}?v=${Date.now()}`

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url })
    .eq('id', profileId)
  if (updateError) throw updateError

  await logActivity('profile.avatar_changed', 'profile', profileId)
  return avatar_url
}
