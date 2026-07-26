import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Plane,
  Ship,
  Truck,
  Warehouse,
  FileCheck2,
  ShieldCheck,
  Radar,
  Home as HomeIcon,
  Timer,
  Globe2,
  CheckCircle2,
  Boxes,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { TrackingWidget } from '@/components/tracking/TrackingWidget'
import { images } from '@/config/images'
import { useSystemSettings } from '@/hooks/useSystemSettings'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

// Shared focus-visible treatment for bare links (keyboard accessibility).
const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2'

const SERVICES = [
  {
    icon: Plane,
    title: 'Air Freight',
    description: "In a hurry? We fly your goods over with priority handling, so they arrive in days, not weeks.",
    image: images.services.air,
    anchor: 'air',
  },
  {
    icon: Ship,
    title: 'Sea Freight',
    description: "The affordable way to move a lot at once. Full containers or shared space, straight from China's ports.",
    image: images.services.sea,
    anchor: 'sea',
  },
  {
    icon: Truck,
    title: 'Road Freight',
    description: 'The trucks that tie it all together: ports, warehouses, and the final drop-off.',
    image: images.services.road,
    anchor: 'road',
  },
  {
    icon: Warehouse,
    title: 'Warehousing',
    description: "Need to store your goods for a while? We keep them safe, organized, and counted.",
    image: images.services.warehousing,
    anchor: 'warehousing',
  },
  {
    icon: FileCheck2,
    title: 'Customs Clearance',
    description: "Customs paperwork can be a headache. We handle it so your shipment keeps moving.",
    image: images.services.customs,
    anchor: 'customs',
  },
]

const WHY_CHOOSE_US = [
  {
    icon: Timer,
    title: 'Quick and dependable',
    description: 'We plan the fastest sensible route across air, sea, and road, so your timing stays predictable.',
    image: images.whyChooseUs.fastDelivery,
  },
  {
    icon: ShieldCheck,
    title: 'Handled with care',
    description: 'Your goods are packed, stored, and moved carefully, and looked after at every stop along the way.',
    image: images.whyChooseUs.safeShipping,
  },
  {
    icon: Radar,
    title: 'Always in the loop',
    description: "Follow your shipment live, from the moment we pick it up to the moment it reaches you.",
    image: images.whyChooseUs.realTimeTracking,
  },
  {
    icon: HomeIcon,
    title: 'Door to door',
    description: "We arrange pickup and delivery, so you're never left sorting out the last mile on your own.",
    image: images.whyChooseUs.doorToDoor,
  },
]

const HERO_STATS = [
  { icon: Timer, value: '5 to 15 days', label: 'Typical air transit, China to Somalia' },
  { icon: Boxes, value: '3 ways to ship', label: 'By air, by sea, and by road' },
  { icon: Radar, value: 'Every step tracked', label: 'From pickup all the way to your door' },
]

export default function Home() {
  const { settings } = useSystemSettings()
  useDocumentTitle(
    `${settings.company_name} · Reliable China to Somalia Freight & Logistics`,
    'Send your goods from China to Somalia by air, sea, or road, and see exactly where your shipment is any time. Freight, warehousing, and customs help from FNS Cargo.',
  )

  return (
    <div>
      {/* HERO — extra bottom padding reserves room for the tracking widget,
          which is rendered as a SIBLING below (not a child) so the section's
          own overflow-hidden (needed to clip the background image) never
          clips the widget itself. */}
      <section className="relative overflow-hidden bg-navy-950 pb-32 sm:pb-40 lg:pb-48">
        <img
          src={images.hero.main.src}
          alt={images.hero.main.alt}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          loading="eager"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-navy-950/70 via-navy-950/80 to-navy-950" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-navy-950 via-navy-950/40 to-transparent" />
        <div aria-hidden className="absolute inset-0 bg-grid-pattern bg-[size:48px_48px] opacity-20" />

        <div className="container-page relative pt-20 sm:pt-28">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-badge border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-300">
              <Globe2 className="h-3.5 w-3.5" />
              Shipping between China &amp; Somalia
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] text-white sm:text-5xl lg:text-6xl">
              Your cargo from China to Somalia, <span className="text-accent-400">and you always know where it is</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-steel-200">
              We move your goods by air, sea, and road, handle them with care, and keep the paperwork moving.
              And you can check exactly where your shipment is any time. No phone calls, no guessing.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link to="/tracking" className={`rounded-control ${FOCUS_RING}`}>
                <Button variant="accent" size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                  Track my shipment
                </Button>
              </Link>
              <Link to="/contact" className={`rounded-control ${FOCUS_RING}`}>
                <Button variant="outline" size="lg">
                  Talk to us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Tracking widget: sibling of the hero section, pulled up over its
          bottom padding via negative margin so it overlaps without clipping. */}
      <div className="container-page relative z-10 -mt-24 sm:-mt-32 lg:-mt-36">
        <div className="mx-auto max-w-2xl lg:max-w-none">
          <TrackingWidget elevated />
        </div>
      </div>

      {/* HERO STATS — quick, honest facts about the service. Equal-height cards
          (items-stretch + h-full) with a consistent icon → value → label rhythm. */}
      <div className="container-page mt-10 sm:mt-12">
        <dl className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-3">
          {HERO_STATS.map((stat) => (
            <div
              key={stat.value}
              className="flex h-full items-center gap-4 rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-1"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                <stat.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <dt className="text-lg font-extrabold leading-tight text-navy-900">{stat.value}</dt>
                <dd className="mt-1 text-sm leading-snug text-steel-500">{stat.label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>

      {/* SERVICES */}
      <section className="container-page py-20 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-600">What we do</p>
          <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">Every way to move your cargo</h2>
          <p className="mt-4 text-steel-500">
            Whether it's urgent and going by air or a full container by sea, we look after the whole journey
            from pickup in China to delivery in Somalia.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <Link
              key={service.title}
              to={`/services#${service.anchor}`}
              className={`group relative flex h-full flex-col overflow-hidden rounded-2xl border border-steel-100 bg-white shadow-elevation-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-elevation-3 ${FOCUS_RING}`}
            >
              <div className="relative h-44 overflow-hidden">
                <img
                  src={service.image.src}
                  alt={service.image.alt}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-navy-950/10 to-transparent" />
                <span className="absolute bottom-3 left-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 text-navy-800 shadow-elevation-2">
                  <service.icon className="h-5 w-5" />
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-navy-900">{service.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-500">{service.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition-colors group-hover:text-accent-600">
                  See how it works <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          ))}

          <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-steel-200 bg-steel-50/60 p-6 text-center">
            <p className="text-sm font-semibold text-navy-800">Not sure which one fits?</p>
            <p className="mt-1.5 text-sm text-steel-500">Tell us what you're shipping and we'll point you to the best option.</p>
            <Link
              to="/contact"
              className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-control text-sm font-bold text-accent-600 ${FOCUS_RING}`}
            >
              Ask us <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="relative overflow-hidden bg-navy-900 py-20 text-white sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-route-dots bg-[size:22px_22px] opacity-[0.07]" />
        <div className="container-page relative">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-wider text-accent-400">Why FNS Cargo</p>
              <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">Shipping you don't have to worry about</h2>
              <p className="mt-4 max-w-lg text-steel-300">
                Clear updates and careful handling aren't extras we charge for they're just part of how we
                work. Here's what that looks like for you.
              </p>
              <div className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
                {WHY_CHOOSE_US.map((item) => (
                  <div key={item.title} className="flex h-full gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-400">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-steel-300">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 overflow-hidden rounded-2xl shadow-elevation-3">
                <img
                  src={images.whyChooseUs.realTimeTracking.src}
                  alt={images.whyChooseUs.realTimeTracking.alt}
                  className="h-56 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-elevation-2">
                <img
                  src={images.whyChooseUs.safeShipping.src}
                  alt={images.whyChooseUs.safeShipping.alt}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="overflow-hidden rounded-2xl shadow-elevation-2">
                <img
                  src={images.whyChooseUs.doorToDoor.src}
                  alt={images.whyChooseUs.doorToDoor.alt}
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="container-page py-20 sm:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl shadow-elevation-3">
              <img
                src={images.about.main.src}
                alt={images.about.main.alt}
                className="h-[420px] w-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 hidden w-56 rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-3 sm:block">
              <p className="font-tabular text-3xl font-extrabold text-navy-900">2</p>
              <p className="mt-1 text-sm font-semibold leading-snug text-steel-500">Countries we connect, with one route we know inside out</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">Who we are</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">We do one route, and we do it well</h2>
            <p className="mt-4 leading-relaxed text-steel-500">
              FNS Cargo focuses on just one thing: moving goods between China and Somalia. Because that's all we
              do, we know the route by heart: the ports, the paperwork, the timing. Our team keeps air, sea,
              and road shipments moving, and makes sure you always know where your cargo stands.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'A team that knows the China–Somalia route by heart',
                'Honest updates from pickup to final delivery',
                'Help with your customs paperwork, start to finish',
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
          </div>
        </div>
      </section>

      {/* CONTACT TEASER */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-800 to-navy-950 py-20 text-white sm:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-10" />
        <div className="container-page relative flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-xl text-3xl font-extrabold text-white sm:text-4xl">Got something to ship?</h2>
          <p className="max-w-lg text-steel-300">
            Tell us what you're moving and we'll send you a quote, answer your questions, or help you track a
            shipment that's already on its way.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link to="/contact" className={`rounded-control ${FOCUS_RING}`}>
              <Button variant="accent" size="lg">
                Get in touch
              </Button>
            </Link>
            <Link to="/services" className={`rounded-control ${FOCUS_RING}`}>
              <Button variant="outline" size="lg">
                See our services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
