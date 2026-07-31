import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'navy' | 'delivered' | 'transit' | 'delayed'

const TONE: Record<Tone, string> = {
  navy: 'bg-navy-50 text-navy-700',
  delivered: 'bg-status-delivered/10 text-status-delivered',
  transit: 'bg-status-transit/10 text-status-transit',
  delayed: 'bg-status-delayed/10 text-status-delayed',
}

interface MetricTileProps {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: Tone
  to: string
  hint?: string
  /** When true and value > 0, the tile takes on a warm attention border. */
  attention?: boolean
}

export function MetricTile({ label, value, icon: Icon, tone = 'navy', to, hint, attention }: MetricTileProps) {
  const numeric = typeof value === 'number' ? value : Number(value) || 0
  const alert = attention && numeric > 0

  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-card border bg-white p-5 shadow-elevation-1 transition-all duration-180 ease-out-premium hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
        alert ? 'border-accent-300 ring-1 ring-accent-400/40' : 'border-steel-100',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-steel-500">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', TONE[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 font-tabular text-3xl font-bold leading-none text-navy-900">{value}</p>
      {hint && <p className="mt-2 text-xs font-medium text-steel-400">{hint}</p>}
    </Link>
  )
}
