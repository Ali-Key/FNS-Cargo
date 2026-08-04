import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
import { PageHero } from "@/components/common/PageHero";
import { Reveal } from "@/components/common/Reveal";
import { images } from "@/config/images";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const STATS = [
  { value: "5,000+", label: "Shipments delivered" },
  { value: "7", label: "Countries connected" },
  { value: "10+", label: "Airline and carrier partners" },
  { value: "24/7", label: "Operations support" },
];

const PRINCIPLES = [
  {
    title: "Proactive communication",
    description:
      "You receive status updates as they happen. When a schedule changes, we tell you before you have to ask.",
  },
  {
    title: "One accountable team",
    description:
      "Freight, customs, handling, and final delivery are planned together and managed by a single coordinator.",
  },
  {
    title: "An established network",
    description:
      "Long-standing carrier and agent relationships on every lane mean fewer exceptions and shorter delays.",
  },
];

export default function About() {
  useDocumentTitle(
    "About Us | FNS Cargo",
    "FNS Cargo is a logistics and freight forwarding company based in Somalia, providing air and sea freight, customs clearance, and door-to-door delivery to markets worldwide.",
  );

  return (
    <div>
      <PageHero
        eyebrow="About FNS Cargo"
        title="Connecting Somalia with global markets"
        description="FNS Cargo is a logistics and freight forwarding company based in Somalia. We provide air freight, sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark, and other international markets."
      />

      <section className="container-page py-16 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="order-2 lg:order-1 lg:col-span-6">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary-600">
              Who we are
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold text-navy-900 sm:text-4xl">
              A freight partner, not just a carrier
            </h2>
            <p className="mt-5 text-pretty leading-relaxed text-text-secondary">
              Our purpose is to give Somali businesses and individuals
              dependable access to international suppliers and markets. We
              combine established carrier partnerships with modern shipment
              systems so that cargo moves predictably and its status is always
              visible.
            </p>
            <p className="mt-4 text-pretty leading-relaxed text-text-secondary">
              Air freight, sea freight, customs clearance, airport handling, and
              final delivery are planned as one operation. Every consignment is
              recorded in our tracking system, so both the shipper and the
              consignee can see genuine progress rather than waiting on a phone
              call.
            </p>
            <Link
              to="/contact"
              className="mt-7 inline-flex items-center gap-1.5 rounded-control text-sm font-bold text-navy-800 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Speak to our team
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <Reveal className="order-1 space-y-4 lg:order-2 lg:col-span-6">
            <div className="overflow-hidden rounded-card border border-gray-200">
              <img
                src={images.about.main.src}
                alt={images.about.main.alt}
                width={1600}
                height={1067}
                className="h-64 w-full object-cover sm:h-72 "
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="overflow-hidden rounded-card border border-gray-200">
              <img
                src={images.about.secondary.src}
                alt={images.about.secondary.alt}
                width={1600}
                height={1067}
                className="h-48 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </Reveal>
        </div>

        <dl className="mt-20 grid grid-cols-2 divide-steel-100 border-y border-gray-200 sm:grid-cols-4 sm:divide-x">
          {STATS.map((stat) => (
            <div key={stat.label} className="px-4 py-7 text-center sm:px-6">
              <dt className="font-tabular text-3xl font-extrabold tracking-tight text-navy-900 sm:text-4xl">
                {stat.value}
              </dt>
              <dd className="mt-1.5 text-sm leading-snug text-text-secondary">
                {stat.label}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="relative overflow-hidden bg-navy-900 py-16 text-white sm:py-20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.08]"
        />
        <div className="container-page relative">
          <h2 className="max-w-lg text-balance text-3xl font-extrabold text-white sm:text-4xl">
            How we work
          </h2>
          <div className="mt-10 grid gap-10 sm:grid-cols-3">
            {PRINCIPLES.map((item) => (
              <div
                key={item.title}
                className="border-l-2 border-primary-500 pl-5"
              >
                <h3 className="text-lg font-bold leading-snug text-white">
                  {item.title}
                </h3>
                <p className="mt-2.5 text-sm leading-relaxed text-gray-300">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-16 text-center sm:py-20">
        <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
          Have cargo to move?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-text-secondary">
          Tell us the origin, destination, and cargo details and we will
          recommend the most suitable route and service.
        </p>

          <Link to="/contact" className="mt-6 inline-block">
          <Button
            variant="primary"
            size="lg"
            icon={<ArrowRight className="h-4 w-4 text-white" />}
            iconPosition="right"
            className="text-white"
          >
            Request a quote
          </Button>
        </Link>
      </section>
    </div>
  );
}
