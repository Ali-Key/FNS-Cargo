import { Link } from 'react-router-dom'
import { ArrowUpRight, ArrowDownRight, Minus, type LucideIcon } from 'lucide-react'
import { Sparkline } from './Sparkline'
import type { MetricSummary } from '@/services/dashboardService'
import { cn } from '@/utils/cn'

type Tone = 'navy' | 'delivered' | 'transit' | 'delayed'

const TONE: Record<Tone, { chip: string; spark: string }> = {
  navy: { chip: 'bg-navy-50 text-navy-700', spark: '#0b3b7a' },
  delivered: { chip: 'bg-status-delivered/10 text-status-delivered', spark: '#0f8a54' },
  transit: { chip: 'bg-status-transit/10 text-status-transit', spark: '#1d6fd1' },
  delayed: { chip: 'bg-status-delayed/10 text-status-delayed', spark: '#dc2626' },
}

interface MetricTileProps {
  label: string
  metric: MetricSummary
  icon: LucideIcon
  tone?: Tone
  to: string
  /** When true and value > 0, the tile takes on a warm attention border. */
  attention?: boolean
  /** Whether a rising delta is good (default) or bad (e.g. Delayed). */
  invertDelta?: boolean
}

export function MetricTile({ label, metric, icon: Icon, tone = 'navy', to, attention, invertDelta }: MetricTileProps) {
  const style = TONE[tone]
  const alert = attention && metric.value > 0
  const DeltaIcon = metric.direction === 'up' ? ArrowUpRight : metric.direction === 'down' ? ArrowDownRight : Minus

  // For most metrics up = good (green); for Delayed, up = bad (red).
  const good = invertDelta ? metric.direction === 'down' : metric.direction === 'up'
  const deltaColor =
    metric.direction === 'flat'
      ? 'text-steel-400'
      : good
        ? 'text-status-delivered'
        : 'text-status-delayed'

  return (
    <Link
      to={to}
      className={cn(
        'group flex flex-col rounded-2xl border bg-white p-5 shadow-elevation-1 transition-all duration-180 ease-out-premium hover:shadow-elevation-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500 focus-visible:ring-offset-2',
        alert ? 'border-accent-300 ring-1 ring-accent-400/40' : 'border-steel-100',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-steel-500">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', style.chip)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <p className="font-tabular text-3xl font-bold leading-none text-navy-900">{metric.value}</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-semibold">
            {metric.delta === null ? (
              <span className="text-steel-400">No prior data</span>
            ) : (
              <>
                <DeltaIcon className={cn('h-3.5 w-3.5', deltaColor)} />
                <span className={deltaColor}>{Math.abs(metric.delta)}%</span>
                <span className="font-medium text-steel-400">vs last 30d</span>
              </>
            )}
          </div>
        </div>
        <Sparkline data={metric.spark} color={alert ? '#f26b1d' : style.spark} className="shrink-0" />
      </div>
    </Link>
  )
}
