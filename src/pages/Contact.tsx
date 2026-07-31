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

const CARGO_OPTIONS = CARGO_TYPES.map((type) => ({ value: type, label: type }));

export default function Contact() {
  const { settings } = useSystemSettings();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);

  useDocumentTitle(
    "Contact Us | FNS Cargo",
    "Request a freight quote or contact the FNS Cargo team about air freight, sea freight, customs clearance, and door-to-door delivery.",
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: { cargoType: "General Goods" },
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
      reset({ cargoType: "General Goods" });
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
    <div className="bg-steel-50/40">
      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="container-page">
          <p className="text-sm font-bold uppercase tracking-wider text-accent-400">
            Contact Us
          </p>

          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold text-white sm:text-5xl">
            Let's talk about your shipment
          </h1>

          <p className="mt-4 max-w-xl text-steel-300">
            Need a quote, got a question about a shipment that's on its way, or
            just want to plan ahead? Drop us a line. We're happy to help.
          </p>
        </div>
      </section>

      {/* CONTACT + FORM */}
      <section className="container-page py-16 sm:py-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* CONTACT CARD */}
          <aside className="lg:col-span-4">
            <div
              className="
            sticky top-8
            rounded-3xl
            border border-steel-100
            bg-white
            p-7
            shadow-elevation-2
          "
            >
              <div>
                <p
                  className="
                text-xs
                font-bold
                uppercase
                tracking-[0.15em]
                text-accent-600
              "
                >
                  Get in touch
                </p>

                <h2
                  className="
                mt-3
                text-2xl
                font-extrabold
                text-navy-900
              "
                >
                  We're here to help
                </h2>

                <p
                  className="
                mt-3
                text-sm
                leading-relaxed
                text-steel-500
              "
                >
                  Need shipping support, tracking assistance, or logistics
                  advice? Our team is ready.
                </p>
              </div>

              <div className="mt-8 space-y-6">
                {/* Address */}
                <div className="flex gap-4">
                  <div
                    className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-accent-50
                  text-accent-600
                "
                  >
                    <MapPin className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-steel-400">
                      Office
                    </p>

                    <p className="mt-1 text-sm text-steel-600">
                      {settings.company_address}
                    </p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex gap-4">
                  <div
                    className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-accent-50
                  text-accent-600
                "
                  >
                    <Phone className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-steel-400">
                      Phone
                    </p>

                    <a
                      href={`tel:${settings.company_phone.replace(/\s/g, "")}`}
                      className="
                      mt-1 block
                      text-sm
                      font-semibold
                      text-navy-900
                      hover:text-accent-600
                    "
                    >
                      {settings.company_phone}
                    </a>
                  </div>
                </div>



                {/* Email */}
                <div className="flex gap-4">
                  <div
                    className="
                  flex h-11 w-11 shrink-0
                  items-center justify-center
                  rounded-xl
                  bg-accent-50
                  text-accent-600
                "
                  >
                    <Mail className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase text-steel-400">
                      Email
                    </p>

                    <a
                      href={`mailto:${settings.company_email}`}
                      className="
                      mt-1 block break-all
                      text-sm
                      font-semibold
                      text-navy-900
                      hover:text-accent-600
                    "
                    >
                      {settings.company_email}
                    </a>
                  </div>
                </div>

                {/* Response */}
                <div
                  className="
                rounded-2xl
                bg-navy-50
                p-4
              "
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-accent-600" />

                    <p
                      className="
                    text-sm
                    font-bold
                    text-navy-900
                  "
                    >
                      Fast response
                    </p>
                  </div>

                  <p
                    className="
                  mt-2
                  text-sm
                  text-steel-600
                "
                  >
                    Within one working day. 24/7 support for active shipments.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* FORM CARD */}
          <div className="lg:col-span-8">
            <div
              className="
            rounded-3xl
            border border-steel-100
            bg-white
            p-6
            shadow-elevation-2
            sm:p-10
          "
            >
              <div className="mb-8">
                <p
                  className="
                text-xs
                font-bold
                uppercase
                tracking-wider
                text-accent-600
              "
                >
                  Shipping information
                </p>

                <h2
                  className="
                mt-2
                text-2xl
                font-extrabold
                text-navy-900
              "
                >
                  Tell us about your shipment
                </h2>

                <p
                  className="
                mt-2
                text-sm
                text-steel-500
              "
                >
                  Provide your cargo details and we will prepare the best
                  shipping solution.
                </p>
              </div>

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

              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-6"
                noValidate
              >
                <div
                  className="
                grid
                gap-5
                sm:grid-cols-2
              "
                >
                  <Input
                    label="Full name"
                    placeholder="Ali Omar"
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
                    placeholder="+252 61 1189286"
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
                  variant="accent"
                  size="lg"
                  className="w-full sm:w-auto"
                  loading={isSubmitting}
                  icon={<Send className="h-4 w-4" />}
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
