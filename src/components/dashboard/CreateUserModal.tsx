import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Modal, Alert } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createDashboardUser } from '@/services/usersService'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter a name'),
  email: z.string().trim().min(1, 'Enter an email').email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
})

type FormValues = z.infer<typeof schema>

interface CreateUserModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function CreateUserModal({ open, onClose, onSaved }: CreateUserModalProps) {
  const toast = useToast()
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ full_name: '', email: '', password: '' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createDashboardUser({ ...values, role: 'Admin' })
      toast.success('User invited', `${values.email} can now sign in with the temporary password.`)
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to create user', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Invite dashboard user"
      description="Create an account with access to the operations dashboard."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            Create user
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Temporary password"
          type="text"
          hint="Share this securely. The user can change it from their profile."
          error={errors.password?.message}
          {...register('password')}
        />
        <Alert variant="info">
          This creates an administrator with full access to the operations dashboard.
        </Alert>
      </form>
    </Modal>
  )
}
