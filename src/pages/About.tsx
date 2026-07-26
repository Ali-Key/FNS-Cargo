import { Link } from 'react-router-dom'
import { ArrowRight, Globe2, Radar, Users2, Clock3 } from 'lucide-react'
import { Button } from '@/components/ui'
import { images } from '@/config/images'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const STATS = [
  { icon: Globe2, value: '2', label: 'Countries we connect' },
  { icon: Clock3, value: '3', label: 'Ways to ship: air, sea, road' },
  { icon: Radar, value: 'Anytime', label: 'Check your shipment status' },
  { icon: Users2, value: '1', label: 'Team that knows this route' },
]

export default function About() {
  useDocumentTitle(
    'About Us · FNS Cargo',
    'FNS Cargo is a freight company focused on one thing: reliable, honest shipping between China and Somalia.',
  )

  return (
    <div>
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-400">About FNS Cargo</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">
            One route, done properly
          </h1>
          <p className="mt-4 max-w-xl text-steel-300">
            We ship between China and Somalia, and that's all we do. Focusing on one route means we know it
            well: coordinated freight, clear communication, and a shipment you can follow from pickup to
            delivery.
          </p>
        </div>
      </section>

      <section className="container-page py-20 sm:py-28">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div className="order-2 lg:order-1">
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">Why we stick to one route</p>
            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">We know this journey inside out</h2>
            <p className="mt-4 leading-relaxed text-steel-500">
              Shipping goes smoothest when the people handling it really know the route: the ports, the
              paperwork, and the partners at both ends. That's the whole idea behind FNS Cargo. Our team spends
              every day coordinating air, sea, and road freight between China and Somalia, with warehousing and
              customs help right alongside it.
            </p>
            <p className="mt-4 leading-relaxed text-steel-500">
              Every shipment is logged and tracked in our system, so you and whoever's receiving the goods can
              see real updates, instead of calling around and waiting to hear back.
            </p>
            <Link to="/contact" className="mt-6 inline-flex items-center gap-1.5 text-sm font-bold text-navy-800 hover:text-accent-600">
              Get in touch with our team <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="order-1 grid grid-cols-2 gap-4 lg:order-2">
            <div className="col-span-2 overflow-hidden rounded-2xl shadow-elevation-3">
              <img src={images.about.main.src} alt={images.about.main.alt} className="h-64 w-full object-cover" loading="lazy" />
            </div>
            <div className="col-span-2 overflow-hidden rounded-2xl shadow-elevation-2">
              <img
                src={images.about.secondary.src}
                alt={images.about.secondary.alt}
                className="h-48 w-full object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-2 gap-6 rounded-2xl border border-steel-100 bg-steel-50/60 p-8 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <stat.icon className="mx-auto h-6 w-6 text-accent-500" />
              <p className="mt-3 font-tabular text-2xl font-extrabold text-navy-900 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-steel-500 sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-navy-900 py-16 text-white sm:py-20">
        <div className="container-page grid grid-cols-1 gap-10 sm:grid-cols-3">
          {[
            {
              title: "We keep you in the loop",
              description: "You'll always know where your shipment is. No long silences, no wondering what's happening.",
            },
            {
              title: 'One team, start to finish',
              description: 'Air, sea, road, storage, and customs are all handled together as a single plan, not passed between strangers.',
            },
            {
              title: 'We know this route',
              description: 'Sticking to the China–Somalia lane means fewer surprises and fewer delays along the way.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-steel-300">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-16 text-center sm:py-20">
        <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">Got something to ship?</h2>
        <p className="mx-auto mt-3 max-w-lg text-steel-500">
          Tell us what you're moving and our team will help you plan the best way to send it.
        </p>
        <Link to="/contact" className="mt-6 inline-block">
          <Button variant="primary" size="lg">
            Talk to our team
          </Button>
        </Link>
      </section>
    </div>
  )
}
