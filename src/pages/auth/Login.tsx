import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Eye, EyeOff, Lock, LogIn, Mail, ShieldCheck } from 'lucide-react'
import { Alert, Button, Input } from '@/components/ui'
import { BrandMark } from '@/components/layout'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginForm = z.infer<typeof loginSchema>

/**
 * GoTrue answers a wrong password and an address with no account with the same
 * `invalid_credentials`, deliberately, so the form must not imply which it was.
 * The other cases are genuinely different problems and are named as such --
 * keyed on `code`, because GoTrue's prose shifts between releases.
 */
function describeSignInError(message: string, code: string | null): string {
  switch (code) {
    case 'invalid_credentials':
      return 'The email or password you entered is incorrect. Check the address is the one your account was created with.'
    case 'email_not_confirmed':
      return 'This address has not been confirmed yet. Open the confirmation link we emailed you, then sign in again.'
    case 'user_banned':
      return 'This account has been suspended. Contact an administrator.'
    case 'over_request_rate_limit':
      return 'Too many sign-in attempts. Wait a few minutes, then try again.'
    default:
      return message
  }
}

interface LocationState {
  from?: { pathname?: string }
}

export default function Login() {
  useDocumentTitle('Staff Sign In | FSN Cargo', 'Sign in to the FSN Cargo operations console.')

  const { signIn, session, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Already signed in, so skip the form entirely.
  if (!loading && session) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSubmit(data: LoginForm) {
    setFormError(null)
    const { error, code } = await signIn(data.email, data.password)
    if (error) {
      setFormError(describeSignInError(error, code))
      return
    }
    toast.success('Signed in', 'Opening the FSN Cargo console.')
    navigate(redirectTo, { replace: true })
  }

  return (
    // One dark field with a single centred card: the console's own entrance,
    // not a marketing split-screen. The rail texture ties it to the dashboard.
    <div className="deck-rail-texture flex min-h-screen flex-col bg-deck-900 px-4 py-6 sm:px-6">
      <header className="flex items-center justify-between">
        <BrandMark />
        <Link
          to="/"
          className="deck-focus-dark inline-flex items-center gap-1.5 rounded-deck-sm px-2 py-1.5 text-[13px] font-medium text-deck-300 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Public site
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center py-10">
        <div className="w-full max-w-[400px]">
          <div className="rounded-deck-lg bg-panel p-6 shadow-deck-pop sm:p-8">
            <h1 className="text-[24px] font-bold tracking-tight text-deck-900">Sign in to operations</h1>
            <p className="mt-2 text-[13px] leading-relaxed text-deck-500">
              FSN Cargo staff accounts only. Your role decides what the console shows you.
            </p>

            {formError && (
              <Alert variant="error" className="mt-5" title="Unable to sign in">
                {formError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <Input
                label="Email address"
                type="email"
                autoComplete="email"
                placeholder="you@fsncargo.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.password?.message}
                  {...register('password')}
                />
                {/* Sits against the control, not the field block, so it stays
                    aligned whether or not an error line is rendered. */}
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="deck-focus absolute right-2 top-[30px] inline-flex h-8 w-8 items-center justify-center rounded-chip text-deck-400 transition-colors hover:bg-deck-100 hover:text-deck-800"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <Button
                type="submit"
                variant="deck"
                size="lg"
                block
                loading={isSubmitting}
                icon={<LogIn className="h-4 w-4" />}
              >
                Sign in
              </Button>
            </form>

            <p className="mt-5 flex items-start gap-2 border-t border-deck-100 pt-4 text-[12px] leading-relaxed text-deck-500">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-signal-600" aria-hidden="true" />
              Authorised staff only. Sign-in attempts and account activity are recorded.
            </p>
          </div>
        </div>
      </main>

      <footer className="text-center text-[12px] text-deck-500">
        © {new Date().getFullYear()} FSN Cargo. All rights reserved.
      </footer>
    </div>
  )
}
