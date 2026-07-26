import { PackageSearch, ShieldCheck, Clock, MessageCircle } from 'lucide-react'
import { TrackingWidget } from '@/components/tracking/TrackingWidget'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const HELP_POINTS = [
  {
    icon: PackageSearch,
    title: 'Where do I find my number?',
    description: 'We gave it to you when you booked. It looks like FNS-2026-000123.',
  },
  {
    icon: Clock,
    title: 'Updates as they happen',
    description: 'The status changes as your shipment gets picked up, moves along, and finally arrives.',
  },
  {
    icon: ShieldCheck,
    title: 'Your details stay private',
    description: "Tracking only shows the status and route, never your name, address, or billing details.",
  },
  {
    icon: MessageCircle,
    title: "Can't find your shipment?",
    description: "No problem. Head to the Contact page and we'll look into it for you.",
  },
]

export default function Tracking() {
  useDocumentTitle(
    'Track Your Shipment · FNS Cargo',
    'Enter your FNS Cargo tracking number to see where your shipment is, its route, when it should arrive, and everything that has happened so far.',
  )

  return (
    <div>
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-400">Shipment Tracking</p>
          <h1 className="mx-auto mt-3 max-w-2xl text-4xl font-extrabold text-white sm:text-5xl">
            Where's my shipment right now?
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-steel-300">
            Pop in your tracking number below and you'll see where your shipment is, its route, and everything
            that's happened along the way.
          </p>
        </div>
      </section>

      <section className="container-page -mt-10 pb-20 sm:-mt-14">
        <div className="mx-auto max-w-2xl">
          <TrackingWidget elevated />
        </div>
      </section>

      <section className="bg-steel-50 py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-center text-2xl font-extrabold text-navy-900 sm:text-3xl">A few quick answers</h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {HELP_POINTS.map((point) => (
              <div key={point.title} className="flex gap-4 rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-2">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy-50 text-navy-700">
                  <point.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">{point.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-steel-500">{point.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
