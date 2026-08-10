import {
  Boxes,
  Car,
  FileCheck2,
  FileText,
  Globe2,
  Headset,
  Plane,
  Radar,
  ShieldCheck,
  Ship,
  Tag,
  Timer,
  Truck,
  Warehouse,
  type LucideIcon,
} from 'lucide-react'
import { images } from '@/config/images'

/**
 * The public site's copy.
 *
 * The home page and the services page both list what FNS Cargo does, and when
 * the two lists lived inside their own components they drifted: the same
 * service was "Airport Cargo Handling" on one page and "Warehousing and
 * Airport Handling" on the other. One list, rendered two ways.
 *
 * Contact details are deliberately absent — those come from `system_settings`
 * in Supabase via `useSystemSettings`, so the office can change a phone number
 * without a deploy.
 */

export interface Service {
  id: string
  icon: LucideIcon
  title: string
  /** One line, for the home page grid. */
  summary: string
  /** The sub-title on the services page. */
  tagline: string
  /** The full paragraph on the services page. */
  description: string
  points: string[]
  image: { src: string; alt: string }
}

export const SERVICES: Service[] = [
  {
    id: 'air',
    icon: Plane,
    title: 'Air Freight',
    summary: 'Fast, reliable air cargo for urgent and high-value shipments.',
    tagline: 'Scheduled and express air cargo',
    description:
      'Air freight moves urgent restocks, high-value goods, and documents in days rather than weeks. We book capacity with established airline partners and arrange priority handling at both origin and destination.',
    points: [
      'Priority acceptance and handling at both airports',
      'Suited to urgent, high-value, or fragile consignments',
      'Transit times measured in days, not weeks',
    ],
    image: images.services.air,
  },
  {
    id: 'sea',
    icon: Ship,
    title: 'Sea Freight',
    summary: 'Cost-effective sea shipping for larger loads, full or shared containers.',
    tagline: 'Full and shared container shipping',
    description:
      'Sea freight offers the lowest cost per unit for high-volume cargo. Book a full container (FCL) or share space in a consolidated load (LCL). We manage the port formalities at both ends.',
    points: [
      'FCL and LCL options to match your volume',
      'Best value for large or non-urgent shipments',
      'Port handling and terminal charges coordinated for you',
    ],
    image: images.services.sea,
  },
  {
    id: 'commercial',
    icon: Boxes,
    title: 'Commercial Cargo',
    summary: 'General cargo and business shipments handled from start to finish.',
    tagline: 'General and project cargo for business',
    description:
      'From retail stock to plant and equipment, we handle commercial consignments at any scale. We recommend the right mix of air and sea to balance your delivery deadline against cost.',
    points: [
      'Managed end to end regardless of volume',
      'Routing planned around your deadline and budget',
      'A single named coordinator for your account',
    ],
    image: images.warehouseDetail,
  },
  {
    id: 'door-to-door',
    icon: Truck,
    title: 'Door-to-Door Delivery',
    summary: 'Collection at origin and safe delivery right to the destination address.',
    tagline: 'Collection through to final delivery',
    description:
      'We arrange collection at origin and final delivery at destination, so the first and last mile are covered under the same booking. Delivery is scheduled around the arrival of your cargo.',
    points: [
      'Collection and final delivery arranged as one service',
      'From supplier premises through to your address',
      'Every leg coordinated by the same team',
    ],
    image: images.services.road,
  },
  {
    id: 'customs',
    icon: FileCheck2,
    title: 'Customs Clearance',
    summary: 'Import and export declarations prepared and cleared at both ends.',
    tagline: 'Import and export declarations',
    description:
      'Incorrect or incomplete documentation is the most common cause of delay. Our team prepares and checks declarations, assesses duty, and manages clearance at both origin and destination.',
    points: [
      'Declarations prepared, checked, and lodged',
      'Clear guidance on the documents required',
      'Status reported at each stage of clearance',
    ],
    image: images.services.customs,
  },
  {
    id: 'airport',
    icon: Warehouse,
    title: 'Warehousing and Airport Handling',
    summary: 'Secure storage and professional cargo handling at major airports.',
    tagline: 'Secure storage and cargo handling',
    description:
      'We manage acceptance, storage, consolidation, and loading at major airports and at our own facilities, keeping cargo secure between legs of its journey.',
    points: [
      'Short and long-term storage available',
      'Secure acceptance, consolidation, and loading',
      'Coordinated directly with your freight booking',
    ],
    image: images.services.airDetail,
  },
  {
    id: 'vehicle',
    icon: Car,
    title: 'Vehicle Shipping',
    summary: 'Cars, commercial vehicles, and heavy machinery shipped securely.',
    tagline: 'Cars, commercial vehicles, and machinery',
    description:
      'Vehicles and heavy machinery require specific loading equipment and documentation. We arrange securing, shipping, and all associated paperwork by container or roll-on service.',
    points: [
      'Cars, commercial vehicles, and heavy equipment',
      'Professionally loaded, secured, and documented',
      'Shipped by sea or air according to requirement',
    ],
    image: images.operationsFloor,
  },
  {
    id: 'import-export',
    icon: FileText,
    title: 'Import and Export Support',
    summary: 'Documentation, compliance, and trade advice made simple.',
    tagline: 'Documentation and trade advisory',
    description:
      'For first-time importers and established traders alike, we advise on documentation, compliance obligations, and the most suitable shipping method for the goods being moved.',
    points: [
      'Documentation prepared and verified',
      'Practical guidance on regulations and requirements',
      'Support from first enquiry through to final delivery',
    ],
    image: images.about.secondary,
  },
]

export const COUNTRIES = [
  { name: 'Somalia', code: 'so' },
  { name: 'China', code: 'cn' },
  { name: 'Turkey', code: 'tr' },
  { name: 'Sweden', code: 'se' },
  { name: 'Finland', code: 'fi' },
  { name: 'Norway', code: 'no' },
  { name: 'Denmark', code: 'dk' },
]

export const flagUrl = (code: string) => `https://flagcdn.com/w160/${code}.png`

export const WHY_CHOOSE_US: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Timer,
    title: 'Fast and on-time delivery',
    description: 'We plan the quickest sensible route so your cargo arrives when promised.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure and safe handling',
    description: 'Careful packing, storage, and handling at every stop along the way.',
  },
  {
    icon: Tag,
    title: 'Competitive rates',
    description: 'Fair, transparent pricing across air and sea freight.',
  },
  {
    icon: Globe2,
    title: 'Reliable global partners',
    description: 'A trusted network connecting Somalia with the world.',
  },
  {
    icon: Headset,
    title: 'Professional support',
    description: 'A responsive team ready to help you, around the clock.',
  },
  {
    icon: Radar,
    title: 'Real-time tracking',
    description: 'Follow your shipment live, from pickup to delivery.',
  },
]

export const STATS = [
  { value: '5,000+', label: 'Shipments delivered' },
  { value: '7', label: 'Countries connected' },
  { value: '10+', label: 'Airline and carrier partners' },
  { value: '24/7', label: 'Operations support' },
]

export const PRINCIPLES = [
  {
    title: 'Proactive communication',
    description:
      'You receive status updates as they happen. When a schedule changes, we tell you before you have to ask.',
  },
  {
    title: 'One accountable team',
    description:
      'Freight, customs, handling, and final delivery are planned together and managed by a single coordinator.',
  },
  {
    title: 'An established network',
    description:
      'Long-standing carrier and agent relationships on every lane mean fewer exceptions and shorter delays.',
  },
]

/** The promises repeated under the hero. Four, because five wraps awkwardly. */
export const HERO_ASSURANCES = [
  'Air and sea freight',
  'Customs handled',
  'Door-to-door',
  'Live tracking',
]

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/tracking', label: 'Tracking' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export const FOOTER_LINKS = {
  services: SERVICES.slice(0, 5).map((s) => ({ to: `/services#${s.id}`, label: s.title })),
  company: [
    { to: '/about', label: 'About us' },
    { to: '/services', label: 'Services' },
    { to: '/tracking', label: 'Track a shipment' },
    { to: '/contact', label: 'Contact' },
  ],
  legal: [
    { to: '/privacy', label: 'Privacy policy' },
    { to: '/terms', label: 'Terms of service' },
  ],
}

export const COMPANY_BLURB =
  'FNS Cargo is a logistics and freight forwarding company based in Somalia, moving air and sea cargo between Somalia and international markets with customs clearance, warehousing, and door-to-door delivery.'
