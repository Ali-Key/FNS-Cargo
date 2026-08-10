import { PageHero, Section } from '@/components/site'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Terms() {
  const { settings } = useSystemSettings()
  useDocumentTitle(`Terms of Service | ${settings.company_name}`, 'The simple terms for using FNS Cargo to ship goods and track shipments between China and Somalia.')

  return (
    <div>
      <PageHero
        eyebrow="Legal"
        title="Terms of Service"
        description="These are the terms for shipping with us and using our tracking. We've kept them short and plain — if anything needs explaining, get in touch."
      />

      <Section tone="white" size="md" containerClassName="max-w-3xl">
        <p className="text-sm text-text-secondary">Last updated: January 2026</p>

        <div className="prose-legal mt-8 space-y-8 text-text-secondary">
          <section>
            <h2 className="text-lg font-bold text-navy-900">What we do</h2>
            <p className="mt-2 leading-relaxed">
              {settings.company_name} moves goods between China and Somalia by air, sea, and road, and helps
              with warehousing and customs paperwork. What we can offer may depend on the route and the type of
              shipment.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">About delivery dates</h2>
            <p className="mt-2 leading-relaxed">
              Any delivery date you see on a quote, a shipment record, or the tracking page is our best estimate,
              not a promise. Things like customs, carrier schedules, and weather can shift the timing, and
              those are outside our control, so we can't guarantee an exact delivery date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Customs and duties</h2>
            <p className="mt-2 leading-relaxed">
              We help prepare your paperwork and keep things moving, but customs authorities have the final say
              on clearance, duties, and taxes. We can't guarantee how customs will decide, or that your shipment
              will be free of duties or taxes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Your shipment details</h2>
            <p className="mt-2 leading-relaxed">
              Please give us accurate details about your shipment: its weight, the number of pieces, its value,
              and what's inside. Wrong information can hold your goods up at customs or during transit.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">If something goes wrong</h2>
            <p className="mt-2 leading-relaxed">
              We handle every shipment carefully, but if goods are lost, damaged, or delayed, what we're
              responsible for is set out in the shipping agreement for your consignment. Please check that
              agreement for the full details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Changes to these terms</h2>
            <p className="mt-2 leading-relaxed">
              We may update these terms now and then as our services change. If you keep using our services
              after an update, that means you accept the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-navy-900">Questions?</h2>
            <p className="mt-2 leading-relaxed">
              If anything here needs explaining, email us at{' '}
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
