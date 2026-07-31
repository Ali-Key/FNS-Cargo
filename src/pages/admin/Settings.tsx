import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Save, Building2 } from 'lucide-react'
import { Button, Input, Select, Textarea, Spinner } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { getSystemSettings, updateSystemSettings } from '@/services/settingsService'
import { logActivity } from '@/services/activityService'
import { SHIPPING_METHODS } from '@/types'
import { SHIPPING_METHOD_LABEL } from '@/utils/status'

const schema = z.object({
  company_name: z.string().trim().min(2, 'Enter the company name'),
  company_email: z.string().trim().email('Enter a valid email'),
  company_phone: z.string().trim().min(3, 'Enter a phone number'),
  company_website: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]),
  company_address: z.string().trim().min(3, 'Enter an address'),
  logo_url: z.union([z.string().trim().url('Enter a valid URL'), z.literal('')]),
  default_shipping_method: z.enum(['air', 'sea', 'road']),
})

type FormValues = z.infer<typeof schema>

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
        if (!active || !data) return
        setSettingsId(data.id)
        reset({
          company_name: data.company_name,
          company_email: data.company_email,
          company_phone: data.company_phone,
          company_website: data.company_website ?? '',
          company_address: data.company_address,
          logo_url: data.logo_url ?? '',
          default_shipping_method: data.default_shipping_method as FormValues['default_shipping_method'],
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
    if (!settingsId) return
    try {
      await updateSystemSettings(settingsId, {
        ...values,
        logo_url: values.logo_url || null,
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-7 w-7 text-navy-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Company details shown across the public website." />

      <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl">
        <div className="rounded-card border border-steel-100 bg-white p-6 shadow-elevation-1 sm:p-8">
          <div className="mb-6 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent-500" />
            <h2 className="font-bold text-navy-900">Company information</h2>
          </div>

          <div className="space-y-5">
            <Input label="Company name" error={errors.company_name?.message} {...register('company_name')} />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input label="Email" type="email" error={errors.company_email?.message} {...register('company_email')} />
              <Input label="Phone" error={errors.company_phone?.message} {...register('company_phone')} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Input
                label="Website"
                placeholder="https://…"
                error={errors.company_website?.message}
                {...register('company_website')}
              />
              <Select
                label="Default shipping method"
                options={SHIPPING_METHODS.map((m) => ({ value: m, label: SHIPPING_METHOD_LABEL[m] }))}
                {...register('default_shipping_method')}
              />
            </div>
            <Input
              label="Logo URL (optional)"
              placeholder="https://…"
              error={errors.logo_url?.message}
              {...register('logo_url')}
            />
            <Textarea label="Address" rows={2} error={errors.company_address?.message} {...register('company_address')} />
          </div>

          <div className="mt-8 flex justify-end border-t border-steel-100 pt-6">
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
        </div>
      </form>
    </div>
  )
}
