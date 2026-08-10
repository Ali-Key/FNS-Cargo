import { PageHero, Section } from '@/components/site'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Privacy() {
  const { settings } = useSystemSettings()
  useDocumentTitle(`Privacy Policy | ${settings.company_name}`, 'What information FNS Cargo collects, how we use it, and how we keep it safe.')

  return (
    <div>
      <PageHero
        eyebrow="Legal"
        title="Privacy Policy"
        description="Here's the plain version of how we handle your information. If anything's unclear, just ask us — the contact details are at the bottom."
      />

      <Section tone="white" size="md" containerClassName="max-w-3xl">
        <p className="text-sm text-text-secondary">Last updated: January 2026</p>

        <div className="prose-legal mt-8 space-y-8 text-text-secondary">
          <section>
            <h2 className="text-lg font-bold text-navy-900">What we collect</h2>
            <p className="mt-2 leading-relaxed">
              When you ask for a quote, send us a message, or ship goods with {settings.company_name}, we
              collect what we need to do the job: usually your name, email, phone number, and address, plus
              details about the shipment itself (where it's going, how much it weighs, and what's inside).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">How we use it</h2>
            <p className="mt-2 leading-relaxed">
              We use your information to move your shipment, keep you updated on where it is, answer your
              questions, and keep proper records of what we've shipped. We don't sell your information to anyone.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">What public tracking shows</h2>
            <p className="mt-2 leading-relaxed">
              Anyone with a tracking number can see the shipment's status, its route, and the estimated delivery
              date. Public tracking never shows names, phone numbers, addresses, billing details, or how much a
              shipment is worth.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Keeping it safe</h2>
            <p className="mt-2 leading-relaxed">
              We store your information securely and limit who can see it. Only our own staff, and only the ones
              who need it to do their work, can open customer records and shipment details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">How long we keep it</h2>
            <p className="mt-2 leading-relaxed">
              We hold on to shipment and customer records for as long as we need them: to run the business,
              keep our accounts straight, and meet the record-keeping the law asks of us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Questions?</h2>
            <p className="mt-2 leading-relaxed">
              If you'd like to know more about how we handle your information, email us at{' '}
              <a
                href={`mailto:${settings.company_email}`}
                className="rounded-control font-semibold text-navy-800 hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
              >
                {settings.company_email}
              </a>{' '}
              or call {settings.company_phone}.
            </p>
          </section>
        </div>
      </Section>
    </div>
  )
}
