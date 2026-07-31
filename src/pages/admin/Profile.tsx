import { useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Mail, ShieldCheck, Upload, User } from 'lucide-react'
import { Button, Input, Badge, Alert } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { useAuth, type AuthProfile } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { updateMyProfile, uploadAvatar } from '@/services/profileService'
import { formatDate } from '@/utils/date'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

const detailsSchema = z.object({
  full_name: z.string().trim().min(2, 'Enter your full name').max(120, 'That name is too long'),
  phone: z.string().trim().max(32, 'That number is too long').optional().or(z.literal('')),
})

const emailSchema = z.object({
  email: z.string().trim().min(1, 'Enter an email address').email('Enter a valid email address'),
})

const passwordSchema = z
  .object({
    password: z.string().min(10, 'Use at least 10 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Passwords do not match',
    path: ['confirm'],
  })

type DetailsValues = z.infer<typeof detailsSchema>
type EmailValues = z.infer<typeof emailSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export default function Profile() {
  useDocumentTitle('Profile | FNS Cargo')
  const { user, profile, role, refreshProfile } = useAuth()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your account details, sign-in email, photo, and password."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <AvatarCard
            profile={profile}
            authUserId={user?.id}
            email={user?.email}
            onSaved={refreshProfile}
          />

          <div className="rounded-card border border-steel-100 bg-white p-6 shadow-elevation-1">
            <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-steel-500">Account</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Row label="Role">
                <Badge variant={role === 'Admin' ? 'info' : 'neutral'}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {role === 'Admin' ? 'Administrator' : 'Staff'}
                </Badge>
              </Row>
              <Row label="Status">
                <span className="font-semibold text-navy-800">{profile?.status ?? 'Unknown'}</span>
              </Row>
              <Row label="Member since">
                <span className="font-tabular font-medium text-navy-800">
                  {formatDate(user?.created_at)}
                </span>
              </Row>
              <Row label="Last sign in">
                <span className="font-tabular font-medium text-navy-800">
                  {formatDate(user?.last_sign_in_at)}
                </span>
              </Row>
            </dl>
          </div>
        </div>

        <div className="space-y-6 lg:col-span-2">
          <DetailsForm profile={profile} onSaved={refreshProfile} />
          <EmailForm currentEmail={user?.email ?? ''} />
          <PasswordForm />
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-steel-100 pb-3 last:border-0 last:pb-0">
      <dt className="text-steel-500">{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-steel-100 bg-white p-6 shadow-elevation-1 sm:p-8">
      <div className="mb-6 flex items-center gap-2.5">
        {icon}
        <h2 className="font-bold text-navy-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

// ---- Avatar ----------------------------------------------------------------

function AvatarCard({
  profile,
  authUserId,
  email,
  onSaved,
}: {
  profile: AuthProfile | null
  authUserId?: string
  email?: string
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function handleFile(file: File) {
    if (!authUserId || !profile) return
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Image too large', 'Choose an image under 2 MB.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setBusy(true)
    try {
      await uploadAvatar(authUserId, profile.id, file)
      await onSaved()
      toast.success('Photo updated', 'Your profile photo has been changed.')
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const initials = (profile?.full_name || email || 'U')
    .split(' ')
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="rounded-card border border-steel-100 bg-white p-6 text-center shadow-elevation-1">
      <div className="mx-auto h-24 w-24 overflow-hidden rounded-full border border-steel-200 bg-navy-50">
        {profile?.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            className="h-full w-full object-cover"
            width={96}
            height={96}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-navy-700">
            {initials}
          </span>
        )}
      </div>

      <p className="mt-4 truncate font-bold text-navy-900">{profile?.full_name ?? ''}</p>
      <p className="mt-0.5 truncate text-sm text-steel-500">{email}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      <Button
        variant="secondary"
        size="sm"
        className="mt-5 w-full"
        loading={busy}
        icon={<Upload className="h-4 w-4" />}
        onClick={() => inputRef.current?.click()}
      >
        Change photo
      </Button>
      <p className="mt-2 text-xs text-steel-400">PNG, JPG, WEBP or GIF, up to 2 MB.</p>
    </div>
  )
}

// ---- Name and phone --------------------------------------------------------

function DetailsForm({
  profile,
  onSaved,
}: {
  profile: AuthProfile | null
  onSaved: () => Promise<void>
}) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    values: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    },
  })

  async function onSubmit(values: DetailsValues) {
    if (!profile) return
    try {
      await updateMyProfile(profile.id, {
        full_name: values.full_name.trim(),
        phone: values.phone?.trim() || null,
      })
      await onSaved()
      reset(values)
      toast.success('Profile updated', 'Your details have been saved.')
    } catch (err) {
      toast.error('Could not save', err instanceof Error ? err.message : 'Please try again.')
    }
  }

  return (
    <Section icon={<User className="h-5 w-5 text-accent-500" />} title="Personal details">
      <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-xl gap-5 sm:grid-cols-2">
        <Input
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder=""
          error={errors.phone?.message}
          {...register('phone')}
        />
        <div className="sm:col-span-2">
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </Section>
  )
}

// ---- Sign-in email ---------------------------------------------------------

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const toast = useToast()
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    values: { email: currentEmail },
  })

  async function onSubmit(values: EmailValues) {
    const next = values.email.trim().toLowerCase()
    if (next === currentEmail.toLowerCase()) {
      toast.info('No change', 'That is already your sign-in email.')
      return
    }
    const { error } = await supabase.auth.updateUser({ email: next })
    if (error) {
      toast.error('Could not change email', error.message)
      return
    }
    setSent(true)
    toast.success('Confirmation sent', `Check ${next} to confirm the change.`)
  }

  return (
    <Section icon={<Mail className="h-5 w-5 text-accent-500" />} title="Sign-in email">
      {sent && (
        <Alert variant="info" className="mb-5" title="Confirmation required">
          We sent a confirmation link to your new address. The change takes effect once you open that
          link.
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-md space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Update email
        </Button>
      </form>
    </Section>
  )
}

// ---- Password --------------------------------------------------------------

function PasswordForm() {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  async function onSubmit(values: PasswordValues) {
    const { error } = await supabase.auth.updateUser({ password: values.password })
    if (error) {
      toast.error('Could not update password', error.message)
      return
    }
    toast.success('Password updated', 'Use your new password the next time you sign in.')
    reset({ password: '', confirm: '' })
  }

  return (
    <Section icon={<KeyRound className="h-5 w-5 text-accent-500" />} title="Password">
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
    </Section>
  )
}
