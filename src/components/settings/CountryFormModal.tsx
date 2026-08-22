import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Input, Modal, Select } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { createCountry, findCountryConflict, updateCountry } from '@/services/countriesService'
import type { Country } from '@/types'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active — offered on new shipments' },
  { value: 'inactive', label: 'Inactive — hidden from new shipments' },
]

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the country name'),
  code: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Two letters, e.g. SO for Somalia'),
  hub_city: z.string().trim().min(2, 'Enter the hub city'),
  lane: z.string().trim().optional(),
  sort_order: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter a number' }).int('Whole numbers only').min(0, 'Cannot be negative'),
  ),
  status: z.enum(['active', 'inactive']),
})

type FormValues = z.input<typeof schema>

interface CountryFormModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  country?: Country | null
  /** One past the highest order in use, so a new country lands at the end. */
  nextSortOrder: number
}

/**
 * Add or edit a served market. The ISO code is what the flag artwork is keyed
 * on, so it is validated to two letters here as well as being unique in the
 * database.
 */
export function CountryFormModal({ open, onClose, onSaved, country, nextSortOrder }: CountryFormModalProps) {
  const toast = useToast()
  const isEdit = !!country

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (!open) return
    reset({
      name: country?.name ?? '',
      code: country?.code ?? '',
      hub_city: country?.hub_city ?? '',
      lane: country?.lane ?? '',
      sort_order: country?.sort_order ?? nextSortOrder,
      status: country && !country.is_active ? 'inactive' : 'active',
    })
  }, [open, country, nextSortOrder, reset])

  async function onSubmit(values: FormValues) {
    const parsed = schema.parse(values)
    const payload = {
      name: parsed.name,
      code: parsed.code.toUpperCase(),
      hub_city: parsed.hub_city,
      lane: parsed.lane?.trim() || null,
      sort_order: parsed.sort_order,
      is_active: parsed.status === 'active',
    }

    try {
      // Friendlier than letting the unique index speak, but not a substitute
      // for it — the 23505 branch below still catches a concurrent insert.
      const conflict = await findCountryConflict(payload.name, payload.code, country?.id)
      if (conflict === 'name') {
        setError('name', { message: `${payload.name} is already on the list` })
        return
      }
      if (conflict === 'code') {
        setError('code', { message: `${payload.code} is already used by another country` })
        return
      }

      if (isEdit && country) {
        await updateCountry(country.id, payload)
        toast.success('Country updated', `${payload.name} has been saved.`)
      } else {
        await createCountry(payload)
        toast.success(
          'Country added',
          payload.is_active
            ? `${payload.name} can now be selected on new shipments.`
            : `${payload.name} was added as inactive. Activate it to offer it on new shipments.`,
        )
      }
      onSaved()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Please try again in a moment.'
      if (/duplicate|unique|23505/i.test(message)) {
        toast.error('Already on the list', 'Another country already uses this name or code.')
      } else if (/row-level security|42501|permission denied/i.test(message)) {
        toast.error('Not permitted', 'Only an admin can change the country list.')
      } else {
        toast.error('Unable to save country', message)
      }
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isEdit ? 'Edit country' : 'Add country'}
      description={
        isEdit
          ? 'Changes apply to new shipments straight away. Shipments already booked keep the route they were created with.'
          : 'Countries added here become selectable on new shipments and appear on the public site.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="deck" onClick={handleSubmit(onSubmit)} loading={isSubmitting}>
            {isEdit ? 'Save changes' : 'Add country'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="Country name"
            containerClassName="sm:col-span-2"
            placeholder="United Arab Emirates"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="ISO code"
            className="font-mono uppercase"
            maxLength={2}
            placeholder="AE"
            hint="Two letters. Used for the flag."
            error={errors.code?.message}
            {...register('code')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Hub city"
            placeholder="Dubai"
            hint="The main handling point for this market."
            error={errors.hub_city?.message}
            {...register('hub_city')}
          />
          <Input
            label="Trade lane (optional)"
            placeholder="Middle East"
            hint="Groups nearby markets, e.g. Nordics."
            error={errors.lane?.message}
            {...register('lane')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Display order"
            type="number"
            step="1"
            min="0"
            inputMode="numeric"
            hint="Lower numbers appear first in every country list."
            error={errors.sort_order?.message}
            {...register('sort_order')}
          />
          <Select label="Status" options={STATUS_OPTIONS} error={errors.status?.message} {...register('status')} />
        </div>
      </form>
    </Modal>
  )
}
