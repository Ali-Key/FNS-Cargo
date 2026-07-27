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
  { to: '/tracking', label: 'Track a Shipment' },
  { to: '/contact', label: 'Contact' },
]

export function Footer() {
  const { settings } = useSystemSettings()
  const year = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden bg-navy-950 text-steel-300">
      <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-40" />
      <div className="container-page relative py-16">
        <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo companyName={settings.company_name} variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-steel-400">
              Connecting Somalia with the world through reliable, fast, and secure cargo services — and letting
              you follow every shipment from pickup right to your door.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[Facebook, Twitter, Linkedin].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-steel-300 transition-all duration-180 ease-out-premium hover:-translate-y-0.5 hover:border-accent-500/50 hover:bg-white/5 hover:text-accent-400"
                  aria-label="Social media link"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wide text-white">Services</h4>
            <ul className="mt-4 space-y-3">
              {SERVICE_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-steel-400 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wide text-white">Company</h4>
            <ul className="mt-4 space-y-3">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-sm text-steel-400 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wide text-white">Reach us</h4>
            <ul className="mt-4 space-y-3.5 text-sm text-steel-400">
              <li className="flex items-start gap-2.5">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
                <span>{settings.company_address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`tel:${settings.company_phone}`} className="hover:text-white">
                  {settings.company_phone}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="h-4 w-4 shrink-0 text-accent-400" />
                <a href={`mailto:${settings.company_email}`} className="hover:text-white">
                  {settings.company_email}
                </a>
              </li>
              {settings.company_website && (
                <li className="flex items-center gap-2.5">
                  <Globe className="h-4 w-4 shrink-0 text-accent-400" />
                  <span>{settings.company_website.replace(/^https?:\/\//, '')}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-steel-500">
            &copy; {year} {settings.company_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-steel-500">
            <Link to="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
