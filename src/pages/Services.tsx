import { Link } from 'react-router-dom'
import { Plane, Ship, Truck, Warehouse, FileCheck2, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { images } from '@/config/images'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const SERVICES = [
  {
    id: 'air',
    icon: Plane,
    title: 'Air Freight',
    tagline: 'The fast option, for when timing matters',
    description:
      "When you can't wait, we fly your goods from China to Somalia. Air freight gets urgent restocks, high-value items, and documents there in days, with priority handling at both ends so nothing sits around.",
    points: [
      'Priority handling at the airport, coming and going',
      'Best for urgent, valuable, or fragile goods',
      'Much faster than shipping by sea',
    ],
    image: images.services.air,
  },
  {
    id: 'sea',
    icon: Ship,
    title: 'Sea Freight',
    tagline: 'The affordable option, for bigger loads',
    description:
      "For most shipments, sea freight is the sensible choice. Book a whole container to yourself or share the space with others. Either way, it's the cheapest way to move a lot of goods between China and Somalia.",
    points: [
      'Book a whole container, or just part of one',
      "Best for larger loads that aren't in a rush",
      'We take care of the port work at both ends',
    ],
    image: images.services.sea,
  },
  {
    id: 'road',
    icon: Truck,
    title: 'Road Freight',
    tagline: 'The trucks that connect everything',
    description:
      'Once your goods land by air or sea, they still need to reach you. Our trucks cover that last stretch, from the port or warehouse right to your door, timed around when your shipment actually arrives.',
    points: [
      'From the port to the warehouse, and to your door',
      'Scheduled around your flight or vessel arrival',
      'Works hand in hand with our storage',
    ],
    image: images.services.road,
  },
  {
    id: 'warehousing',
    icon: Warehouse,
    title: 'Warehousing',
    tagline: 'A safe place for your goods to wait',
    description:
      "Not ready to receive everything at once? We'll hold your goods in secure, organized storage and keep an accurate count, then send them on when it suits your plan, not ours.",
    points: [
      'Neatly racked and properly counted',
      'Secure buildings with controlled access',
      'Released on your schedule',
    ],
    image: images.services.warehousing,
  },
  {
    id: 'customs',
    icon: FileCheck2,
    title: 'Customs Clearance',
    tagline: 'Paperwork, sorted',
    description:
      'Crossing borders means forms, and getting them wrong causes delays. Our team prepares and checks the documents your shipment needs, so it moves through customs smoothly on both ends.',
    points: [
      'We prepare and coordinate the documents',
      'Clear guidance on exactly what you need',
      'We keep you posted through the whole process',
    ],
    image: images.services.customs,
  },
]

export default function Services() {
  useDocumentTitle(
    'Freight Services · FNS Cargo',
    'Air freight, sea freight, road freight, warehousing, and customs help between China and Somalia, from pickup to delivery, all in one place.',
  )

  return (
    <div>
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-400">What we do</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">
            Every way to get your goods from China to Somalia
          </h1>
          <p className="mt-4 max-w-xl text-steel-300">
            From the moment we pick your goods up in China to the moment they reach you in Somalia, we handle
            it all: air, sea, road, storage, and the customs paperwork in between.
          </p>
        </div>
      </section>

      <div className="container-page divide-y divide-steel-100">
        {SERVICES.map((service, index) => (
          <section id={service.id} key={service.id} className="scroll-mt-24 py-16 sm:py-20">
            <div
              className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${
                index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <div className="overflow-hidden rounded-2xl shadow-elevation-3">
                <img
                  src={service.image.src}
                  alt={service.image.alt}
                  className="h-80 w-full object-cover sm:h-96"
                  loading="lazy"
                />
              </div>
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <service.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-2xl font-extrabold text-navy-900 sm:text-3xl">{service.title}</h2>
                <p className="mt-1.5 text-sm font-semibold text-accent-600">{service.tagline}</p>
                <p className="mt-4 leading-relaxed text-steel-500">{service.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-navy-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-steel-50 py-16">
        <div className="container-page flex flex-col items-center gap-5 text-center">
          <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Not sure which one you need?</h2>
          <p className="max-w-lg text-steel-500">
            Tell us what you're shipping and when you need it, and we'll suggest the right mix of services for
            your goods.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/contact">
              <Button variant="primary" size="lg" icon={<ArrowRight className="h-4 w-4" />} iconPosition="right">
                Get a quote
              </Button>
            </Link>
            <Link to="/tracking">
              <Button variant="secondary" size="lg">
                Track a shipment
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
