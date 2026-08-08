import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'navy' | 'delivered' | 'transit' | 'pending' | 'delayed'

const TONE_BAR: Record<Tone, string> = {
  navy: 'border-l-navy-400',
  delivered: 'border-l-status-delivered',
  transit: 'border-l-status-transit',
  pending: 'border-l-status-pending',
  delayed: 'border-l-status-delayed',
}

const TONE_ICON: Record<Tone, string> = {
  navy: 'text-navy-500',
  delivered: 'text-status-delivered',
  transit: 'text-status-transit',
  pending: 'text-status-pending',
  delayed: 'text-status-delayed',
}

interface StatTileProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: Tone
  hint?: string
  /** When set, the tile becomes a link to this route. */
  to?: string
  /** When true and value > 0, the tile takes on a warm attention border (only with `to`). */
  attention?: boolean
}

/** Console-style stat tile: flat, left-bar coded by tone, no icon chip. Single component used by Overview, Finance, Analytics. */
export function StatTile({ label, value, icon: Icon, tone = 'navy', hint, to, attention }: StatTileProps) {
  const numeric = typeof value === 'number' ? value : Number(value) || 0
  const alert = attention && numeric > 0

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel-500">{label}</span>
        <Icon className={cn('h-4 w-4 shrink-0', alert ? 'text-primary-600' : TONE_ICON[tone])} aria-hidden="true" />
      </div>
      <p className="mt-2 font-tabular text-2xl font-bold leading-none text-navy-900">{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-steel-400">{hint}</p>}
    </>
  )

  const className = cn(
    'flex flex-col border border-l-4 bg-white px-4 py-3.5',
    alert ? 'border-primary-200 border-l-primary-500 bg-primary-50/30' : cn('border-gray-200', TONE_BAR[tone]),
    to &&
      'transition-colors duration-180 hover:border-gray-300 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
  )

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return <div className={className}>{content}</div>
}
