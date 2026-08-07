import { Link } from "react-router-dom";
import { PackageSearch, ShieldCheck, Clock, MessageCircle } from "lucide-react";
import { TrackingWidget } from "@/components/tracking/TrackingWidget";
import { PageHero } from "@/components/common/PageHero";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const HELP_POINTS = [
  {
    icon: PackageSearch,
    title: "Finding your tracking number",
    description:
      "Your tracking number appears on the booking confirmation we issued. It follows the format FNS-CN-XXXXXXXX.",
  },
  {
    icon: Clock,
    title: "How often the status updates",
    description:
      "Each scan event is published as it is recorded, covering collection, departure, arrival, clearance, and delivery.",
  },
  {
    icon: ShieldCheck,
    title: "What tracking shows",
    description:
      "Public tracking returns the route, status, and event history only. Names, addresses, and billing details are never exposed.",
  },
  {
    icon: MessageCircle,
    title: "If your shipment is not listed",
    description:
      "Newly booked consignments can take a short time to appear. Contact our team and we will confirm the status directly.",
  },
];

export default function Tracking() {
  useDocumentTitle(
    "Track Your Shipment | FNS Cargo",
    "Enter your FNS Cargo tracking number to view the current status, route, estimated delivery date, and full event history for your shipment.",
  );

  return (
    <div>
      <PageHero
        eyebrow="Shipment tracking"
        title="Track your shipment"
        description="Enter your tracking number to view the current status, route, estimated delivery date, and complete event history."
        align="center"
      />

      <section className="container-page -mt-10 pb-16 sm:-mt-14 sm:pb-20">
        <div className="mx-auto max-w-3xl">
          <TrackingWidget elevated />
        </div>
      </section>

      <section className="border-t border-gray-200 bg-surface py-16 sm:py-20">
        <div className="container-page">
          <h2 className="text-balance text-center text-2xl font-extrabold text-navy-900 sm:text-3xl">
            Tracking questions
          </h2>

          <dl className="mx-auto mt-12 grid max-w-4xl gap-x-12 gap-y-10 sm:grid-cols-2">
            {HELP_POINTS.map((point) => (
              <div key={point.title} className="flex gap-4">
                <point.icon
                  className="h-5 w-5 shrink-0 text-primary-600"
                  strokeWidth={1.75}
                />
                <div>
                  <dt className="font-bold text-navy-900">{point.title}</dt>
                  <dd className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {point.description}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <p className="mt-12 text-center text-sm text-text-secondary">
            Still need help?{" "}
            <Link
              to="/contact"
              className="font-bold text-navy-800 underline underline-offset-4 transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Contact our operations team
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
