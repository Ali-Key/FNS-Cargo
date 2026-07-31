import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, Lock, Mail, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { Button, Input, Alert } from '@/components/ui'
import { Logo } from '@/components/common/Logo'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { images } from '@/config/images'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type LoginForm = z.infer<typeof loginSchema>

interface LocationState {
  from?: { pathname?: string }
}

export default function Login() {
  useDocumentTitle('Staff Login | FNS Cargo', 'Sign in to the FNS Cargo operations dashboard.')

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
    const { error } = await signIn(data.email, data.password)
    if (error) {
      setFormError(
        /invalid login credentials/i.test(error)
          ? 'The email or password you entered is incorrect.'
          : error,
      )
      return
    }
    toast.success('Signed in', 'Taking you to the operations dashboard.')
    navigate(redirectTo, { replace: true })
  }

return (

  <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">

    {/* LEFT LOGIN */}
    <div className="flex min-h-screen flex-col px-6 py-8 sm:px-10 lg:px-16">

      {/* Logo */}
      <div>
        <Logo variant="dark" />
      </div>


      {/* Content */}
      <div className="flex flex-1 items-center justify-center">

        <div className="w-full max-w-md">


          <h1 className="text-4xl font-extrabold tracking-tight text-navy-900">
            Sign in
          </h1>


          <p className="mt-3 text-sm leading-relaxed text-steel-500">
            Access the FNS Cargo operations portal to manage shipments,
            tracking, and customers.
          </p>



          {formError && (
            <Alert
              variant="error"
              className="mt-6"
              title="Unable to sign in"
            >
              {formError}
            </Alert>
          )}




          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="mt-8 space-y-5"
            noValidate
          >


            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              placeholder="you@fnscargo.com"
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


              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="
                  absolute
                  right-3
                  top-[2.35rem]
                  rounded-lg
                  p-1
                  text-steel-400
                  hover:text-navy-900
                "
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}

              </button>

            </div>




            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              loading={isSubmitting}
              icon={<LogIn className="h-4 w-4" />}
            >
              Sign in
            </Button>


          </form>




          {/* Security */}
          <div
            className="
              mt-6
              flex
              items-start
              gap-2.5
              rounded-xl
              border
              border-[#ffe4d2]
              bg-[#fff3eb]
              px-4
              py-3
            "
          >

            <ShieldCheck className="mt-0.5 h-4 w-4 text-accent-600" />

            <p className="text-xs leading-relaxed text-steel-600">
              Authorised FNS Cargo staff only. Account activity is monitored.
            </p>

          </div>



        </div>

      </div>




      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-steel-400">

        <span>
          © {new Date().getFullYear()} FNS Cargo
        </span>


        <Link
          to="/"
          className="
            flex
            items-center
            gap-1
            font-semibold
            hover:text-navy-900
          "
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Website
        </Link>


      </div>



    </div>






    {/* RIGHT IMAGE */}
    <div
      className="
        relative
        hidden
        overflow-hidden
        bg-navy-950
        lg:block
      "
    >


      <img
        src={images.about.secondary.src}
        alt=""
        aria-hidden="true"
        className="
          absolute
          inset-0
          h-full
          w-full
          object-cover
          opacity-35
        "
      />


      <div
        className="
          absolute
          inset-0
          bg-navy-950/75
        "
      />



      <div
        className="
          relative
          flex
          h-full
          flex-col
          justify-end
          p-16
        "
      >

        <p
          className="
            text-xs
            font-bold
            uppercase
            tracking-[0.18em]
            text-accent-400
          "
        >
          FNS Cargo Operations
        </p>



        <h2
          className="
            mt-5
            max-w-lg
            text-5xl
            font-extrabold
            leading-tight
            text-white
          "
        >
          Connecting Somalia with global logistics.
        </h2>



        <p
          className="
            mt-5
            max-w-lg
            text-lg
            leading-relaxed
            text-steel-300
          "
        >
          Manage shipments, monitor tracking updates,
          and keep every delivery moving securely.
        </p>



      </div>


    </div>


  </div>
)
}

