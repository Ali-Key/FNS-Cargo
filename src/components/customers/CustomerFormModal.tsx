import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Select, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createCustomer, updateCustomer } from '@/services/customersService'
import type { Customer } from '@/types'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Disabled', label: 'Disabled' },
]

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter the customer name'),
  email: z.string().trim().min(1, 'Enter an email').email('Enter a valid email'),
  phone: z.string().trim().optional(),
  company: z.string().trim().optional(),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  status: z.enum(['Active', 'Disabled']),
})

type FormValues = z.infer<typeof schema>

interface CustomerFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  customer?: Customer | null
}

export function CustomerFormModal({ open, onClose, onSaved, customer }: CustomerFormModalProps) {
  const toast = useToast()
  const isEdit = !!customer

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    reset({
      full_name: customer?.full_name ?? '',
      email: customer?.email ?? '',
      phone: customer?.phone ?? '',
      company: customer?.company ?? '',
      address: customer?.address ?? '',
      notes: customer?.notes ?? '',
      status: customer?.status ?? 'Active',
    })
  }, [open, customer, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      full_name: values.full_name,
      email: values.email,
      phone: values.phone || null,
      company: values.company || null,
      address: values.address || null,
      notes: values.notes || null,
      status: values.status,
    }
    try {
      if (isEdit && customer) {
        await updateCustomer(customer.id, payload)
        toast.success('Customer updated', `${payload.full_name}'s record has been saved.`)
      } else {
        await createCustomer(payload)
        toast.success('Customer added', `${payload.full_name} is now available for new shipments.`)
      }
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to save customer', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit customer' : 'New customer'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
          <Input label="Phone number" {...register('phone')} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email address" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Company" hint="Leave empty for an individual." {...register('company')} />
        </div>
        <Input label="Delivery address" {...register('address')} />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          error={errors.status?.message}
          {...register('status')}
        />
        <Textarea
          label="Notes"
          rows={3}
          hint="Staff-only. Never shown to the customer or on the public site."
          {...register('notes')}
        />
      </form>
    </Modal>
  )
}
