import { Link } from "react-router-dom";
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
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { Reveal } from "@/components/common/Reveal";
import { TrackingWidget } from "@/components/tracking/TrackingWidget";
import { images } from "@/config/images";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Shared focus-visible treatment for bare links (keyboard accessibility).
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2";

const ACHIEVEMENTS = [
  { icon: Boxes, value: "5,000+", label: "Shipments delivered" },
  { icon: Globe2, value: "7+", label: "Countries connected" },
  { icon: Plane, value: "10+", label: "Airline partners" },
  { icon: Headset, value: "24/7", label: "Customer support" },
];

const SERVICES = [
  {
    icon: Plane,
    title: "Air Freight",
    description:
      "Fast, reliable air cargo solutions for urgent and high-value shipments.",
    anchor: "air",
  },
  {
    icon: Ship,
    title: "Sea Freight",
    description:
      "Cost-effective sea shipping for larger loads, full or shared containers.",
    anchor: "sea",
  },
  {
    icon: Boxes,
    title: "Commercial Cargo",
    description:
      "General cargo and business shipments handled from start to finish.",
    anchor: "commercial",
  },
  {
    icon: Truck,
    title: "Door-to-Door Delivery",
    description: "Safe, convenient delivery right to your doorstep.",
    anchor: "door-to-door",
  },
  {
    icon: FileCheck2,
    title: "Customs Clearance",
    description: "Fast, efficient customs clearance support on both ends.",
    anchor: "customs",
  },
  {
    icon: Warehouse,
    title: "Airport Cargo Handling",
    description: "Professional cargo handling at all major airports.",
    anchor: "airport",
  },
  {
    icon: Car,
    title: "Vehicle Shipping",
    description: "Cars, trucks, and heavy equipment shipped securely.",
    anchor: "vehicle",
  },
  {
    icon: FileText,
    title: "Import & Export Support",
    description: "Documentation and consulting made simple.",
    anchor: "import-export",
  },
];

const COUNTRIES = [
  { name: "Somalia", flag: "https://flagcdn.com/w160/so.png" },
  { name: "China", flag: "https://flagcdn.com/w160/cn.png" },
  { name: "Turkey", flag: "https://flagcdn.com/w160/tr.png" },
  { name: "Sweden", flag: "https://flagcdn.com/w160/se.png" },
  { name: "Finland", flag: "https://flagcdn.com/w160/fi.png" },
  { name: "Norway", flag: "https://flagcdn.com/w160/no.png" },
  { name: "Denmark", flag: "https://flagcdn.com/w160/dk.png" },
];

const WHY_CHOOSE_US = [
  {
    icon: Timer,
    title: "Fast & on-time delivery",
    description:
      "We plan the quickest sensible route so your cargo arrives when promised.",
  },
  {
    icon: ShieldCheck,
    title: "Secure & safe handling",
    description:
      "Careful packing, storage, and handling at every stop along the way.",
  },
  {
    icon: Tag,
    title: "Competitive rates",
    description: "Fair, transparent pricing across air and sea freight.",
  },
  {
    icon: Globe2,
    title: "Reliable global partners",
    description: "A trusted network connecting Somalia with the world.",
  },
  {
    icon: Headset,
    title: "Professional support",
    description: "A responsive team ready to help you, around the clock.",
  },
  {
    icon: Radar,
    title: "Real-time tracking",
    description: "Follow your shipment live, from pickup to delivery.",
  },
];

export default function Home() {
  const { settings } = useSystemSettings();
  useDocumentTitle(
    `${settings.company_name} · Global Air & Sea Cargo and Logistics`,
    "FNS Cargo connects Somalia with the world through reliable air and sea freight, customs clearance, and door-to-door delivery to and from China, Turkey, Sweden, Finland, Norway, Denmark and beyond, with live shipment tracking.",
  );

  return (
    <div>
      {/* HERO — clean blue & white split layout. Extra bottom padding
          reserves room for the tracking widget rendered as a SIBLING below, so
          the section's overflow-hidden never clips the widget. */}
      <section className="relative overflow-hidden border-b border-steel-100 bg-white pb-24 pt-14 sm:pb-28 sm:pt-16">
        {" "}
        <div className="container-page relative">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-10">
            {/* Copy */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-badge border border-accent-100 bg-accent-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent-700">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
                Global air &amp; sea cargo solutions
              </span>
              <h1 className="mt-6 max-w-xl text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-navy-900 sm:text-4xl lg:text-5xl xl:text-[3.25rem]">
                Connecting Somalia with the world,{" "}
                <span className="text-accent-600">
                  tracked every step of the way
                </span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-steel-500 sm:text-lg">
                Reliable, fast, and secure cargo services between Somalia and
                China, Turkey, Sweden, Finland, Norway, Denmark, and beyond. Air
                and sea freight, customs, and door-to-door delivery, with your
                shipment trackable any time.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link to="/contact" className={`rounded-control ${FOCUS_RING}`}>
                  <Button
                    variant="accent"
                    size="lg"
                    icon={<ArrowRight className="h-4 w-4" />}
                    iconPosition="right"
                  >
                    Get a free quote
                  </Button>
                </Link>
                <Link
                  to="/tracking"
                  className={`rounded-control ${FOCUS_RING}`}
                >
                  <Button variant="secondary" size="lg">
                    Track my shipment
                  </Button>
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-steel-500">
                {[
                  "Air & sea freight",
                  "Customs handled",
                  "Door-to-door",
                  "Live tracking",
                ].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-accent-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Visual */}
            <div className="relative animate-fade-up lg:pl-6">
              <div className="absolute -left-5 top-8 flex items-center gap-3 rounded-2xl border border-steel-100 bg-white p-4 shadow-elevation-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600">
                  <Radar className="h-5 w-5" />
                </span>

                <div>
                  <p className="text-sm font-bold leading-tight text-navy-900">
                    Live tracking
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-steel-500">
                    Pickup to delivery
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-3xl border border-steel-100 shadow-elevation-3">
                <img
                  src={images.hero.main.src}
                  alt={images.hero.main.alt}
                  className="h-[24rem] w-full object-cover sm:h-[28rem] lg:h-[30rem]"
                  loading="eager"
                />
              </div>
              {/* Static credential card */}
              <div className="absolute -bottom-5 right-4 flex items-center gap-3 rounded-2xl border border-steel-100 bg-white p-4 shadow-elevation-2 sm:right-8">
                <span className=" font-tabular font-extrabold text-navy-900 flex h-9 w-9 items-center justify-center  text-xl  ">
                  7 +
                </span>
                <div>
                  <p className=" font-bold leading-tight text-navy-900 text-base">
                    Countries
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-steel-500">
                    Growing global network
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* SERVICES */}
      <section className="container-page py-16 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-600">
            What we do
          </p>
          <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">
            Our cargo &amp; logistics services
          </h2>
          <p className="mt-4 text-pretty text-steel-500">
            One team for the whole journey. We handle air and sea freight,
            customs, handling, and delivery, moving your goods between Somalia
            and the world.
          </p>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service, i) => (
            <Reveal
              as="div"
              key={service.title}
              delay={(i % 4) * 80}
              className="h-full"
            >
              <Link
                to={`/services#${service.anchor}`}
                className={`group flex h-full flex-col rounded-2xl border border-steel-100 bg-white p-6 shadow-elevation-1 transition-all duration-240 ease-out-premium hover:border-accent-200 hover:shadow-elevation-2 ${FOCUS_RING}`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors duration-240 group-hover:bg-accent-500 group-hover:text-white">
                  <service.icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-base font-bold text-navy-900">
                  {service.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-steel-500">
                  {service.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 transition-colors group-hover:text-accent-600">
                  Learn more <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* COUNTRIES WE SERVE */}
      <section className="border-y border-steel-100 bg-steel-50 py-16 sm:py-24">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">
              Where we ship
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold text-navy-900 sm:text-4xl">
              Countries we serve
            </h2>
            <p className="mt-4 text-pretty text-steel-500">
              We move cargo to and from Somalia across a growing global network,
              and we keep expanding it to serve you better.
            </p>
          </Reveal>

          <div className="mx-auto mt-12 grid max-w-5xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
            {COUNTRIES.map((country, i) => (
              <Reveal
                as="div"
                key={country.name}
                delay={i * 70}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-steel-100 bg-white p-5 text-center shadow-elevation-1 transition-all duration-240 ease-out-premium hover:-translate-y-1 hover:border-accent-200 hover:shadow-elevation-2"
              >
                <img
                  src={country.flag}
                  alt={`${country.name} flag`}
                  loading="lazy"
                  className="h-12 w-12 rounded-full border border-steel-200 object-cover shadow-elevation-1"
                />
                <span className="text-sm font-bold text-navy-900">
                  {country.name}
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="relative overflow-hidden bg-navy-900 py-16 text-white sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-route-dots bg-[size:22px_22px] opacity-[0.07]"
        />
        <div className="container-page relative">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-2 lg:items-center">
            <Reveal>
              <p className="text-sm font-bold uppercase tracking-wider text-accent-400">
                Why FNS Cargo
              </p>
              <h2 className="mt-3 text-balance text-3xl font-extrabold text-white sm:text-4xl">
                Shipping you don't have to worry about
              </h2>
              <p className="mt-4 max-w-lg text-pretty text-steel-300">
                Clear updates and careful handling aren't extras we charge for.
                They're simply part of how we work, and here's what that looks
                like for you.
              </p>
              <div className="mt-10 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2">
                {WHY_CHOOSE_US.map((item, i) => (
                  <Reveal
                    as="div"
                    key={item.title}
                    delay={i * 70}
                    className="group flex h-full gap-4"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-accent-400 transition-colors duration-240 group-hover:bg-accent-500 group-hover:text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-steel-300">
                        {item.description}
                      </p>
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
      <section className="container-page py-16 sm:py-24">
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
            <div className="absolute -bottom-6 -right-6 hidden w-56 rounded-2xl border border-steel-100 bg-white p-5 shadow-elevation-3 sm:block">
              <p className="font-tabular text-3xl font-extrabold text-navy-900">
                7+
              </p>
              <p className="mt-1 text-sm font-semibold leading-snug text-steel-500">
                Countries connected across our growing network
              </p>
            </div>
          </Reveal>
          <Reveal>
            <p className="text-sm font-bold uppercase tracking-wider text-accent-600">
              Who we are
            </p>
            <h2 className="mt-3 text-balance text-3xl font-extrabold sm:text-4xl">
              Your trusted partner for global cargo
            </h2>
            <p className="mt-4 text-pretty leading-relaxed text-steel-500">
              FNS Cargo is a professional logistics and cargo company based in
              Somalia. We provide reliable air and sea freight, customs
              clearance, and door-to-door delivery, connecting businesses and
              individuals with global markets through trusted partnerships,
              modern systems, and excellent customer service.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Trusted global partnerships and modern systems",
                "Air, sea, customs, and delivery under one roof",
                "Honest updates and live tracking, pickup to delivery",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm text-navy-700"
                >
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
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-yellow-700 py-16 text-white sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-yellow/10 yellow-3xl"
        />
        <Reveal className="container-page relative flex flex-col items-center gap-6 text-center">
          <h2 className="max-w-xl text-balance text-3xl font-extrabold text-white sm:text-4xl">
            Need help or want to ship cargo?
          </h2>
          <p className="max-w-lg text-pretty text-white/85">
            Our team is ready to support you 24/7. Get a free quote, ask a
            question, or track a shipment that's already on its way.
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
  );
}
