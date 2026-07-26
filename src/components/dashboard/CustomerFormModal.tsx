import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Textarea, Modal } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createCustomer, updateCustomer } from '@/services/customersService'
import type { Customer } from '@/types'

const schema = z.object({
  full_name: z.string().trim().min(2, 'Enter the customer name'),
  email: z.union([z.string().trim().email('Enter a valid email'), z.literal('')]).optional(),
  phone: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  address: z.string().trim().optional(),
  is_active: z.boolean().optional(),
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
      city: customer?.city ?? '',
      country: customer?.country ?? 'Somalia',
      address: customer?.address ?? '',
      is_active: customer?.is_active ?? true,
    })
  }, [open, customer, reset])

  async function onSubmit(values: FormValues) {
    const payload = {
      full_name: values.full_name,
      email: values.email || null,
      phone: values.phone || null,
      city: values.city || null,
      country: values.country || null,
      address: values.address || null,
      is_active: values.is_active ?? true,
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
          <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input label="Full name" error={errors.full_name?.message} {...register('full_name')} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Email (optional)" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Phone (optional)" {...register('phone')} />
          <Input label="City (optional)" {...register('city')} />
          <Input label="Country (optional)" {...register('country')} />
        </div>
        <Textarea label="Address (optional)" rows={2} {...register('address')} />
        <label className="flex items-center gap-2.5 text-sm text-steel-600">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-500"
            {...register('is_active')}
          />
          Active customer
        </label>
      </form>
    </Modal>
  )
}
