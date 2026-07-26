import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// VITE_* vars are inlined at build time, so these must be defined wherever the
// app is BUILT: locally in .env.local, and on the host (e.g. Netlify → Site
// settings → Environment variables) before deploying.
const missing = [
  !supabaseUrl && 'VITE_SUPABASE_URL',
  !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
].filter(Boolean)

if (missing.length > 0) {
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(', ')}. ` +
      'Set them in .env.local for local dev, and in your host build environment ' +
      '(e.g. Netlify → Site settings → Environment variables) for deploys.',
  )
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
