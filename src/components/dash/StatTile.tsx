import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Card } from './Card'

type Tone = 'navy' | 'delivered' | 'transit' | 'pending' | 'delayed'

const TONE_ICON: Record<Tone, string> = {
  navy: 'bg-navy-50 text-navy-700',
  delivered: 'bg-status-delivered/10 text-status-delivered',
  transit: 'bg-status-transit/10 text-status-transit',
  pending: 'bg-status-pending/10 text-status-pending',
  delayed: 'bg-status-delayed/10 text-status-delayed',
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

/** Dashboard stat tile — the single stat-tile component (Overview, Finance, Reports). */
export function StatTile({ label, value, icon: Icon, tone = 'navy', hint, to, attention }: StatTileProps) {
  const numeric = typeof value === 'number' ? value : Number(value) || 0
  const alert = attention && numeric > 0

  return (
    <Card
      as={to ? Link : 'div'}
      to={to}
      padding="sm"
      border={alert ? 'border-primary-300 ring-1 ring-primary-400/40' : 'border-gray-200'}
      className={cn(
        to &&
          'group flex flex-col transition-all duration-180 ease-out-premium hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-secondary">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-xl', TONE_ICON[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2.5 font-tabular text-2xl font-bold leading-none text-navy-900">{value}</p>
      {hint && <p className="mt-1.5 text-xs font-medium text-steel-400">{hint}</p>}
    </Card>
  )
}
