import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { ButtonLink, CTASection, PageHero, Reveal, Section } from '@/components/site'
import { SERVICES } from '@/content/site'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Services() {
  useDocumentTitle(
    'Freight Services | FNS Cargo',
    'Air freight, sea freight, customs clearance, warehousing, vehicle shipping, and door-to-door delivery connecting Somalia with international markets.',
  )

  return (
    <div>
      <PageHero
        eyebrow="What we do"
        title="Freight and logistics services"
        description="Air freight, sea freight, commercial cargo, customs clearance, warehousing, vehicle shipping, and door-to-door delivery, connecting Somalia with international markets under one account."
      />

      {/* One section per service, alternating sides. `tone` alternates too, so
          eight consecutive blocks read as eight rather than as one long page. */}
      {SERVICES.map((service, index) => {
        const flipped = index % 2 === 1
        return (
          <Section
            key={service.id}
            id={service.id}
            tone={flipped ? 'surface' : 'white'}
            size="sm"
            className="scroll-mt-20"
          >
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-14">
              <Reveal className={flipped ? 'lg:order-2' : undefined}>
                <div className="overflow-hidden rounded-card border border-border">
                  <img
                    src={service.image.src}
                    alt={service.image.alt}
                    width={1200}
                    height={800}
                    className="h-64 w-full object-cover sm:h-80"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
              </Reveal>

              <Reveal delay={90} className={flipped ? 'lg:order-1' : undefined}>
                <span className="flex h-11 w-11 items-center justify-center rounded-control border border-primary-100 bg-primary-50 text-primary-600">
                  <service.icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                </span>

                <h2 className="mt-5 text-balance text-2xl font-extrabold text-navy-900 sm:text-3xl">
                  {service.title}
                </h2>
                <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-primary-600">
                  {service.tagline}
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-text-secondary">
                  {service.description}
                </p>

                <ul className="mt-6 space-y-3 border-t border-border pt-5">
                  {service.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-navy-800"
                    >
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary-500"
                        aria-hidden
                      />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </Section>
        )
      })}

      <CTASection
        title="Not sure which service you need?"
        description="Send us your cargo details and required delivery date. We will recommend the most suitable routing and quote accordingly."
      >
        <ButtonLink
          to="/contact"
          size="lg"
          icon={<ArrowRight className="h-4 w-4" />}
          iconPosition="right"
        >
          Request a quote
        </ButtonLink>
        <ButtonLink to="/tracking" variant="outline" size="lg">
          Track a shipment
        </ButtonLink>
      </CTASection>
    </div>
  )
}
