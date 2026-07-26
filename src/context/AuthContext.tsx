import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { AdminRole } from '@/types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  isAdmin: boolean
  role: AdminRole | null
  loading: boolean
  unauthorized: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function fetchAdminRecord(userId: string) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('role')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { role: null as AdminRole | null, errored: true }
  }
  return { role: (data?.role as AdminRole | undefined) ?? null, errored: false }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<AdminRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true

    async function bootstrap() {
      try {
        const { data: sessionData } = await supabase.auth.getSession()

        if (!sessionData.session) {
          if (mounted.current) {
            setSession(null)
            setRole(null)
            setUnauthorized(false)
          }
          return
        }

        const { data: userData } = await supabase.auth.getUser()
        const currentUser = userData.user

        if (!currentUser) {
          if (mounted.current) {
            setSession(null)
            setRole(null)
          }
          return
        }

        const { role: adminRole, errored } = await fetchAdminRecord(currentUser.id)

        if (!mounted.current) return

        setSession(sessionData.session)
        if (!errored) {
          setRole(adminRole)
          setUnauthorized(adminRole === null)
        }
      } finally {
        if (mounted.current) setLoading(false)
      }
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (event === 'SIGNED_OUT') {
        if (mounted.current) {
          setSession(null)
          setRole(null)
          setUnauthorized(false)
          setLoading(false)
        }
        return
      }

      if (!newSession) return

      setSession(newSession)

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        const { role: adminRole, errored } = await fetchAdminRecord(newSession.user.id)
        if (!mounted.current) return
        if (!errored) {
          setRole(adminRole)
          setUnauthorized(adminRole === null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted.current = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: role !== null,
      role,
      loading,
      unauthorized,
      signIn,
      signOut,
    }),
    [session, role, loading, unauthorized],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
