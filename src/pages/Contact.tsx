import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, Phone, MapPin, Send, Clock, CheckCircle2 } from "lucide-react";

import { Button, Input, Textarea, Select, Alert } from "@/components/ui";

import { useSystemSettings } from "@/hooks/useSystemSettings";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/context/ToastContext";
import { submitQuote } from "@/services/quotesService";
import { CARGO_TYPES } from "@/types";

/* =========================================================
   WHATSAPP ICON
========================================================= */

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.19h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 19 4.9 9.79 9.79 0 0 0 12.04 2Zm0 1.94a7.9 7.9 0 0 1 7.92 7.92 7.9 7.9 0 0 1-11.95 6.8l-.38-.23-3.17.83.85-3.1-.25-.4a7.86 7.86 0 0 1-1.21-4.2 7.9 7.9 0 0 1 7.9-7.92Zm-3.4 4.2c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03 0 1.19.87 2.35.99 2.51.12.16 1.7 2.6 4.12 3.55 2.02.79 2.43.63 2.87.59.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.3-.74-1.78-.19-.46-.39-.4-.54-.4l-.46-.01Z" />
    </svg>
  );
}

/* =========================================================
   FORM VALIDATION
========================================================= */

const contactSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "That name is too long"),

  email: z
    .string()
    .trim()
    .min(1, "Enter your email")
    .email("Enter a valid email address"),

  phone: z
    .string()
    .trim()
    .max(32, "That number is too long")
    .optional()
    .or(z.literal("")),

  origin: z.string().trim().min(2, "Enter the collection country or city"),

  destination: z.string().trim().min(2, "Enter the delivery country or city"),

  cargoType: z.enum(CARGO_TYPES),

  weight: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) > 0), {
      message: "Enter the weight in kilograms",
    }),

  message: z
    .string()
    .trim()
    .max(2000, "Please keep this under 2000 characters")
    .optional()
    .or(z.literal("")),
});

type ContactForm = z.infer<typeof contactSchema>;

const CARGO_OPTIONS = CARGO_TYPES.map((type) => ({
  value: type,
  label: type,
}));

/* =========================================================
   CONTACT PAGE
========================================================= */

export default function Contact() {
  const { settings } = useSystemSettings();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);

  useDocumentTitle(
    "Contact Us | FSN Cargo",
    "Request a freight quote or contact the FSN Cargo team about air freight, sea freight, customs clearance, and door-to-door delivery.",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      cargoType: "General Goods",
    },
  });

  async function onSubmit(data: ContactForm) {
    try {
      await submitQuote({
        full_name: data.fullName,
        email: data.email,
        phone: data.phone || null,
        origin: data.origin,
        destination: data.destination,
        cargo_type: data.cargoType,
        weight: data.weight ? Number(data.weight) : null,
        message: data.message || null,
      });

      setSubmitted(true);

      reset({
        cargoType: "General Goods",
      });

      toast.success(
        "Request received",
        "Our team will respond with a quote within one working day.",
      );
    } catch {
      toast.error(
        "Could not send your request",
        `Please try again, or email us directly at ${settings.company_email}.`,
      );
    }
  }

  return (
    <div className="bg-surface">
      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-wider text-primary-400">
            Contact Us
          </p>

          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-white sm:text-5xl">
            Let's talk about your shipment
          </h1>

          <p className="mt-4 max-w-xl text-secondary">
            Need a quote, got a question about a shipment that's on its way, or
            just want to plan ahead? Drop us a line. We're happy to help.
          </p>
        </div>
      </section>

      {/* =====================================================
          CONTACT + FORM
      ===================================================== */}

      <section className="container-page py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* =================================================
              CONTACT CARD
          ================================================= */}

          <aside className="lg:col-span-4">
            <div className="sticky top-8 rounded-3xl border border-border bg-white p-7 shadow-elevation-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-500">
                  Get in touch
                </p>

                <h2 className="mt-3 text-2xl font-extrabold text-navy-900">
                  We're here to help
                </h2>

                <p className="mt-3 text-sm leading-relaxed text-secondary">
                  Need shipping support, tracking assistance, or logistics
                  advice? Our team is ready.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {/* ADDRESS */}
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <MapPin className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                      Office
                    </p>

                    <p className="mt-1 text-sm text-steel-600">
                      {settings.company_address}
                    </p>
                  </div>
                </div>
                {/* PHONE */}
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <Phone className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                      Phone
                    </p>

                    <a
                      href={`tel:${settings.company_phone.replace(/\s/g, "")}`}
                      className="mt-1 block text-sm font-semibold text-navy-900 transition-colors hover:text-primary-500"
                    >
                      {settings.company_phone}
                    </a>
                  </div>
                </div>
                {/* WhatsApp */}
                <div className="flex gap-4">
                  {/* Icon */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <WhatsAppIcon className="h-5 w-5" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                      WhatsApp
                    </p>

                    <a
                      href={`https://wa.me/${settings.company_phone.replace(/[^\d]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Chat with ${settings.company_name} on WhatsApp`}
                      className="mt-1 inline-block text-sm font-semibold text-navy-900 transition-colors duration-180 hover:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                    >
                      {settings.company_phone}
                    </a>
                  </div>
                </div>

                {/* EMAIL */}
                <div className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
                    <Mail className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                      Email
                    </p>

                    <a
                      href={`mailto:${settings.company_email}`}
                      className="mt-1 block break-all text-sm font-semibold text-navy-900 transition-colors hover:text-primary-500"
                    >
                      {settings.company_email}
                    </a>
                  </div>
                </div>
                {/* RESPONSE */}
                <div className="rounded-2xl bg-primary-50 p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary-500" />

                    <p className="text-sm font-bold text-navy-900">
                      Fast response
                    </p>
                  </div>

                  <p className="mt-2 text-sm text-secondary">
                    24/7 support for active shipments. 
                  </p>
                   <p className="mt-0 text-sm text-secondary">
                    
                    Sat–Thu, 8 AM–6 PM (EAT).
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* =================================================
              FORM CARD
          ================================================= */}

          <div className="lg:col-span-8">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-elevation-2 sm:p-10">
              <div className="mb-8">
                <p className="text-xs font-bold uppercase tracking-wider text-primary-500">
                  Shipping information
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-navy-900">
                  Tell us about your shipment
                </h2>

                <p className="mt-2 text-sm text-secondary">
                  Provide your cargo details and we will prepare the best
                  shipping solution.
                </p>
              </div>

              {/* SUCCESS MESSAGE */}
              {submitted && (
                <Alert
                  variant="success"
                  className="mb-6"
                  title="Request received"
                >
                  <span className="inline-flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" />
                    Our logistics team will contact you with your quotation.
                  </span>
                </Alert>
              )}

              {/* FORM */}
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Full name"
                    placeholder="John Doe"
                    error={errors.fullName?.message}
                    {...register("fullName")}
                  />

                  <Input
                    label="Email"
                    type="email"
                    placeholder="you@company.com"
                    error={errors.email?.message}
                    {...register("email")}
                  />

                  <Input
                    label="Phone"
                    placeholder="+252 61 xxxxx"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />

                  <Select
                    label="Cargo type"
                    options={CARGO_OPTIONS}
                    error={errors.cargoType?.message}
                    {...register("cargoType")}
                  />

                  <Input
                    label="Collection from"
                    placeholder="Guangzhou, China"
                    error={errors.origin?.message}
                    {...register("origin")}
                  />

                  <Input
                    label="Delivery to"
                    placeholder="Mogadishu, Somalia"
                    error={errors.destination?.message}
                    {...register("destination")}
                  />
                </div>

                <Input
                  label="Approximate weight (kg)"
                  placeholder="250"
                  error={errors.weight?.message}
                  {...register("weight")}
                />

                <Textarea
                  label="Additional details"
                  placeholder="Cartons, dimensions, delivery requirements..."
                  rows={5}
                  error={errors.message?.message}
                  {...register("message")}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={isSubmitting}
                  icon={<Send className="h-4 w-4 text-white" />}
                >
                  Send quote request
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
