import { Link } from "react-router-dom";
import {
  Plane,
  Ship,
  Boxes,
  Truck,
  FileCheck2,
  Warehouse,
  Car,
  FileText,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui";
import { PageHero } from "@/components/common/PageHero";
import { Reveal } from "@/components/common/Reveal";
import { images } from "@/config/images";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

// Shared focus-visible treatment for bare links (keyboard accessibility).
const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2";

const SERVICES = [
  {
    id: "air",
    icon: Plane,
    title: "Air Freight",
    tagline: "Scheduled and express air cargo",
    description:
      "Air freight moves urgent restocks, high-value goods, and documents in days rather than weeks. We book capacity with established airline partners and arrange priority handling at both origin and destination.",
    points: [
      "Priority acceptance and handling at both airports",
      "Suited to urgent, high-value, or fragile consignments",
      "Transit times measured in days, not weeks",
    ],
    image: images.services.air,
  },
  {
    id: "sea",
    icon: Ship,
    title: "Sea Freight",
    tagline: "Full and shared container shipping",
    description:
      "Sea freight offers the lowest cost per unit for high-volume cargo. Book a full container (FCL) or share space in a consolidated load (LCL). We manage the port formalities at both ends.",
    points: [
      "FCL and LCL options to match your volume",
      "Best value for large or non-urgent shipments",
      "Port handling and terminal charges coordinated for you",
    ],
    image: images.services.sea,
  },
  {
    id: "commercial",
    icon: Boxes,
    title: "Commercial Cargo",
    tagline: "General and project cargo for business",
    description:
      "From retail stock to plant and equipment, we handle commercial consignments at any scale. We recommend the right mix of air and sea to balance your delivery deadline against cost.",
    points: [
      "Managed end to end regardless of volume",
      "Routing planned around your deadline and budget",
      "A single named coordinator for your account",
    ],
    image: images.warehouseDetail,
  },
  {
    id: "door-to-door",
    icon: Truck,
    title: "Door-to-Door Delivery",
    tagline: "Collection through to final delivery",
    description:
      "We arrange collection at origin and final delivery at destination, so the first and last mile are covered under the same booking. Delivery is scheduled around the arrival of your cargo.",
    points: [
      "Collection and final delivery arranged as one service",
      "From supplier premises through to your address",
      "Every leg coordinated by the same team",
    ],
    image: images.services.road,
  },
  {
    id: "customs",
    icon: FileCheck2,
    title: "Customs Clearance",
    tagline: "Import and export declarations",
    description:
      "Incorrect or incomplete documentation is the most common cause of delay. Our team prepares and checks declarations, assesses duty, and manages clearance at both origin and destination.",
    points: [
      "Declarations prepared, checked, and lodged",
      "Clear guidance on the documents required",
      "Status reported at each stage of clearance",
    ],
    image: images.services.customs,
  },
  {
    id: "airport",
    icon: Warehouse,
    title: "Warehousing and Airport Handling",
    tagline: "Secure storage and cargo handling",
    description:
      "We manage acceptance, storage, consolidation, and loading at major airports and at our own facilities, keeping cargo secure between legs of its journey.",
    points: [
      "Short and long-term storage available",
      "Secure acceptance, consolidation, and loading",
      "Coordinated directly with your freight booking",
    ],
    image: images.services.airDetail,
  },
  {
    id: "vehicle",
    icon: Car,
    title: "Vehicle Shipping",
    tagline: "Cars, commercial vehicles, and machinery",
    description:
      "Vehicles and heavy machinery require specific loading equipment and documentation. We arrange securing, shipping, and all associated paperwork by container or roll-on service.",
    points: [
      "Cars, commercial vehicles, and heavy equipment",
      "Professionally loaded, secured, and documented",
      "Shipped by sea or air according to requirement",
    ],
    image: images.operationsFloor,
  },
  {
    id: "import-export",
    icon: FileText,
    title: "Import and Export Support",
    tagline: "Documentation and trade advisory",
    description:
      "For first-time importers and established traders alike, we advise on documentation, compliance obligations, and the most suitable shipping method for the goods being moved.",
    points: [
      "Documentation prepared and verified",
      "Practical guidance on regulations and requirements",
      "Support from first enquiry through to final delivery",
    ],
    image: images.about.secondary,
  },
];

export default function Services() {
  useDocumentTitle(
    "Freight Services | FSN Cargo",
    "Air freight, sea freight, customs clearance, warehousing, vehicle shipping, and door-to-door delivery connecting Somalia with international markets.",
  );

  return (
    <div>
      <PageHero
        eyebrow="What we do"
        title="Freight and logistics services"
        description="Air freight, sea freight, commercial cargo, customs clearance, warehousing, vehicle shipping, and door-to-door delivery, connecting Somalia with international markets under one account."
      />

      <div className="container-page divide-y divide-steel-100">
        {SERVICES.map((service, index) => (
          <section
            id={service.id}
            key={service.id}
            className="scroll-mt-24 py-16 sm:py-20"
          >
            <div
              className={`grid grid-cols-1 items-center gap-10 lg:grid-cols-2 ${
                index % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <Reveal className="overflow-hidden rounded-card border border-gray-200">
                <img
                  src={service.image.src}
                  alt={service.image.alt}
                  width={1200}
                  height={800}
                  className="h-72 w-full object-cover sm:h-96"
                  loading="lazy"
                  decoding="async"
                />
              </Reveal>
              <Reveal delay={90}>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary-200 bg-primary-50">
                  {" "}
                  <service.icon
                    className="h-6 w-6  text-primary-600"
                    strokeWidth={1.75}
                  />
                </div>
                <h2 className="mt-5 text-balance text-2xl font-extrabold text-navy-900 sm:text-3xl">
                  {service.title}
                </h2>
                <p className="mt-1.5 text-sm font-bold uppercase tracking-[0.1em] text-primary-600">
                  {service.tagline}
                </p>
                <p className="mt-4 text-pretty leading-relaxed text-text-secondary">
                  {service.description}
                </p>
                <ul className="mt-6 space-y-3 border-t border-gray-200 pt-5">
                  {service.points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2.5 text-sm leading-relaxed text-navy-800"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </section>
        ))}
      </div>

      <section className="border-t border-gray-200   container-page py-16 text-center sm:py-20">
        <h2 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">
          Not sure which service you need?
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-text-secondary">
          Send us your cargo details and required delivery date. We will
          recommend the most suitable routing and quote accordingly.
        </p>

        <div className=" flex flex-col items-center gap-4 sm:flex-row sm:justify-center ">
          <Link
            to="/contact"
            className={`rounded-control mt-10  inline-block3 text-white      ${FOCUS_RING}`}
          >
            <Button
              variant="primary"
              size="lg"
              icon={<ArrowRight className="h-4 w-4" strokeWidth={2.5} />}
              iconPosition="right"
              className="text-white"
            >
              Request a quote
            </Button>
          </Link>
          <Link
            to="/tracking"
            className={`rounded-control  mt-10   ${FOCUS_RING}`}
          >
            <Button variant="secondary" size="lg">
              Track a shipment
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
