import { Link } from 'react-router-dom'
import { Plane, Ship, Boxes, Truck, FileCheck2, Warehouse, Car, FileText, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui'
import { PageHero } from '@/components/common/PageHero'
import { Reveal } from '@/components/common/Reveal'
import { images } from '@/config/images'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const SERVICES = [
  {
    id: 'air',
    icon: Plane,
    title: 'Air Freight',
    tagline: 'Fast, reliable air cargo solutions',
    description:
      "When you can't wait, we fly your goods in. Air freight gets urgent restocks, high-value items, and documents there in days, with priority handling at both ends so nothing sits around.",
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
    tagline: 'Cost-effective sea shipping services',
    description:
      "For most shipments, sea freight is the sensible choice. Book a whole container to yourself or share the space with others. Either way, it's the most affordable way to move larger loads.",
    points: [
      'Book a whole container, or just part of one',
      "Best for larger loads that aren't in a rush",
      'We take care of the port work at both ends',
    ],
    image: images.services.sea,
  },
  {
    id: 'commercial',
    icon: Boxes,
    title: 'Commercial Cargo',
    tagline: 'General cargo & business shipments',
    description:
      'From retail stock to equipment and bulk goods, we handle commercial cargo of every size. We plan the right mix of air and sea so your business shipments arrive on time and on budget.',
    points: [
      'Handled end to end, whatever the volume',
      'The right route for your timing and budget',
      'A single point of contact for your business',
    ],
    image: images.warehouseDetail,
  },
  {
    id: 'door-to-door',
    icon: Truck,
    title: 'Door-to-Door Delivery',
    tagline: 'Safe delivery right to your doorstep',
    description:
      "We arrange pickup and final delivery so you're never left sorting out the last mile. From the shipper's door to yours, we coordinate every leg and time it around your shipment's arrival.",
    points: [
      'Pickup and delivery arranged for you',
      'From the port or warehouse to your door',
      'One team coordinating the whole journey',
    ],
    image: images.services.road,
  },
  {
    id: 'customs',
    icon: FileCheck2,
    title: 'Customs Clearance',
    tagline: 'Fast & efficient customs support',
    description:
      'Crossing borders means forms, and getting them wrong causes delays. Our team prepares and checks the documents your shipment needs, so it moves through customs smoothly on both ends.',
    points: [
      'We prepare and coordinate the documents',
      'Clear guidance on exactly what you need',
      'We keep you posted through the whole process',
    ],
    image: images.services.customs,
  },
  {
    id: 'airport',
    icon: Warehouse,
    title: 'Airport Cargo Handling',
    tagline: 'Professional handling at major airports',
    description:
      'Cargo needs careful hands on the ground. We manage acceptance, storage, and loading at major airports, so your goods are handled properly from the moment they arrive to the moment they fly.',
    points: [
      'Trusted handling at all major airports',
      'Secure acceptance, storage, and loading',
      'Coordinated with your air freight booking',
    ],
    image: images.services.airDetail,
  },
  {
    id: 'vehicle',
    icon: Car,
    title: 'Vehicle Shipping',
    tagline: 'Cars, trucks & heavy equipment',
    description:
      'Moving a vehicle or heavy machinery takes the right equipment and planning. We ship cars, trucks, and heavy equipment safely, arranging the loading, securing, and paperwork on your behalf.',
    points: [
      'Cars, trucks, and heavy equipment',
      'Safely loaded, secured, and documented',
      'By sea or air, whichever suits best',
    ],
    image: images.operationsFloor,
  },
  {
    id: 'import-export',
    icon: FileText,
    title: 'Import & Export Support',
    tagline: 'Documentation & consulting made easy',
    description:
      'New to importing or exporting? We guide you through it, from the paperwork to the right shipping method, so you can trade across borders with confidence and without the guesswork.',
    points: [
      'Documentation prepared and checked',
      'Practical advice on rules and requirements',
      'Support from first enquiry to final delivery',
    ],
    image: images.about.secondary,
  },
]

export default function Services() {
  useDocumentTitle(
    'Freight Services · FNS Cargo',
    'Air freight, sea freight, road freight, warehousing, and customs help between China and Somalia, from pickup to delivery, all in one place.',
  )

  return (
    <div>
      <PageHero
        eyebrow="What we do"
        title="Cargo & logistics services for Somalia and the world"
        description="From pickup to final delivery, we handle it all — air and sea freight, commercial cargo, customs, airport handling, vehicle shipping, and door-to-door delivery, connecting Somalia with markets worldwide."
      />

      <div className="container-page divide-y divide-steel-100">
        {SERVICES.map((service, index) => (
          <section id={service.id} key={service.id} className="scroll-mt-24 py-16 sm:py-20">
            <div
              className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${
                index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
            >
              <Reveal className="group overflow-hidden rounded-2xl shadow-elevation-3">
                <img
                  src={service.image.src}
                  alt={service.image.alt}
                  className="h-80 w-full object-cover transition-transform duration-500 group-hover:scale-105 sm:h-96"
                  loading="lazy"
                />
              </Reveal>
              <Reveal delay={90}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-navy-50 text-navy-700 ring-1 ring-navy-100">
                  <service.icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-balance text-2xl font-extrabold text-navy-900 sm:text-3xl">{service.title}</h2>
                <p className="mt-1.5 text-sm font-semibold text-accent-600">{service.tagline}</p>
                <p className="mt-4 text-pretty leading-relaxed text-steel-500">{service.description}</p>
                <ul className="mt-5 space-y-2.5">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm text-navy-700">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      <section className="bg-steel-50 py-16">
        <Reveal className="container-page flex flex-col items-center gap-5 text-center">
          <h2 className="text-balance text-2xl font-extrabold text-navy-900 sm:text-3xl">Not sure which one you need?</h2>
          <p className="max-w-lg text-pretty text-steel-500">
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
        </Reveal>
      </section>
    </div>
  )
}
