import { ArrowRight, CheckCircle2, Radar } from 'lucide-react'
import {
  ButtonLink,
  CTASection,
  Feature,
  Reveal,
  RevealGroup,
  RevealItem,
  Section,
  SectionHeading,
  ServiceCard,
} from '@/components/site'
import { images } from '@/config/images'
import {
  COUNTRIES,
  HERO_ASSURANCES,
  SERVICES,
  WHY_CHOOSE_US,
  flagUrl,
} from '@/content/site'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Home() {
  const { settings } = useSystemSettings()
  useDocumentTitle(
    `${settings.company_name} · Global Air & Sea Cargo and Logistics`,
    'FNS Cargo connects Somalia with the world through reliable air and sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark and beyond, with live shipment tracking.',
  )

  return (
    <div>
      {/* HERO
          Two columns on desktop, copy first on mobile. The floating "live
          tracking" and "7 countries" chips that used to hover over the image
          are gone: they overlapped the photo at narrow widths and restated
          facts the page makes twice more further down. */}
      <section className="border-b border-border bg-white">
        <div className="container-page py-14 sm:py-16 lg:py-20">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-badge border border-primary-100 bg-primary-50 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-700">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Global air &amp; sea cargo solutions
              </span>

              <h1 className="mt-5 max-w-xl text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-navy-900 sm:text-4xl lg:text-5xl">
                Connecting Somalia with the world,{' '}
                <span className="text-primary-500">tracked every step of the way</span>
              </h1>

              <p className="mt-5 max-w-lg text-pretty leading-relaxed text-text-secondary sm:text-lg">
                Reliable, fast, and secure cargo services between Somalia and China, Turkey,
                Sweden, Finland, Norway, Denmark, and beyond. Air and sea freight, customs, and
                door-to-door delivery, with your shipment trackable any time.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <ButtonLink
                  to="/tracking"
                  size="lg"
                  icon={<ArrowRight className="h-4 w-4" />}
                  iconPosition="right"
                >
                  Track shipment
                </ButtonLink>
                <ButtonLink to="/services" variant="secondary" size="lg">
                  Explore services
                </ButtonLink>
              </div>

              <ul className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-text-secondary">
                {HERO_ASSURANCES.map((item) => (
                  <li key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="overflow-hidden rounded-card border border-border shadow-elevation-2">
              <img
                src={images.hero.main.src}
                alt={images.hero.main.alt}
                width={1600}
                height={1067}
                className="h-72 w-full object-cover sm:h-96 lg:h-[26rem]"
                loading="eager"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <Section tone="white" size="md">
        <SectionHeading
          eyebrow="What we do"
          title="Our cargo and logistics services"
          description="One team for the whole journey. We handle air and sea freight, customs, handling, and delivery, moving your goods between Somalia and the world."
        />
        <RevealGroup className="mt-12 grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => (
            <RevealItem key={service.id} index={i % 4} className="h-full">
              <ServiceCard
                icon={service.icon}
                title={service.title}
                description={service.summary}
                to={`/services#${service.id}`}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* COUNTRIES */}
      <Section tone="surface" size="md">
        <SectionHeading
          eyebrow="Where we ship"
          title="Countries we serve"
          description="We move cargo to and from Somalia across a growing global network, and we keep expanding it to serve you better."
        />
        <RevealGroup
          as="ul"
          className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7"
        >
          {COUNTRIES.map((country, i) => (
            <RevealItem
              key={country.code}
              as="li"
              index={i}
              className="flex flex-col items-center gap-2.5 rounded-card border border-border bg-white p-4 text-center shadow-elevation-1"
            >
              <img
                src={flagUrl(country.code)}
                alt=""
                width={48}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
              <span className="text-sm font-semibold text-navy-900">{country.name}</span>
            </RevealItem>
          ))}
        </RevealGroup>
      </Section>

      {/* WHY FNS CARGO */}
      <Section tone="navy" size="md" patterned>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <SectionHeading
              eyebrow="Why FNS Cargo"
              title="Shipping you don't have to worry about"
              description="Clear updates and careful handling aren't extras we charge for. They're simply part of how we work, and here's what that looks like for you."
              align="left"
              tone="dark"
            />
            <RevealGroup className="mt-9 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
              {WHY_CHOOSE_US.map((item, i) => (
                <RevealItem key={item.title} index={i}>
                  <Feature
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                    tone="dark"
                  />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>

          <Reveal className="grid grid-cols-2 gap-3">
            <div className="col-span-2 overflow-hidden rounded-card">
              <img
                src={images.whyChooseUs.realTimeTracking.src}
                alt={images.whyChooseUs.realTimeTracking.alt}
                width={1200}
                height={800}
                className="h-52 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-card">
              <img
                src={images.whyChooseUs.safeShipping.src}
                alt={images.whyChooseUs.safeShipping.alt}
                width={800}
                height={600}
                className="h-32 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-card">
              <img
                src={images.whyChooseUs.doorToDoor.src}
                alt={images.whyChooseUs.doorToDoor.alt}
                width={800}
                height={600}
                className="h-32 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ABOUT TEASER */}
      <Section tone="white" size="md">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <Reveal className="overflow-hidden rounded-card border border-border">
            <img
              src={images.about.main.src}
              alt={images.about.main.alt}
              width={1600}
              height={1067}
              className="h-72 w-full object-cover sm:h-[22rem]"
              loading="lazy"
              decoding="async"
            />
          </Reveal>

          <div>
            <SectionHeading
              eyebrow="Who we are"
              title="Your trusted partner for global cargo"
              description="FNS Cargo is a professional logistics and cargo company based in Somalia. We provide reliable air and sea freight, customs clearance, and door-to-door delivery, connecting businesses and individuals with global markets through trusted partnerships, modern systems, and excellent customer service."
              align="left"
            />
            <Reveal delay={160}>
              <ul className="mt-6 space-y-3">
                {[
                  'Trusted global partnerships and modern systems',
                  'Air, sea, customs, and delivery under one roof',
                  'Honest updates and live tracking, pickup to delivery',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-navy-800">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success-500"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink
                  to="/about"
                  variant="secondary"
                  icon={<ArrowRight className="h-3.5 w-3.5" />}
                  iconPosition="right"
                >
                  More about us
                </ButtonLink>
                <ButtonLink to="/tracking" variant="ghost" icon={<Radar className="h-4 w-4" />}>
                  Track a shipment
                </ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </Section>

      <CTASection
        title="Need help or want to ship cargo?"
        description="Our team is ready to support you 24/7. Get a free quote, ask a question, or track a shipment that's already on its way."
      >
        <ButtonLink to="/contact" size="lg">
          Contact us today
        </ButtonLink>
        <ButtonLink to="/services" variant="outline" size="lg">
          See our services
        </ButtonLink>
      </CTASection>
    </div>
  )
}
