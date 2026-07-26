import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Modal, Alert } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createDashboardUser } from '@/services/usersService'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter an email').email('Enter a valid email'),
  password: z.string().min(10, 'Use at least 10 characters'),
  role: z.enum(['admin', 'staff']),
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
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { role: 'staff' } })

  useEffect(() => {
    if (open) reset({ email: '', password: '', role: 'staff' })
  }, [open, reset])

  async function onSubmit(values: FormValues) {
    try {
      await createDashboardUser(values)
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
        <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Temporary password"
          type="text"
          hint="Share this securely. The user can change it from their profile."
          error={errors.password?.message}
          {...register('password')}
        />
        <Select
          label="Role"
          options={[
            { value: 'staff', label: 'Staff: manage shipments & tracking' },
            { value: 'admin', label: 'Admin: full access' },
          ]}
          {...register('role')}
        />
        <Alert variant="info">
          Staff can manage shipments, tracking, and view customers. Admins additionally manage customers, users, and
          settings.
        </Alert>
      </form>
    </Modal>
  )
}
