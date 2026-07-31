import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Globe, Facebook, Linkedin, Twitter } from 'lucide-react'
import { Logo } from './Logo'
import { useSystemSettings } from '@/hooks/useSystemSettings'

const SERVICE_LINKS = [
  { to: '/services#air', label: 'Air Freight' },
  { to: '/services#sea', label: 'Sea Freight' },
  { to: '/services#commercial', label: 'Commercial Cargo' },
  { to: '/services#door-to-door', label: 'Door-to-Door Delivery' },
  { to: '/services#customs', label: 'Customs Clearance' },
  { to: '/services#vehicle', label: 'Vehicle Shipping' },
  { to: '/services#import-export', label: 'Import & Export' },
]

const COMPANY_LINKS = [
  { to: '/about', label: 'About Us' },
  { to: '/contact', label: 'Contact' },
  { to: '/tracking', label: 'Track Shipment' },
]

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
]

const SOCIAL_LINKS = [
  { Icon: Facebook, label: 'Facebook' },
  { Icon: Twitter, label: 'X (Twitter)' },
  { Icon: Linkedin, label: 'LinkedIn' },
]

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-950'
const linkClass = `rounded-control text-sm text-steel-400 transition-colors duration-180 ease-out-premium hover:text-white ${focusRing}`
const headingClass = 'font-display text-xs font-bold uppercase tracking-[0.14em] text-accent-100'

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2C6.6 2 2.18 6.42 2.18 11.86c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.19h.01c5.43 0 9.85-4.42 9.85-9.86A9.79 9.79 0 0 0 19 4.9 9.79 9.79 0 0 0 12.04 2Zm0 1.94a7.9 7.9 0 0 1 7.92 7.92 7.92 7.92 0 0 1-11.95 6.8l-.38-.23-3.17.83.85-3.1-.25-.4a7.86 7.86 0 0 1-1.21-4.2 7.9 7.9 0 0 1 7.9-7.92Zm-3.4 4.2c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03 0 1.19.87 2.35.99 2.51.12.16 1.7 2.6 4.12 3.55 2.02.79 2.43.63 2.87.59.44-.04 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.53-1.3-.74-1.78-.19-.46-.39-.4-.54-.4l-.46-.01Z" />
    </svg>
  )
}

export function Footer() {
  const { settings } = useSystemSettings()
  const year = new Date().getFullYear()
  const whatsappNumber = settings.company_phone.replace(/[^\d]/g, '')

  return (
    <footer className="border-t border-white/10 bg-navy-950 text-steel-300">
      <div className="container-page py-16 lg:py-20">
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <Logo companyName={settings.company_name} variant="light" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-steel-400">
              Connecting Somalia with the world through reliable, fast, and secure cargo services, and letting
              you follow every shipment from pickup right to your door.
            </p>
            <div className="mt-7">
              <p className={headingClass}>Follow us</p>
              <div className="mt-3 flex items-center gap-2.5">
                {SOCIAL_LINKS.map(({ Icon, label }) => (
                  <a
                    key={label}
                    href="#"
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-steel-300 transition-colors duration-180 ease-out-premium hover:border-accent-500/50 hover:bg-white/5 hover:text-accent-400 ${focusRing}`}
                    aria-label={`${settings.company_name} on ${label}`}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <h4 className={headingClass}>Company</h4>
            <ul className="mt-5 space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className={headingClass}>Services</h4>
            <ul className="mt-5 space-y-3">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={linkClass}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <h4 className={headingClass}>Contact</h4>
            <ul className="mt-5 space-y-4 text-sm text-steel-400">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span className="leading-relaxed">{settings.company_address}</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <a href={`tel:${settings.company_phone}`} className={`rounded-control transition-colors hover:text-white ${focusRing}`}>
                  {settings.company_phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <a
                  href={`mailto:${settings.company_email}`}
                  className={`rounded-control break-all transition-colors hover:text-white ${focusRing}`}
                >
                  {settings.company_email}
                </a>
              </li>
              {settings.company_website && (
                <li className="flex items-start gap-3">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                  <span>{settings.company_website.replace(/^https?:\/\//, '')}</span>
                </li>
              )}
            </ul>
            {whatsappNumber && (
              <a
                href={`https://wa.me/+252611189286`}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-6 inline-flex items-center gap-2.5 rounded-control border border-accent-500/40 px-4 py-2.5 text-sm font-semibold text-accent-100 transition-colors duration-180 ease-out-premium hover:border-accent-400 hover:bg-accent-500/10 hover:text-accent-25 ${focusRing}`}
              >
                <WhatsAppIcon className="h-4 w-4" />
                Chat on WhatsApp
              </a>
            )}
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-steel-500 sm:flex-row lg:mt-16">
          <p>
            &copy; {year} {settings.company_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-control transition-colors hover:text-white ${focusRing}`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
