import { Link } from 'react-router-dom'
import { ArrowRight, Globe2, Plane, Boxes, Award } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { Reveal } from '@/components/common/Reveal'
import { images } from '@/config/images'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const STATS = [
  { icon: Boxes, value: '5,000+', label: 'Shipments Delivered' },
  { icon: Globe2, value: '7+', label: 'Countries Connected' },
  { icon: Plane, value: '10+', label: 'Airline Partners' },
  { icon: Award, value: '100%', label: 'Customer Satisfaction' },
]
export default function About() {
  useDocumentTitle(
    'About Us · FNS Cargo',
    'FNS Cargo is a professional logistics and cargo company based in Somalia, providing reliable air and sea freight, customs clearance, and door-to-door delivery that connects Somalia with markets worldwide.',
  )

  return (
    <div>
      <PageHero
        eyebrow="About FNS Cargo"
        title="Connecting Somalia with the world"
        description="FNS Cargo is a professional logistics and cargo company based in Somalia, providing reliable air and sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark and beyond."
      />

      <section className="container-page py-20 sm:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <Reveal className="order-2 lg:order-1">
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">Who we are</p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">
              A trusted partner for cargo and logistics
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-steel-500">
              Our mission is to connect businesses and individuals with global markets through trusted
              partnerships, modern systems, and excellent customer service. From air and sea freight to customs
              clearance, airport handling, and door-to-door delivery, we handle the whole journey so you don't
              have to juggle it yourself.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-steel-500">
              Every shipment is logged and tracked in our system, so you and whoever's receiving the goods can
              see real updates, instead of calling around and waiting to hear back.
            </p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-navy-800 hover:text-accent-600">
              Get in touch with our team <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Reveal>
          <Reveal className="order-1 grid grid-cols-2 gap-4 lg:order-2">
            <div className="group col-span-2 overflow-hidden rounded-2xl shadow-elevation-3">
              <img src={images.about.main.src} alt={images.about.main.alt} className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            </div>
            <div className="group col-span-2 overflow-hidden rounded-2xl shadow-elevation-2">
              <img
                src={images.about.secondary.src}
                alt={images.about.secondary.alt}
                className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </div>
          </Reveal>
        </div>

        <div className="mt-20 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {STATS.map((stat, i) => (
            <Reveal
              as="div"
              key={stat.label}
              delay={i * 80}
              className="group flex items-center gap-4 rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-2 transition-all duration-240 ease-out-premium hover:-translate-y-1 hover:shadow-elevation-3"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-500 transition-colors group-hover:bg-accent-100">
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="font-tabular text-2xl font-extrabold text-navy-900">{stat.value}</p>
                <p className="mt-1 text-sm font-medium leading-snug text-steel-500">{stat.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-navy-900 py-16 text-white sm:py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-route-dots bg-[size:22px_22px] opacity-[0.07]" />
        <div className="container-page relative grid grid-cols-1 gap-10 sm:grid-cols-3">
          {[
            {
              title: "We keep you in the loop",
              description: "You'll always know where your shipment is. No long silences, no wondering what's happening.",
            },
            {
              title: 'One team, start to finish',
              description: 'Air, sea, customs, handling, and delivery are all handled together as a single plan, not passed between strangers.',
            },
            {
              title: 'A reliable global network',
              description: 'Trusted partners across our routes mean fewer surprises and fewer delays, wherever your cargo is headed.',
            },
          ].map((item, i) => (
            <Reveal as="div" key={item.title} delay={i * 90} className="border-l-2 border-accent-500/60 pl-5">
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-300">{item.description}</p>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page py-16 text-center sm:py-20">
        <Reveal>
          <h2 className="text-balance text-2xl font-extrabold text-navy-900 sm:text-3xl">Got something to ship?</h2>
          <p className="mx-auto mt-3 max-w-lg text-pretty text-steel-500">
            Tell us what you're moving and our team will help you plan the best way to send it.
          </p>
          <Link to="/contact" className="mt-6 inline-block">
            <Button variant="primary" size="lg">
              Talk to our team
            </Button>
          </Link>
        </Reveal>
      </section>
    </div>
  )
}
