import type { ElementType, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/utils/cn'

/**
 * The public site's one surface.
 *
 * One radius and one border, both from the theme. The pages previously mixed
 * `rounded-xl`, `rounded-2xl` and `rounded-3xl` alongside the `rounded-card`
 * token the config actually defines, so three different corner radii could
 * appear in a single viewport.
 */
interface CardProps {
  children: ReactNode
  as?: ElementType
  /** Lift slightly on hover. Only for cards that are themselves a link. */
  interactive?: boolean
  className?: string
}

export function Card({ children, as: Tag = 'div', interactive = false, className }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-card border border-border bg-white p-6 shadow-elevation-1',
        interactive &&
          'transition-all duration-240 ease-out-premium hover:border-primary-200 hover:shadow-elevation-2',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

interface ServiceCardProps {
  icon: ElementType
  title: string
  description: string
  /** Where the card leads. Omit to render a plain, non-interactive card. */
  to?: string
}

/** A service: mark, name, one line, and where to read more. */
export function ServiceCard({ icon: Icon, title, description, to }: ServiceCardProps) {
  const body = (
    <>
      <span className="flex h-11 w-11 items-center justify-center rounded-control bg-primary-50 text-primary-600 transition-colors duration-240 group-hover:bg-primary-500 group-hover:text-white">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-base font-bold text-navy-900">{title}</h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-text-secondary">{description}</p>
      {to && (
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600">
          Learn more <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      )}
    </>
  )

  const classes = cn(
    'group flex h-full flex-col rounded-card border border-border bg-white p-6 shadow-elevation-1',
    to &&
      'transition-all duration-240 ease-out-premium hover:border-primary-200 hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
  )

  return to ? (
    <Link to={to} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}

interface FeatureProps {
  icon: ElementType
  title: string
  description: string
  tone?: 'light' | 'dark'
}

/** A reason to choose FNS Cargo. Mark beside the copy, no surface of its own. */
export function Feature({ icon: Icon, title, description, tone = 'light' }: FeatureProps) {
  const dark = tone === 'dark'
  return (
    <div className="group flex h-full gap-4">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-control transition-colors duration-240',
          dark
            ? 'bg-white/10 text-primary-300 group-hover:bg-primary-500 group-hover:text-white'
            : 'bg-primary-50 text-primary-600 group-hover:bg-primary-500 group-hover:text-white',
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div>
        <h3 className={cn('text-[15px] font-bold', dark ? 'text-white' : 'text-navy-900')}>
          {title}
        </h3>
        <p
          className={cn(
            'mt-1 text-sm leading-relaxed',
            dark ? 'text-navy-200' : 'text-text-secondary',
          )}
        >
          {description}
        </p>
      </div>
    </div>
  )
}

interface StatProps {
  value: string
  label: string
  tone?: 'light' | 'dark'
}

/** One headline figure. Value, label, nothing else. */
export function Stat({ value, label, tone = 'light' }: StatProps) {
  const dark = tone === 'dark'
  return (
    <div>
      <p
        className={cn(
          'font-tabular text-3xl font-extrabold tracking-tight',
          dark ? 'text-white' : 'text-navy-900',
        )}
      >
        {value}
      </p>
      <p className={cn('mt-1 text-sm', dark ? 'text-navy-200' : 'text-text-secondary')}>{label}</p>
    </div>
  )
}
