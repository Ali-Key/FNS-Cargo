import { ArrowRight } from 'lucide-react'
import {
  ButtonLink,
  CTASection,
  PageHero,
  Reveal,
  Section,
  SectionHeading,
  Stat,
} from '@/components/site'
import { images } from '@/config/images'
import { PRINCIPLES, STATS } from '@/content/site'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function About() {
  useDocumentTitle(
    'About Us | FNS Cargo',
    'FNS Cargo is a logistics and freight forwarding company based in Somalia, providing air and sea freight, customs clearance, and door-to-door delivery to markets worldwide.',
  )

  return (
    <div>
      <PageHero
        eyebrow="About FNS Cargo"
        title="Connecting Somalia with global markets"
        description="FNS Cargo is a logistics and freight forwarding company based in Somalia. We provide air freight, sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark, and other international markets."
      />

      <Section tone="white" size="md">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div className="order-2 lg:order-1">
            <SectionHeading
              eyebrow="Who we are"
              title="A freight partner, not just a carrier"
              align="left"
            />
            <Reveal delay={120}>
              <p className="mt-5 text-pretty leading-relaxed text-text-secondary">
                Our purpose is to give Somali businesses and individuals dependable access to
                international suppliers and markets. We combine established carrier partnerships
                with modern shipment systems so that cargo moves predictably and its status is
                always visible.
              </p>
              <p className="mt-4 text-pretty leading-relaxed text-text-secondary">
                Air freight, sea freight, customs clearance, airport handling, and final delivery
                are planned as one operation. Every consignment is recorded in our tracking system,
                so both the shipper and the consignee can see genuine progress rather than waiting
                on a phone call.
              </p>
              <ButtonLink
                to="/contact"
                variant="secondary"
                className="mt-7"
                icon={<ArrowRight className="h-3.5 w-3.5" />}
                iconPosition="right"
              >
                Speak to our team
              </ButtonLink>
            </Reveal>
          </div>

          <Reveal className="order-1 space-y-3 lg:order-2">
            <div className="overflow-hidden rounded-card border border-border">
              <img
                src={images.about.main.src}
                alt={images.about.main.alt}
                width={1600}
                height={1067}
                className="h-60 w-full object-cover sm:h-72"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-card border border-border">
              <img
                src={images.about.secondary.src}
                alt={images.about.secondary.alt}
                width={1600}
                height={1067}
                className="h-44 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* The figures. `dl` because each one is a term and its definition. */}
      <Section tone="surface" size="sm">
        <dl className="grid grid-cols-2 gap-y-8 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-2 text-center sm:px-4">
              <dt className="sr-only">{stat.label}</dt>
              <dd>
                <Stat value={stat.value} label={stat.label} />
              </dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section tone="navy" size="md" patterned>
        <SectionHeading title="How we work" align="left" tone="dark" />
        <div className="mt-9 grid gap-8 sm:grid-cols-3">
          {PRINCIPLES.map((item, i) => (
            <Reveal key={item.title} delay={i * 70} className="border-l-2 border-primary-500 pl-5">
              <h3 className="text-base font-bold leading-snug text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-200">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <CTASection
        title="Have cargo to move?"
        description="Tell us the origin, destination, and cargo details and we will recommend the most suitable route and service."
      >
        <ButtonLink
          to="/contact"
          size="lg"
          icon={<ArrowRight className="h-4 w-4" />}
          iconPosition="right"
        >
          Request a quote
        </ButtonLink>
      </CTASection>
    </div>
  )
}
