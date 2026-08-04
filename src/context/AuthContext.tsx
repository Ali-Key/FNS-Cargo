import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { clearAllCachedResources } from '@/hooks/useCachedResource'
import { OPS_ROLES } from '@/types'
import type { UserRole, UserStatus } from '@/types'

/** The signed-in user's own profile row, as far as the app shell needs it. */
export interface AuthProfile {
  id: string
  full_name: string
  email: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
}

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: AuthProfile | null
  isAdmin: boolean
  /** Active Admin or Dispatcher — mirrors the database's is_ops() RLS gate. */
  isOps: boolean
  role: UserRole | null
  loading: boolean
  /** Signed in, profile resolved, but holds no dashboard role. */
  unauthorized: boolean
  /** The profile lookup itself failed (offline, RLS, transient). Retryable. */
  profileError: string | null
  refreshProfile: () => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_COLUMNS = 'id, full_name, email, phone, avatar_url, role, status'
const PROFILE_CACHE_KEY = 'fns.auth.profile'

type ProfileResult =
  | { ok: true; profile: AuthProfile | null }
  | { ok: false; message: string }

/**
 * The profile is cached per auth user so a reload can paint the dashboard
 * immediately instead of blocking on a round trip. It is a rendering hint only:
 * every query the shell then makes is still gated by RLS server-side, and the
 * cached copy is revalidated in the background on each boot.
 */
function readCachedProfile(authUserId: string): AuthProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { authUserId: string; profile: AuthProfile }
    return parsed.authUserId === authUserId ? parsed.profile : null
  } catch {
    return null
  }
}

function writeCachedProfile(authUserId: string, profile: AuthProfile | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ authUserId, profile }))
    else localStorage.removeItem(PROFILE_CACHE_KEY)
  } catch {
    // Storage unavailable (private mode, quota). The lookup still works.
  }
}

/**
 * Reads the caller's own profile (RLS: auth_user_id = auth.uid()).
 * Dashboard access requires an Active profile whose role is in OPS_ROLES.
 */
async function fetchProfile(authUserId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('auth_user_id', authUserId)
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  return { ok: true, profile: (data as AuthProfile | null) ?? null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const mounted = useRef(true)
  /** Guards against an older in-flight lookup overwriting a newer one. */
  const requestId = useRef(0)
  /** Auth user whose profile is already resolved, so repeat events can skip the lookup. */
  const loadedFor = useRef<string | null>(null)
  /** True while signIn() is resolving the profile itself, so the event skips it. */
  const signingIn = useRef(false)

  const loadProfile = useCallback(async (authUserId: string, background = false) => {
    const id = ++requestId.current
    const result = await fetchProfile(authUserId)
    if (!mounted.current || id !== requestId.current) return

    if (result.ok) {
      loadedFor.current = authUserId
      setProfile(result.profile)
      setProfileError(null)
      writeCachedProfile(authUserId, result.profile)
    } else if (!background) {
      loadedFor.current = null
      setProfile(null)
      setProfileError(result.message)
    }
    // A failed *background* revalidation keeps the profile already on screen; the
    // next query the user makes is still checked by RLS, so nothing is unlocked.
    setLoading(false)
  }, [])

  const clearAuth = useCallback(() => {
    requestId.current++
    loadedFor.current = null
    writeCachedProfile('', null)
    clearAllCachedResources()
    setSession(null)
    setProfile(null)
    setProfileError(null)
    setLoading(false)
  }, [])

  useEffect(() => {
    mounted.current = true

    async function bootstrap() {
      const { data, error } = await supabase.auth.getSession()
      if (!mounted.current) return

      if (error || !data.session) {
        clearAuth()
        return
      }

      const authUserId = data.session.user.id
      setSession(data.session)

      // Paint from the cached profile and revalidate behind the UI, so a reload
      // does not hold the whole dashboard behind a round trip.
      const cached = readCachedProfile(authUserId)
      if (cached) {
        loadedFor.current = authUserId
        setProfile(cached)
        setProfileError(null)
        setLoading(false)
        void loadProfile(authUserId, true)
        return
      }

      await loadProfile(authUserId)
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted.current) return

      if (event === 'SIGNED_OUT' || !newSession) {
        clearAuth()
        return
      }

      setSession(newSession)

      // IMPORTANT: never await a Supabase query inside this callback. supabase-js
      // holds its auth lock for the duration of the handler, so any query made
      // here can deadlock and never resolve -- which left the app permanently
      // without a profile and showed "No dashboard access" to valid admins.
      // Deferring to a macrotask releases the lock first.
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        const authUserId = newSession.user.id
        // signIn() and bootstrap() already resolve the profile, and supabase-js
        // re-emits SIGNED_IN on tab focus. Re-fetching here is a duplicate round
        // trip that also re-raises the "Verifying access" screen over a dashboard
        // that was already usable.
        if (event === 'SIGNED_IN' && (signingIn.current || loadedFor.current === authUserId)) return

        const background = loadedFor.current === authUserId
        if (!background) setLoading(true)
        setTimeout(() => {
          if (mounted.current) void loadProfile(authUserId, background)
        }, 0)
      }
      // TOKEN_REFRESHED carries no profile change; keep the cached profile.
    })

    return () => {
      mounted.current = false
      listener.subscription.unsubscribe()
    }
  }, [clearAuth, loadProfile])

  const refreshProfile = useCallback(async () => {
    const authUserId = session?.user.id
    if (!authUserId) return
    await loadProfile(authUserId)
  }, [session, loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    signingIn.current = true
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { error: error.message }

      // The one profile lookup a login needs: the access decision cannot be made
      // without the role. The SIGNED_IN listener stands down while this runs, so
      // there is exactly one round trip and no spinner after navigation.
      if (data.session) {
        setSession(data.session)
        await loadProfile(data.session.user.id)
      }
      return { error: null }
    } finally {
      signingIn.current = false
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    clearAuth()
  }, [clearAuth])

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.role ?? null
    const active = profile?.status === 'Active'
    const isAdmin = role === 'Admin' && active
    // Dispatchers hold real dashboard access; admin-only areas gate separately.
    const isOps = active && role !== null && OPS_ROLES.includes(role)
    return {
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      isOps,
      role,
      loading,
      unauthorized: Boolean(session) && !loading && !profileError && !isOps,
      profileError,
      refreshProfile,
      signIn,
      signOut,
    }
  }, [session, profile, loading, profileError, refreshProfile, signIn, signOut])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
