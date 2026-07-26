import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Lock, Mail, ArrowLeft } from 'lucide-react'
import { Button, Input, Alert } from '@/components/ui'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginForm = z.infer<typeof loginSchema>

interface LocationState {
  from?: { pathname?: string }
}

export default function Login() {
  useDocumentTitle('Staff Login · FNS Cargo', 'Sign in to the FNS Cargo operations dashboard.')

  const { signIn, session, loading } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)

  const redirectTo = (location.state as LocationState | null)?.from?.pathname ?? '/dashboard'

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) })

  // Already signed in → skip the form entirely.
  if (!loading && session) {
    return <Navigate to={redirectTo} replace />
  }

  async function onSubmit(data: LoginForm) {
    setFormError(null)
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setFormError(
        /invalid login credentials/i.test(error)
          ? 'The email or password you entered is incorrect.'
          : error,
      )
      return
    }
    toast.success('Welcome back', 'You’re signed in. Taking you to your dashboard.')
    navigate(redirectTo, { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-navy-950">
      <div className="container-page flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Logo variant="light" />
          </div>

          <div className="rounded-2xl border border-steel-100 bg-white p-8 shadow-elevation-3">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-navy-900">Staff sign in</h1>
              <p className="mt-2 text-sm text-steel-500">
                Access the FNS Cargo operations dashboard.
              </p>
            </div>

            {formError && (
              <Alert variant="error" className="mt-6" title="Unable to sign in">
                {formError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5" noValidate>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                error={errors.password?.message}
                {...register('password')}
              />
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                loading={isSubmitting}
                icon={<LogIn className="h-4 w-4" />}
              >
                Sign in
              </Button>
            </form>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-steel-300 transition-colors duration-180 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to website
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
