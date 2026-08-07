import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Building2 } from 'lucide-react'
import { Button, Input, Textarea, SectionCard, Skeleton, FieldGroup } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { getSystemSettings, updateSystemSettings } from '@/services/settingsService'
import { logActivity } from '@/services/activityService'

const schema = z.object({
  company_name: z.string().trim().min(2, 'Enter the company name'),
  company_email: z.string().trim().email('Enter a valid email'),
  company_phone: z.string().trim().min(3, 'Enter a phone number'),
  company_website: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]),
  company_address: z.string().trim().min(3, 'Enter an address'),
  logo_url: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]),
  vat_rate: z.preprocess(
    (v) => (v === '' || v === null || v === undefined ? undefined : Number(v)),
    z.number({ invalid_type_error: 'Enter a VAT rate' }).nonnegative('VAT rate cannot be negative'),
  ),
})

type FormValues = z.input<typeof schema>

export default function Settings() {
  useDocumentTitle('Settings | FNS Cargo')
  const toast = useToast()

  const [loading, setLoading] = useState(true)
  const [settingsId, setSettingsId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  useEffect(() => {
    let active = true
    getSystemSettings()
      .then((data) => {
        if (!active) return
        if (!data) {
          toast.error('Unable to load settings', 'No settings record was found. Please contact an administrator.')
          return
        }
        setSettingsId(data.id)
        reset({
          company_name: data.company_name,
          company_email: data.company_email,
          company_phone: data.company_phone,
          company_website: data.company_website ?? '',
          company_address: data.company_address,
          logo_url: data.logo_url ?? '',
          vat_rate: data.vat_rate as unknown as number,
        })
      })
      .catch(() => toast.error('Unable to load settings', 'Please refresh the page to try again.'))
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reset, toast])

  async function onSubmit(values: FormValues) {
    if (!settingsId) {
      toast.error('Unable to save settings', 'Settings could not be loaded. Please refresh the page and try again.')
      return
    }
    try {
      const parsed = schema.parse(values)
      await updateSystemSettings(settingsId, {
        ...parsed,
        logo_url: parsed.logo_url || null,
      })
      await logActivity('settings.updated', 'system_settings', settingsId, {})
      toast.success('Settings saved', 'Your company details are now live across the website.')
      reset(values)
    } catch (err) {
      toast.error('Unable to save settings', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Company details shown across the public website." />
        <div className="max-w-3xl">
          <SectionCard icon={Building2} title="Company information" variant="form">
            <div className="space-y-5">
              <Skeleton className="h-11 w-full" />
              <FieldGroup>
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </FieldGroup>
              <FieldGroup>
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </FieldGroup>
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </SectionCard>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company details shown across the public website." />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
        <SectionCard icon={Building2} title="Company information" variant="form">
          <div className="space-y-5">
            <Input label="Company name" error={errors.company_name?.message} {...register('company_name')} />
            <FieldGroup>
              <Input label="Email" type="email" error={errors.company_email?.message} {...register('company_email')} />
              <Input label="Phone" error={errors.company_phone?.message} {...register('company_phone')} />
            </FieldGroup>
            <Input
              label="Website"
              placeholder="https://…"
              error={errors.company_website?.message}
              {...register('company_website')}
            />
            <Input
              label="Logo URL (optional)"
              placeholder="https://…"
              error={errors.logo_url?.message}
              {...register('logo_url')}
            />
            <Textarea label="Address" rows={2} error={errors.company_address?.message} {...register('company_address')} />
            <Input
              label="VAT rate (%)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              hint="Applied to new invoices at issue time. Already-issued invoices keep their stored VAT amount."
              error={errors.vat_rate?.message}
              {...register('vat_rate')}
            />
          </div>

          <div className="mt-8 flex justify-end border-t border-gray-200 pt-6">
            <Button
              type="submit"
              variant="primary"
              icon={<Save className="h-4 w-4" />}
              loading={isSubmitting}
              disabled={!isDirty}
            >
              Save changes
            </Button>
          </div>
        </SectionCard>
      </form>
    </div>
  )
}
