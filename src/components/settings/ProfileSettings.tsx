import { forwardRef, useRef, useState, type InputHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AuthError } from '@supabase/supabase-js'
import { Eye, EyeOff, KeyRound, Mail, ShieldCheck, User } from 'lucide-react'
import { Alert, Avatar, Badge, Button, DetailRow, Panel, SectionCard, Input } from '@/components/ui'
import { ConfirmDialog } from '@/components/dashboard'
import { useToast } from '@/context/ToastContext'
import { useAuth, type AuthProfile } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { clearPendingEmailChange, setSignInEmail, updateMyProfile } from '@/services/profileService'
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
  const { user, profile, role, isAdmin, refreshProfile, refreshUser } = useAuth()

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
          <EmailForm
            currentEmail={user?.email ?? ''}
            pendingEmail={user?.new_email ?? null}
            pendingSentAt={user?.email_change_sent_at ?? null}
            profileId={profile?.id ?? null}
            canCancel={isAdmin}
            onRefreshUser={refreshUser}
            onRefreshProfile={refreshProfile}
          />
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

/**
 * Addresses a confirmation has already been requested for, and when. A secure
 * email change spends TWO sends per request -- one to the current address, one
 * to the new one -- against a quota that is only 2 per hour on Supabase's
 * built-in SMTP, and a request that fails part-way has usually still sent one
 * of them. Attempts are therefore recorded whatever the outcome, not just on
 * success. Module scope, because switching Settings bands unmounts this form
 * and component state would forget the request.
 */
const emailChangeAttempts = new Map<string, number>()
// Matched to the mail quota, not to how fast someone can click. On the
// built-in mailer the project gets roughly two sends an hour and one secure
// change spends both, so a one-minute cooldown just let a second attempt
// through to earn a 429 and burn the next window with it.
const RESEND_COOLDOWN_MS = 15 * 60_000

/**
 * GoTrue's prose shifts between releases; its `code` is the stable contract.
 * `current` and `next` are passed so the message can say *which* of the two
 * addresses was refused -- with confirm-from-both enabled either one can be,
 * and "invalid email" against the address you just typed is misleading when the
 * address that actually failed is the one you already sign in with.
 */
function describeEmailError(error: AuthError, current: string, next: string): string {
  if (error.code === 'over_email_send_rate_limit' || /rate limit/i.test(error.message)) {
    // Deliberately not "try again in a few minutes": the quota belongs to the
    // whole project, and a failed attempt spends its sends just as a successful
    // one does. Telling someone to retry is what turns one bad address into an
    // afternoon of 429s.
    return 'The project has sent its allowance of confirmation emails for now. Retrying will not help until the mail sender is configured, since each attempt spends the same quota whether or not it succeeds.'
  }
  if (error.code === 'email_exists' || error.code === 'user_already_exists') {
    return 'Another account already uses that address.'
  }
  // Matched on the message as well as the code. `code` is the stable contract
  // when it is present, but GoTrue does not always populate it for this class of
  // failure, and falling through to the raw message is the worst outcome here:
  // "Email address ... is invalid" reads as a complaint about what you typed,
  // when the address it names is the one you already sign in with.
  const said = error.message.toLowerCase()
  const rejectedAddress =
    error.code === 'email_address_invalid' ||
    error.code === 'email_address_not_authorized' ||
    /is invalid|not authorized|invalid format/i.test(error.message)
  if (rejectedAddress) {
    if (current && said.includes(current.toLowerCase())) {
      return `The mail service refused to send to ${current}, your current address, so the change cannot be confirmed from both ends. The address you typed was not the problem. An administrator has to cancel the pending change and set the new address directly.`
    }
    if (next && said.includes(next.toLowerCase())) {
      return `The mail service refused to send to ${next}. Check the spelling, and that the address can receive mail.`
    }
    return `${error.message}. Both your current and your new address must be able to receive mail before the change can complete.`
  }
  return error.message
}

function EmailForm({
  currentEmail,
  pendingEmail,
  pendingSentAt,
  profileId,
  canCancel,
  onRefreshUser,
  onRefreshProfile,
}: {
  currentEmail: string
  /** A change GoTrue is still holding, from the session itself. */
  pendingEmail: string | null
  /** When the confirmation pair went out. Absent means it never did. */
  pendingSentAt: string | null
  profileId: string | null
  /** Cancelling writes auth.users, so it is Admin-only in the database too. */
  canCancel: boolean
  onRefreshUser: () => Promise<void>
  onRefreshProfile: () => Promise<void>
}) {
  const toast = useToast()
  const [requested, setRequested] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  /** The address a direct set is being confirmed for, or null when idle. */
  const [directTarget, setDirectTarget] = useState<string | null>(null)
  const [settingDirect, setSettingDirect] = useState(false)
  /**
   * Taken from the session first, so a change that is still outstanding is
   * shown on every visit -- not only in the tab that requested it. Component
   * state forgot it on reload, which is how an address change that never
   * completed could look finished while the old one still signed you in.
   */
  const pending = pendingEmail ?? requested
  /**
   * A pending change with nothing sent behind it can never complete: the
   * request failed before GoTrue issued the tokens, so no emailed link will
   * ever match it. GoTrue keeps reporting it as pending regardless, so the
   * banner has to distinguish the two states rather than sending someone to
   * look for mail that was never sent.
   */
  const stalled = Boolean(pending) && !pendingSentAt
  /**
   * A disabled submit button does not stop implicit submission: this form has a
   * single field, so Enter fires it regardless, and react-hook-form does not
   * block a re-entrant submit. The guard lives here rather than only on the
   * button so that one user action can only ever be one updateUser call.
   */
  const inFlight = useRef(false)
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    values: { email: currentEmail },
  })

  async function onSubmit(values: EmailValues) {
    // GoTrue stores addresses lowercased, so matching its normalisation is what
    // makes the "already your email" comparison below reliable.
    const next = values.email.trim().toLowerCase()
    const current = currentEmail.trim().toLowerCase()

    if (next === current) {
      toast.info('No change', 'That is already your sign-in email.')
      return
    }
    if (inFlight.current) return
    // A dead pending change blocks a new one server-side, so sending anyway
    // would spend a confirmation email to earn the same failure back.
    if (stalled) {
      toast.info(
        'Cancel the stuck change first',
        'The recorded change can no longer be confirmed, and a new one cannot be requested until it is cleared.',
      )
      return
    }

    const attemptedAt = emailChangeAttempts.get(next)
    if (attemptedAt !== undefined && Date.now() - attemptedAt < RESEND_COOLDOWN_MS) {
      toast.info(
        'Confirmation already requested',
        `Check ${next} (and ${currentEmail}) for the links before requesting another.`,
      )
      return
    }

    inFlight.current = true
    // Recorded before the call, not after: the send is spent whether or not the
    // request then succeeds, and a rate-limit error must never be auto-retried.
    emailChangeAttempts.set(next, Date.now())
    try {
      // Both confirmation links are built from this, not the project Site URL.
      // Site URL is a single value shared by every auth email and still points
      // at localhost, so without an explicit redirect the links a production
      // user opens resolve to a dev server that is not running.
      const { error } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: `${window.location.origin}/dashboard/settings` },
      )
      if (error) {
        toast.error('Could not change email', describeEmailError(error, current, next))
        // A failed request can still have recorded the change. Re-reading the
        // user is what turns the next render into the accurate banner, instead
        // of leaving the form looking as though nothing happened at all.
        await onRefreshUser()
        return
      }
      setRequested(next)
      toast.success('Confirmation sent', `Check ${next} to confirm the change.`)
    } finally {
      inFlight.current = false
    }
  }

  /** Validates what is typed, then asks before bypassing confirmation. */
  function onRequestDirect() {
    const next = getValues('email').trim().toLowerCase()
    const parsed = emailSchema.safeParse({ email: next })
    if (!parsed.success) {
      toast.error('Check the address', 'Enter a valid email address first.')
      return
    }
    if (next === currentEmail.trim().toLowerCase()) {
      toast.info('No change', 'That is already your sign-in email.')
      return
    }
    setDirectTarget(next)
  }

  async function onConfirmDirect() {
    if (!profileId || !directTarget) return
    setSettingDirect(true)
    try {
      const saved = await setSignInEmail(profileId, directTarget)
      setRequested(null)
      setDirectTarget(null)
      // The session's user and the profile row both carry the address, and the
      // JWT itself is unchanged, so neither refreshes on its own.
      await onRefreshUser()
      await onRefreshProfile()
      toast.success('Email updated', `You now sign in as ${saved}.`)
    } catch (err) {
      toast.error('Could not set the address', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSettingDirect(false)
    }
  }

  async function onCancel() {
    if (!profileId || cancelling) return
    setCancelling(true)
    try {
      const cleared = await clearPendingEmailChange(profileId)
      setRequested(null)
      // The cooldown is keyed on the address, and clearing the change is a
      // deliberate decision to allow another attempt at that same address.
      if (pending) emailChangeAttempts.delete(pending)
      await onRefreshUser()
      if (cleared) toast.success('Pending change cancelled', 'The email change can be requested again.')
      else toast.info('Nothing pending', 'There was no email change left to cancel.')
    } catch (err) {
      toast.error('Could not cancel', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <SectionCard icon={Mail} title="Sign-in email" description="Changing this requires confirming from both addresses." variant="form">
      {pending && (
        <Alert
          variant={stalled ? 'error' : 'warning'}
          className="mb-5"
          title={stalled ? 'Email change is stuck' : 'Email change not finished'}
        >
          {stalled ? (
            <>
              A change to {pending} is recorded, but the confirmation emails were never sent, so no
              link exists that can complete it. <strong>{currentEmail}</strong> is still the address
              you sign in with. Cancel the change before requesting it again.
            </>
          ) : (
            <>
              A change to {pending} is still waiting on confirmation from both {currentEmail} and{' '}
              {pending}. Until both links are opened, <strong>{currentEmail}</strong> is still the
              address you sign in with.
            </>
          )}
          {canCancel ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-3"
              loading={cancelling}
              onClick={onCancel}
            >
              Cancel pending change
            </Button>
          ) : (
            <span className="mt-2 block">Ask an administrator to cancel it for you.</span>
          )}
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
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="deck" loading={isSubmitting} disabled={stalled}>
            {isSubmitting ? 'Sending confirmation' : 'Update email'}
          </Button>
          {/* The way out when the mail path is the broken part. Admin-only here
              and in the edge function, and deliberately the quieter of the two
              buttons: confirming from both addresses stays the normal route. */}
          {canCancel && (
            <Button type="button" variant="ghost" size="sm" onClick={onRequestDirect}>
              Set directly, without email
            </Button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(directTarget)}
        onClose={() => setDirectTarget(null)}
        onConfirm={onConfirmDirect}
        loading={settingDirect}
        variant="danger"
        title="Set the sign-in email directly?"
        confirmLabel="Set address"
        description={
          <>
            <strong>{currentEmail}</strong> will be replaced by <strong>{directTarget}</strong>{' '}
            immediately, with no confirmation email to either address. Use this only when the
            mail service cannot reach the current address, and only if you are certain the new
            one is right: it becomes the address you sign in with, and the only address a
            password reset can be sent to.
          </>
        }
      />
    </SectionCard>
  )
}

// ---- Password --------------------------------------------------------------

/** Password input with a reveal toggle. Mirrors the one on the login screen. */
const PasswordField = forwardRef<
  HTMLInputElement,
  { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>
>(({ label, error, ...props }, ref) => {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        ref={ref}
        label={label}
        type={show ? 'text' : 'password'}
        autoComplete="new-password"
        error={error}
        className="pr-10"
        {...props}
      />
      {/* Sits against the control, not the field block, so it stays
          aligned whether or not an error line is rendered. */}
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="deck-focus absolute right-2 top-[30px] inline-flex h-8 w-8 items-center justify-center rounded-chip text-deck-400 transition-colors hover:bg-deck-100 hover:text-deck-800"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
})
PasswordField.displayName = 'PasswordField'

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
        <PasswordField
          label="New password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm new password"
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
