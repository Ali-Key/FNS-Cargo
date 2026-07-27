import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { Reveal } from '@/components/common/Reveal'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'

const contactSchema = z.object({
  fullName: z.string().trim().min(2, 'Please tell us your name'),
  email: z.string().trim().email('That email doesn’t look right'),
  phone: z.string().trim().optional(),
  subject: z.string().trim().min(3, 'A few words on what it’s about'),
  message: z.string().trim().min(10, 'Just a little more detail, please'),
})

type ContactForm = z.infer<typeof contactSchema>

export default function Contact() {
  const { settings } = useSystemSettings()
  const toast = useToast()
  useDocumentTitle(
    'Contact Us · FNS Cargo',
    'Get in touch with FNS Cargo for a shipping quote, help tracking a shipment, or any question about sending goods between China and Somalia.',
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({ resolver: zodResolver(contactSchema) })

  function onSubmit(data: ContactForm) {
    const subject = encodeURIComponent(`[Website] ${data.subject}`)
    const body = encodeURIComponent(
      `Name: ${data.fullName}\nEmail: ${data.email}\nPhone: ${data.phone || 'Not provided'}\n\n${data.message}`,
    )
    window.location.href = `mailto:${settings.company_email}?subject=${subject}&body=${body}`
    toast.success('Opening your email', "We've filled in your message. Just hit send.")
    reset()
  }

  return (
    <div>
      <PageHero
        eyebrow="Contact Us"
        title="Let's talk about your shipment"
        description="Need a quote, got a question about a shipment that's on its way, or just want to plan ahead? Drop us a line. We're happy to help."
      />

      <section className="container-page py-16 sm:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
          <Reveal className="lg:col-span-2">
            <div className="flex h-full flex-col rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-2">
              <h2 className="text-lg font-bold text-navy-900">Where to reach us</h2>
              <ul className="mt-5 space-y-4">
                <li className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-accent-500" />
                  <span className="text-sm text-steel-600">{settings.company_address}</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-accent-500" />
                  <a
                    href={`tel:${settings.company_phone}`}
                    className="rounded-control text-sm font-medium text-navy-800 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                  >
                    {settings.company_phone}
                  </a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-accent-500" />
                  <a
                    href={`mailto:${settings.company_email}`}
                    className="rounded-control text-sm font-medium text-navy-800 hover:text-accent-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2"
                  >
                    {settings.company_email}
                  </a>
                </li>
              </ul>
              <div className="mt-6 rounded-xl bg-navy-50/70 px-4 py-3.5 text-sm text-navy-700 lg:mt-auto">
                We usually get back to you within one working day.
              </div>
            </div>
          </Reveal>

          <Reveal as="form" delay={90} onSubmit={handleSubmit(onSubmit)} className="lg:col-span-3">
            <div className="rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-2 sm:p-8">
              <h2 className="text-lg font-bold text-navy-900">Send us a message</h2>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Input label="Your name" placeholder="e.g. Faduma Ahmed" error={errors.fullName?.message} {...register('fullName')} />
                <Input label="Email" type="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
                <Input label="Phone (optional)" placeholder="+86 or +252 number" error={errors.phone?.message} {...register('phone')} />
                <Input label="What's it about?" placeholder="A quote, tracking help, a question…" error={errors.subject?.message} {...register('subject')} />
              </div>
              <div className="mt-5">
                <Textarea
                  label="Message"
                  placeholder="Tell us what you're shipping, or what you'd like to know"
                  rows={5}
                  error={errors.message?.message}
                  {...register('message')}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="mt-6 w-full sm:w-auto"
                loading={isSubmitting}
                icon={<Send className="h-4 w-4" />}
              >
                Send message
              </Button>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
