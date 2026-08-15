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
  /** Re-reads the GoTrue user, for fields the cached session copy cannot see change. */
  refreshUser: () => Promise<void>
  signIn: (email: string, password: string) => Promise<SignInResult>
  signOut: () => Promise<void>
}

/**
 * GoTrue's prose shifts between releases; its `code` is the stable contract, so
 * the caller is given both and maps on the code.
 */
export interface SignInResult {
  error: string | null
  code: string | null
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const PROFILE_COLUMNS = 'id, full_name, email, phone, avatar_url, role, status'
const PROFILE_CACHE_KEY = 'FSN.auth.profile'
/** Upper bound on the initial session lookup, including any token refresh. */
const BOOTSTRAP_TIMEOUT_MS = 10_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms)
    promise.then(resolve, reject).finally(() => clearTimeout(timer))
  })
}

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
  /**
   * Auth user whose profile lookup has actually *completed*. A null `profile` is
   * two different things — "looked and found nothing" (a real denial) and "not
   * looked yet" — and only the first may deny access. Keeping the resolved id in
   * state, rather than inferring it from `loading`, is what stops a signed-in
   * user being shown "No dashboard access" in the window between the session
   * being applied and their profile arriving.
   */
  const [resolvedFor, setResolvedFor] = useState<string | null>(null)
  const mounted = useRef(true)
  /** Guards against an older in-flight lookup overwriting a newer one. */
  const requestId = useRef(0)
  /**
   * supabase-js re-emits auth events on tab focus and token refresh, each with a
   * fresh Session object. Storing an identical session would change the context
   * value and re-render every dashboard consumer for no new information, so the
   * token is compared before committing.
   */
  const applySession = useCallback((next: Session) => {
    setSession((prev) =>
      prev &&
      prev.access_token === next.access_token &&
      prev.refresh_token === next.refresh_token
        ? prev
        : next,
    )
  }, [])
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
      setResolvedFor(authUserId)
      setProfileError(null)
      writeCachedProfile(authUserId, result.profile)
    } else if (!background) {
      loadedFor.current = null
      setProfileError(result.message)
      // Deliberately not clearing `profile`. A failed re-check of a profile that
      // already resolved is an infrastructure fault, not a revocation — wiping
      // it here is what turned a dropped connection into "No dashboard access"
      // for valid users. On a cold boot there is nothing to keep anyway, and
      // every query the console then makes is still gated by RLS server-side.
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
    setResolvedFor(null)
    setProfileError(null)
    setLoading(false)
  }, [])

  /**
   * Resolves the stored session, then the profile behind it. Runs once on boot
   * and again if the user retries after it failed.
   */
  const bootstrap = useCallback(async () => {
    setLoading(true)
    setProfileError(null)

    let result: Awaited<ReturnType<typeof supabase.auth.getSession>>
    try {
      // getSession() refreshes an expired token before it resolves, so on a
      // stalled network it can hang indefinitely. Bounding it means a bad
      // connection ends in a retry screen rather than "Verifying access"
      // forever. The wait is only ever a wait: nothing is granted on timeout.
      result = await withTimeout(supabase.auth.getSession(), BOOTSTRAP_TIMEOUT_MS)
    } catch {
      if (!mounted.current) return
      setProfileError('Timed out while verifying your session. Check your connection and try again.')
      setLoading(false)
      return
    }

    if (!mounted.current) return

    const { data, error } = result
    if (error || !data.session) {
      clearAuth()
      return
    }

    const authUserId = data.session.user.id
    applySession(data.session)

    // Paint from the cached profile and revalidate behind the UI, so a reload
    // does not hold the whole dashboard behind a round trip.
    const cached = readCachedProfile(authUserId)
    if (cached) {
      loadedFor.current = authUserId
      setProfile(cached)
      setResolvedFor(authUserId)
      setProfileError(null)
      setLoading(false)
      void loadProfile(authUserId, true)
      return
    }

    await loadProfile(authUserId)
  }, [clearAuth, loadProfile, applySession])

  useEffect(() => {
    mounted.current = true

    void bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted.current) return

      if (event === 'SIGNED_OUT' || !newSession) {
        clearAuth()
        return
      }

      applySession(newSession)

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
  }, [clearAuth, bootstrap, loadProfile, applySession])

  const refreshProfile = useCallback(async () => {
    const authUserId = session?.user.id
    // No session resolved means bootstrap itself is what failed, so retrying
    // the profile alone would be a no-op — start again from the session.
    if (!authUserId) {
      await bootstrap()
      return
    }
    await loadProfile(authUserId)
  }, [session, loadProfile, bootstrap])

  const signIn = useCallback(async (email: string, password: string): Promise<SignInResult> => {
    signingIn.current = true
    try {
      // GoTrue stores addresses lowercased. Normalising here means a capitalised
      // or padded address is not reported back as a wrong password.
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })
      if (error) return { error: error.message, code: error.code ?? null }

      // The one profile lookup a login needs: the access decision cannot be made
      // without the role. The SIGNED_IN listener stands down while this runs, so
      // there is exactly one round trip and no spinner after navigation.
      if (data.session) {
        applySession(data.session)
        await loadProfile(data.session.user.id)
      }
      return { error: null, code: null }
    } finally {
      signingIn.current = false
    }
  }, [loadProfile, applySession])

  /**
   * The session carries a snapshot of the user taken when the token was issued,
   * so anything GoTrue changes server-side afterwards -- `new_email` above all --
   * stays stale until the token happens to refresh. applySession() deliberately
   * ignores a session whose tokens are unchanged, which is exactly this case, so
   * the refreshed user is swapped in directly.
   */
  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user || !mounted.current) return
    setSession((prev) => (prev ? { ...prev, user: data.user } : prev))
  }, [])

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

    // Has this session's own profile lookup finished? Signing in applies the
    // session before the lookup returns, so without this the shell would spend
    // that gap holding a session and no profile -- which every consumer would
    // otherwise read as a decided "not authorised" rather than "still asking".
    const authUserId = session?.user.id ?? null
    const pendingProfile =
      authUserId !== null && resolvedFor !== authUserId && profileError === null

    return {
      session,
      user: session?.user ?? null,
      profile,
      isAdmin,
      isOps,
      role,
      // "Cannot decide yet", not merely "bootstrap is running".
      loading: loading || pendingProfile,
      // A denial is only ever reported once the lookup has come back for *this*
      // user. The decision still rests entirely on the role and status the
      // database returned -- nothing here grants access, it only refuses to
      // deny before there is an answer.
      unauthorized: Boolean(session) && !pendingProfile && !profileError && !isOps,
      profileError,
      refreshProfile,
      refreshUser,
      signIn,
      signOut,
    }
  }, [
    session,
    profile,
    resolvedFor,
    loading,
    profileError,
    refreshProfile,
    refreshUser,
    signIn,
    signOut,
  ])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
