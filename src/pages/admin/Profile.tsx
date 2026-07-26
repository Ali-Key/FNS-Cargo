import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, UserCircle, ShieldCheck } from 'lucide-react'
import { Button, Input, Badge } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/utils/date'

const schema = z
  .object({
    password: z.string().min(10, 'Use at least 10 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type FormValues = z.infer<typeof schema>

export default function Profile() {
  useDocumentTitle('Profile · FNS Cargo')
  const toast = useToast()
  const { user, role } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      toast.error('Unable to update password', error.message)
      return
    }
    toast.success('Password updated', 'Your password has been changed. Use it the next time you sign in.')
    reset({ password: '', confirm: '' })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account and password." />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-navy-100 text-navy-700">
              <UserCircle className="h-7 w-7" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-navy-900">{user?.email}</p>
              <Badge variant={role === 'admin' ? 'info' : 'neutral'} className="mt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {role === 'admin' ? 'Administrator' : 'Staff'}
              </Badge>
            </div>
          </div>
          <dl className="mt-6 space-y-2 border-t border-steel-100 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-steel-500">Member since</dt>
              <dd className="font-tabular font-medium text-navy-800">{formatDate(user?.created_at)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-steel-500">Last sign in</dt>
              <dd className="font-tabular font-medium text-navy-800">{formatDate(user?.last_sign_in_at)}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1 sm:p-8 lg:col-span-2">
          <div className="mb-6 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent-500" />
            <h2 className="font-bold text-navy-900">Change password</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
            <Input
              label="New password"
              type="password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />
            <Input
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Update password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
