import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Percent, Save } from 'lucide-react'
import { Button, FieldGroup, Input, Panel, PanelFooter, PanelHeader, Skeleton, Textarea } from '@/components/ui'
import { useCachedResource, invalidateCachedResources } from '@/hooks/useCachedResource'
import { clearSystemSettingsCache } from '@/hooks/useSystemSettings'
import { useToast } from '@/context/ToastContext'
import { getAdminSystemSettings, updateSystemSettings } from '@/services/settingsService'
import { logActivity } from '@/services/activityService'
import { SettingsSection } from './SettingsSection'

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

/**
 * Admin-only: the company identity and billing defaults every generated
 * document and the public site read from `system_settings`. Not account
 * management, but it lives on Settings because it is the console's only
 * configuration surface.
 */
export function CompanySettings() {
  const toast = useToast()

  const [settingsId, setSettingsId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  // Cached like any other page resource, so coming back to Settings shows the
  // saved values immediately and confirms them behind the form.
  const { data, loading, error } = useCachedResource(
    'settings:admin',
    getAdminSystemSettings,
    { staleTime: 60_000 },
  )

  // Only seed the form from a fetch while it is untouched: overwriting fields
  // the user is midway through editing, because a background refresh landed,
  // would silently discard their typing.
  const dirtyRef = useRef(isDirty)
  dirtyRef.current = isDirty

  useEffect(() => {
    if (!data || dirtyRef.current) return
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
  }, [data, reset])

  useEffect(() => {
    if (loading) return
    if (error) toast.error('Unable to load settings', 'Please refresh the page to try again.')
    else if (!data)
      toast.error('Unable to load settings', 'No settings record was found. Please contact an administrator.')
  }, [loading, error, data, toast])

  async function onSubmit(values: FormValues) {
    if (!settingsId) {
      toast.error('Unable to save settings', 'Settings could not be loaded. Please refresh the page and try again.')
      return
    }
    try {
      const parsed = schema.parse(values)
      await updateSystemSettings(settingsId, { ...parsed, logo_url: parsed.logo_url || null })
      await logActivity('settings.updated', 'system_settings', settingsId, {})
      // These values are read by the public site and every generated document,
      // so both caches that hold them have to let go of the old copy.
      clearSystemSettingsCache()
      invalidateCachedResources('settings:')
      toast.success('Settings saved', 'These details are now live across the public site and every document.')
      reset(values)
    } catch (err) {
      toast.error('Unable to save settings', err instanceof Error ? err.message : 'Please try again in a moment.')
    }
  }

  const heading = {
    title: 'Company details',
    description: 'Company details used across the FSN Cargo public site, invoices, waybills, and receipts.',
  }

  if (loading) {
    return (
      <SettingsSection {...heading}>
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-deck bg-panel p-5 shadow-deck">
              <Skeleton className="mb-5 h-4 w-44" />
              <div className="space-y-5">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </SettingsSection>
    )
  }

  return (
    <SettingsSection {...heading}>
      {/* Two panels, not one long form: identity and money rules are edited for
          different reasons, and splitting them makes each scannable. */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Panel>
          <PanelHeader
            title="Company identity"
            description="Shown in the site footer, on every generated document, and in customer emails."
            icon={Building2}
          />
          <div className="space-y-5 p-5 sm:p-6">
            <Input label="Company name" error={errors.company_name?.message} {...register('company_name')} />
            <FieldGroup>
              <Input label="Email" type="email" error={errors.company_email?.message} {...register('company_email')} />
              <Input label="Phone" error={errors.company_phone?.message} {...register('company_phone')} />
            </FieldGroup>
            <FieldGroup>
              <Input
                label="Website"
                placeholder="https://…"
                error={errors.company_website?.message}
                {...register('company_website')}
              />
              <Input
                label="Logo URL"
                note="Optional"
                placeholder="https://…"
                error={errors.logo_url?.message}
                {...register('logo_url')}
              />
            </FieldGroup>
            <Textarea label="Address" rows={2} error={errors.company_address?.message} {...register('company_address')} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Billing defaults"
            description="Applied when a new invoice is issued."
            icon={Percent}
          />
          <div className="p-5 sm:p-6">
            <Input
              label="VAT rate (%)"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              suffix="%"
              containerClassName="max-w-xs"
              hint="Already-issued invoices keep the VAT amount stored on them and are not recalculated."
              error={errors.vat_rate?.message}
              {...register('vat_rate')}
            />
          </div>
          <PanelFooter>
            <p className="text-[12px] text-deck-500">
              {isDirty ? 'You have unsaved changes.' : 'All changes saved.'}
            </p>
            <Button type="submit" variant="deck" size="sm" icon={<Save className="h-4 w-4" />} loading={isSubmitting} disabled={!isDirty}>
              Save changes
            </Button>
          </PanelFooter>
        </Panel>
      </form>
    </SettingsSection>
  )
}
