import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Alert, Button, Input, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { setSignInEmail } from '@/services/profileService'
import type { DashboardUser } from '@/types'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter an email').email('Enter a valid email'),
})

type FormValues = z.infer<typeof schema>

interface ChangeEmailModalProps {
  open: boolean
  /** The account being edited. Null while the modal is closed. */
  user: DashboardUser | null
  onClose: () => void
  onSaved: (email: string) => void
}

/**
 * Admin-only: changes the address another dashboard user signs in with.
 *
 * People change the address they sign in with themselves, from Settings, and
 * that route confirms from both the old and the new address. It cannot help
 * someone who has already lost the old mailbox, or whose address was mistyped
 * when the account was created -- the confirmation link goes to an address
 * nobody can open. This sets it through the Admin API instead: no confirmation
 * email, and `auth.identities` moves with `auth.users` so sign-in keeps working.
 *
 * The gate is the `admin-set-email` edge function, which re-checks is_admin()
 * server-side. Being able to open this modal is not what authorises it.
 */
export function ChangeEmailModal({ open, user, onClose, onSaved }: ChangeEmailModalProps) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Seeded with the current address so a typo is corrected rather than retyped.
  useEffect(() => {
    if (open) reset({ email: user?.email ?? '' })
  }, [open, user, reset])

  async function onSubmit(values: FormValues) {
    if (!user) return
    const next = values.email.trim().toLowerCase()
    if (next === (user.email ?? '').trim().toLowerCase()) {
      toast.info('No change', 'That is already their sign-in email.')
      return
    }
    try {
      const saved = await setSignInEmail(user.id, next)
      toast.success('Email updated', `${user.full_name || 'This user'} now signs in as ${saved}.`)
      onSaved(saved)
      onClose()
    } catch (err) {
      toast.error('Unable to change email', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Change sign-in email"
      description={`The address ${user?.full_name || 'this user'} uses to sign in to the console.`}
      footer={
        <>
          <Button className="border" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Change email
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="off"
          hint={user?.email ? `Currently ${user.email}` : undefined}
          error={errors.email?.message}
          {...register('email')}
        />
        <Alert variant="warning">
          This takes effect immediately, with no confirmation email to either address. Make sure it is
          right: it becomes the address they sign in with, and the only one a password reset can reach.
        </Alert>
      </form>
    </Modal>
  )
}
