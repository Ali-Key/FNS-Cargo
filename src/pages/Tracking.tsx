import { Clock, MessageCircle, PackageSearch, ShieldCheck } from 'lucide-react'
import { ButtonLink, PageHero, Reveal, Section, SectionHeading } from '@/components/site'
import { TrackingWidget } from '@/components/tracking/TrackingWidget'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Format matches `suggest_tracking_number` in the database: FNS, a two-letter
// country code, then six digits. The page previously advertised eight.
const HELP_POINTS = [
  {
    icon: PackageSearch,
    title: 'Finding your tracking number',
    description:
      'Your tracking number appears on the booking confirmation we issued. It follows the format FNS-CN-000000.',
  },
  {
    icon: Clock,
    title: 'How often the status updates',
    description:
      'Each scan event is published as it is recorded, covering collection, departure, arrival, clearance, and delivery.',
  },
  {
    icon: ShieldCheck,
    title: 'What tracking shows',
    description:
      'Public tracking returns the route, status, and event history only. Names, addresses, and billing details are never exposed.',
  },
  {
    icon: MessageCircle,
    title: 'If your shipment is not listed',
    description:
      'Newly booked consignments can take a short time to appear. Contact our team and we will confirm the status directly.',
  },
]

export default function Tracking() {
  useDocumentTitle(
    'Track Your Shipment | FNS Cargo',
    'Enter your FNS Cargo tracking number to view the current status, route, estimated delivery date, and full event history for your shipment.',
  )

  return (
    <div>
      <PageHero
        eyebrow="Shipment tracking"
        title="Track your shipment"
        description="Enter your tracking number to view the current status, route, estimated delivery date, and complete event history."
        align="center"
      />

      {/* The widget overlaps the hero band deliberately — it is what the page
          is for, so it sits above the fold rather than below a scroll. */}
      <section className="container-page -mt-9 pb-10 sm:-mt-11 sm:pb-12">
        <div className="mx-auto max-w-3xl">
          <TrackingWidget elevated />
        </div>
      </section>

      <Section tone="surface" size="sm">
        <SectionHeading title="Tracking questions" />

        <dl className="mx-auto mt-8 grid max-w-4xl gap-x-10 gap-y-8 sm:grid-cols-2">
          {HELP_POINTS.map((point, i) => (
            <Reveal key={point.title} delay={i * 70} className="flex gap-4">
              <point.icon
                className="h-5 w-5 shrink-0 text-primary-600"
                strokeWidth={1.75}
                aria-hidden
              />
              <div>
                <dt className="font-bold text-navy-900">{point.title}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {point.description}
                </dd>
              </div>
            </Reveal>
          ))}
        </dl>

        <div className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-text-secondary">Still need help?</p>
          <ButtonLink to="/contact" variant="secondary">
            Contact our operations team
          </ButtonLink>
        </div>
      </Section>
    </div>
  )
}
