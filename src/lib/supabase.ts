import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// VITE_* vars are inlined at build time, so these must be defined wherever the
// app is BUILT: in .env.local on whatever machine or CI job runs `npm run build`.
// The uploaded dist/ already has the values baked in; the host never reads them.
const missing = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}. ` +
      'Set them in .env.local before running the dev server or `npm run build`.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
