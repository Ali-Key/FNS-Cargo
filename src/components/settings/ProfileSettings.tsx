import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { KeyRound, Mail, ShieldCheck, User } from 'lucide-react'
import { Alert, Avatar, Badge, Button, DetailRow, Panel, SectionCard, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { useAuth, type AuthProfile } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { updateMyProfile } from '@/services/profileService'
import type { UserRole } from '@/types'
import { formatDate } from '@/utils/date'
import { activeVariant } from '@/utils/status'
import { SettingsSection } from './SettingsSection'

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

/** The signed-in user's own account: details, sign-in email, password. */
export function ProfileSettings() {
  const { user, profile, role, refreshProfile } = useAuth()

  return (
    <SettingsSection
      title="My account"
      description="Your name, sign-in email, and password for the FSN Cargo console."
    >
      <div className="space-y-5">
        <IdentityPanel
          profile={profile}
          role={role}
          email={user?.email}
          createdAt={user?.created_at}
          lastSignInAt={user?.last_sign_in_at}
        />

        {/* Two even columns rather than a sidebar split: these forms are peers,
            and the old 1/3 + 2/3 grid dropped a full-width centred avatar block
            on top of everything below a large desktop. */}
        <div className="grid gap-5 lg:grid-cols-2">
          <DetailsForm profile={profile} onSaved={refreshProfile} />
          <EmailForm currentEmail={user?.email ?? ''} />
        </div>

        <PasswordForm />
      </div>
    </SettingsSection>
  )
}

// ---- Identity --------------------------------------------------------------

function IdentityPanel({
  profile,
  role,
  email,
  createdAt,
  lastSignInAt,
}: {
  profile: AuthProfile | null
  role: UserRole | null
  email?: string
  createdAt?: string
  lastSignInAt?: string
}) {
  return (
    <Panel as="div">
      {/* Identity reads left-to-right on one line — a centred column of avatar,
          name and button wasted the full page width and pushed the forms down.
          The mark is initials only: the console carries no photo upload. */}
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Avatar name={profile?.full_name || email} size="xl" className="shrink-0" />

        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold tracking-tight text-deck-900">{profile?.full_name ?? ''}</p>
          <p className="mt-0.5 truncate text-[13px] text-deck-500">{email}</p>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <Badge variant={role === 'Admin' ? 'signal' : 'neutral'}>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {role === 'Admin' ? 'Administrator' : (role ?? 'Dispatcher')}
            </Badge>
            <Badge variant={activeVariant(profile?.status ?? 'Active')}>{profile?.status ?? 'Unknown'}</Badge>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-deck-100 bg-deck-50 px-5 py-4 sm:grid-cols-3 sm:px-6">
        <DetailRow label="Role" value={role ?? 'Dispatcher'} stacked />
        <DetailRow label="Member since" value={formatDate(createdAt)} mono stacked />
        <DetailRow label="Last sign in" value={formatDate(lastSignInAt)} mono stacked />
      </dl>
    </Panel>
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
    <SectionCard icon={User} title="Personal details" description="How your name appears on activity logs and assignments." variant="form">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
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
          <Button type="submit" variant="deck" loading={isSubmitting} disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}

// ---- Sign-in email ---------------------------------------------------------

function EmailForm({ currentEmail }: { currentEmail: string }) {
  const toast = useToast()
  const [sent, setSent] = useState(false)
  // The email a confirmation was already sent for. Resubmitting the same
  // address just re-sends mail and burns Supabase's (low, default-mailer)
  // send rate limit -- guard against that instead of hitting 429s.
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)
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
    if (next === pendingEmail) {
      toast.info(
        'Confirmation already sent',
        `Check ${next} (and ${currentEmail}) for the confirmation links before requesting another.`,
      )
      return
    }
    const { error } = await supabase.auth.updateUser({ email: next })
    if (error) {
      toast.error(
        'Could not change email',
        /rate limit/i.test(error.message)
          ? 'Too many confirmation emails sent recently. Wait a while and try again.'
          : error.message,
      )
      return
    }
    setSent(true)
    setPendingEmail(next)
    toast.success('Confirmation sent', `Check ${next} to confirm the change.`)
  }

  return (
    <SectionCard icon={Mail} title="Sign-in email" description="Changing this requires confirming from both addresses." variant="form">
      {sent && (
        <Alert variant="info" className="mb-5" title="Confirmation required">
          We sent confirmation links to both your current and new address. The change only takes
          effect once you open both links.
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          icon={<Mail className="h-4 w-4" />}
          error={errors.email?.message}
          {...register('email')}
        />
        <Button type="submit" variant="deck" loading={isSubmitting}>
          Update email
        </Button>
      </form>
    </SectionCard>
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
    <SectionCard icon={KeyRound} title="Password" description="At least 10 characters." variant="form">
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 sm:grid-cols-2">
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
        <div className="sm:col-span-2">
          <Button type="submit" variant="deck" loading={isSubmitting}>
            Update password
          </Button>
        </div>
      </form>
    </SectionCard>
  )
}
