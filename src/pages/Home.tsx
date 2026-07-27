import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Plane,
  Ship,
  Truck,
  Warehouse,
  FileCheck2,
  FileText,
  Car,
  Boxes,
  ShieldCheck,
  Radar,
  Timer,
  Tag,
  Headset,
  Globe2,
  MapPin,
  Award,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/common/Reveal'
import { TrackingWidget } from '@/components/tracking/TrackingWidget'
import { images } from '@/config/images'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Shared focus-visible treatment for bare links (keyboard accessibility).
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2'

const ACHIEVEMENTS = [
  { icon: Boxes, value: '5,000+', label: 'Shipments delivered' },
  { icon: Globe2, value: '7+', label: 'Countries connected' },
  { icon: Plane, value: '10+', label: 'Airline partners' },
  { icon: Award, value: '100%', label: 'Customer satisfaction' },
]

const SERVICES = [
  { icon: Plane, title: 'Air Freight', description: 'Fast, reliable air cargo solutions for urgent and high-value shipments.', anchor: 'air' },
  { icon: Ship, title: 'Sea Freight', description: 'Cost-effective sea shipping for larger loads, full or shared containers.', anchor: 'sea' },
  { icon: Boxes, title: 'Commercial Cargo', description: 'General cargo and business shipments handled from start to finish.', anchor: 'commercial' },
  { icon: Truck, title: 'Door-to-Door Delivery', description: 'Safe, convenient delivery right to your doorstep.', anchor: 'door-to-door' },
  { icon: FileCheck2, title: 'Customs Clearance', description: 'Fast, efficient customs clearance support on both ends.', anchor: 'customs' },
  { icon: Warehouse, title: 'Airport Cargo Handling', description: 'Professional cargo handling at all major airports.', anchor: 'airport' },
  { icon: Car, title: 'Vehicle Shipping', description: 'Cars, trucks, and heavy equipment shipped securely.', anchor: 'vehicle' },
  { icon: FileText, title: 'Import & Export Support', description: 'Documentation and consulting made simple.', anchor: 'import-export' },
]

const COUNTRIES = ['Somalia', 'China', 'Turkey', 'Sweden', 'Finland', 'Norway', 'Denmark']

const WHY_CHOOSE_US = [
  { icon: Timer, title: 'Fast & on-time delivery', description: 'We plan the quickest sensible route so your cargo arrives when promised.' },
  { icon: ShieldCheck, title: 'Secure & safe handling', description: 'Careful packing, storage, and handling at every stop along the way.' },
  { icon: Tag, title: 'Competitive rates', description: 'Fair, transparent pricing across air and sea freight.' },
  { icon: Globe2, title: 'Reliable global partners', description: 'A trusted network connecting Somalia with the world.' },
  { icon: Headset, title: 'Professional support', description: 'A responsive team ready to help you, around the clock.' },
  { icon: Radar, title: 'Real-time tracking', description: 'Follow your shipment live, from pickup to delivery.' },
]

export default function Home() {
  const { settings } = useSystemSettings()
  useDocumentTitle(
    `${settings.company_name} · Global Air & Sea Cargo and Logistics`,
    'FNS Cargo connects Somalia with the world — reliable air and sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark and beyond, with live shipment tracking.',
  )

  return (
    <div>
      {/* HERO — light, airy blue & white split layout. Extra bottom padding
          reserves room for the tracking widget rendered as a SIBLING below, so
          the section's overflow-hidden never clips the widget. */}
      <section className="relative overflow-hidden bg-gradient-to-b from-accent-50/70 via-white to-white pb-28 pt-16 sm:pb-36 sm:pt-20">
        <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[30rem] w-[30rem] rounded-full bg-accent-200/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -left-24 top-40 h-80 w-80 rounded-full bg-navy-200/40 blur-3xl" />

        <div className="container-page relative">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
            {/* Copy */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-badge border border-accent-100 bg-accent-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
                </span>
                Global air &amp; sea cargo solutions
              </span>
              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.08] text-navy-900 sm:text-5xl lg:text-6xl">
                Connecting Somalia with the world,{' '}
                <span className="bg-gradient-to-r from-accent-600 via-accent-500 to-navy-600 bg-clip-text text-transparent">
                  tracked every step of the way
                </span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-steel-500">
                Reliable, fast, and secure cargo services to and from Somalia — China, Turkey, Sweden, Finland,
                Norway, Denmark, and beyond. Air and sea freight, customs, and door-to-door delivery, with your
                shipment trackable any time.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link to="/contact" className={`rounded-control ${FOCUS_RING}`}>
                  <Button variant="accent" size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                    Get a free quote
                  </Button>
                </Link>
                <Link to="/tracking" className={`rounded-control ${FOCUS_RING}`}>
                  <Button variant="secondary" size="lg">
                    Track my shipment
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-steel-500">
                {['Air & sea freight', 'Customs handled', 'Door-to-door', 'Live tracking'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-accent-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative animate-fade-up lg:pl-6">
              <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-accent-500/20 to-navy-500/10 blur-2xl" />
              <div className="overflow-hidden rounded-3xl border border-white/60 shadow-elevation-3">
                <img
                  src={images.hero.main.src}
                  alt={images.hero.main.alt}
                  className="h-[26rem] w-full object-cover sm:h-[30rem]"
                  loading="eager"
                />
              </div>
              {/* Floating live-tracking chip */}
              <div className="absolute -left-4 top-8 flex items-center gap-3 rounded-2xl border border-steel-100 bg-white/95 p-3.5 pr-5 shadow-elevation-3 backdrop-blur-sm sm:-left-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <Radar className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-medium text-steel-400">Right now</p>
                  <p className="text-sm font-bold text-navy-900">In transit · on schedule</p>
                </div>
              </div>
              {/* Floating stat card */}
              <div className="absolute -bottom-5 right-4 animate-float rounded-2xl border border-steel-100 bg-white/95 p-4 shadow-elevation-3 backdrop-blur-sm sm:right-8">
                <p className="font-tabular text-2xl font-extrabold text-navy-900">7+ countries</p>
                <p className="mt-0.5 text-xs font-medium text-steel-500">Connected worldwide</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tracking widget: sibling of the hero section, pulled up over its
          bottom padding via negative margin so it overlaps without clipping. */}
      <div className="container-page relative z-10 -mt-16 sm:-mt-20">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <TrackingWidget elevated />
        </div>
      </div>

      {/* ACHIEVEMENTS — the numbers that build trust. */}
      <div className="container-page mt-10 sm:mt-12">
        <dl className="grid grid-cols-2 items-stretch gap-4 lg:grid-cols-4">
          {ACHIEVEMENTS.map((stat, i) => (
            <Reveal
              as="div"
              key={stat.label}
              delay={i * 80}
              className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-steel-100 bg-white p-6 text-center shadow-elevation-1 transition-all duration-240 ease-out-premium hover:-translate-y-1 hover:border-steel-200 hover:shadow-elevation-2"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-100">
                <stat.icon className="h-5 w-5" />
              </div>
              <dt className="font-tabular text-2xl font-extrabold leading-tight text-navy-900 sm:text-3xl">{stat.value}</dt>
              <dd className="text-sm leading-snug text-steel-500">{stat.label}</dd>
            </Reveal>
          ))}
        </dl>
      </div>

      {/* SERVICES */}
      <section className="container-page py-20 sm:py-28">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-600">What we do</p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">Our cargo &amp; logistics services</h2>
          <p className="mt-4 text-pretty text-steel-500">
            One team for the whole journey — air and sea freight, customs, handling, and delivery — moving your
            goods between Somalia and the world.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => (
            <Reveal as="div" key={service.title} delay={(i % 4) * 80} className="h-full">
              <Link
                to={`/services#${service.anchor}`}
                className={`group flex h-full flex-col rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1 transition-all duration-240 ease-out-premium hover:-translate-y-1.5 hover:border-accent-200 hover:shadow-elevation-3 ${FOCUS_RING}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors duration-240 group-hover:bg-accent-500 group-hover:text-white">
                  <service.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-base font-bold text-navy-900">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-500">{service.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition-colors group-hover:text-accent-600">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* COUNTRIES WE SERVE */}
      <section className="relative overflow-hidden bg-steel-50 py-20 sm:py-28">
        <div aria-hidden className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-accent-200/30 blur-3xl" />
        <div className="container-page relative">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">Where we ship</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold text-navy-900 sm:text-4xl">Countries we serve</h2>
            <p className="mt-4 text-pretty text-steel-500">
              We move cargo to and from Somalia across a growing global network — and we keep expanding it to
              serve you better.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {COUNTRIES.map((country, i) => (
              <Reveal
                as="div"
                key={country}
                delay={i * 70}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-steel-100 bg-white p-5 text-center shadow-elevation-1 transition-all duration-240 ease-out-premium hover:-translate-y-1 hover:border-accent-200 hover:shadow-elevation-2"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-500 group-hover:text-white">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="text-sm font-bold text-navy-900">{country}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="relative overflow-hidden bg-navy-900 py-20 text-white sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-route-dots bg-[size:22px_22px] opacity-[0.07]" />
        <div className="container-page relative">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-wider text-accent-400">Why FNS Cargo</p>
              <h2 className="mt-3 text-balance text-3xl font-extrabold text-white sm:text-4xl">Shipping you don't have to worry about</h2>
              <p className="mt-4 max-w-lg text-pretty text-steel-300">
                Clear updates and careful handling aren't extras we charge for — they're just part of how we
                work. Here's what that looks like for you.
              </p>
              <div className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
                {WHY_CHOOSE_US.map((item, i) => (
                  <Reveal as="div" key={item.title} delay={i * 70} className="group flex h-full gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-400 transition-colors duration-240 group-hover:bg-accent-500 group-hover:text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-steel-300">{item.description}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </Reveal>

            <Reveal className="grid grid-cols-2 gap-4">
              <div className="group col-span-2 overflow-hidden rounded-2xl shadow-elevation-3">
                <img
                  src={images.whyChooseUs.realTimeTracking.src}
                  alt={images.whyChooseUs.realTimeTracking.alt}
                  className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="group overflow-hidden rounded-2xl shadow-elevation-2">
                <img
                  src={images.whyChooseUs.safeShipping.src}
                  alt={images.whyChooseUs.safeShipping.alt}
                  className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="group overflow-hidden rounded-2xl shadow-elevation-2">
                <img
                  src={images.whyChooseUs.doorToDoor.src}
                  alt={images.whyChooseUs.doorToDoor.alt}
                  className="h-36 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="container-page py-20 sm:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal className="group relative">
            <div className="overflow-hidden rounded-2xl shadow-elevation-3">
              <img
                src={images.about.main.src}
                alt={images.about.main.alt}
                className="h-[420px] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden w-56 animate-float rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-3 sm:block">
              <p className="font-tabular text-3xl font-extrabold text-navy-900">7+</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-steel-500">Countries connected across our growing network</p>
            </div>
          </Reveal>
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">Who we are</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">Your trusted partner for global cargo</h2>
            <p className="mt-4 text-pretty leading-relaxed text-steel-500">
              FNS Cargo is a professional logistics and cargo company based in Somalia. We provide reliable air
              and sea freight, customs clearance, and door-to-door delivery — connecting businesses and
              individuals with global markets through trusted partnerships, modern systems, and excellent
              customer service.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Trusted global partnerships and modern systems',
                'Air, sea, customs, and delivery under one roof',
                'Honest updates and live tracking, pickup to delivery',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-navy-700">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/about"
              className={`mt-7 inline-flex items-center gap-1.5 rounded-control text-sm font-bold text-navy-800 hover:text-accent-600 ${FOCUS_RING}`}
            >
              More about us <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CONTACT CTA */}
      <section className="relative overflow-hidden bg-gradient-to-br from-accent-600 via-accent-700 to-navy-900 py-20 text-white sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-15" />
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <Reveal className="container-page relative flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-xl text-balance text-3xl font-extrabold text-white sm:text-4xl">Need help or want to ship cargo?</h2>
          <p className="max-w-lg text-pretty text-white/85">
            Our team is ready to support you 24/7. Get a free quote, ask a question, or track a shipment that's
            already on its way.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link to="/contact" className={`rounded-control ${FOCUS_RING}`}>
              <Button variant="secondary" size="lg">
                Contact us today
              </Button>
            </Link>
            <Link to="/services" className={`rounded-control ${FOCUS_RING}`}>
              <Button variant="outline" size="lg">
                See our services
              </Button>
            </Link>
          </div>
        </Reveal>
      </section>
    </div>
  )
}
