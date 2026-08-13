import { Link } from 'react-router-dom'
import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'default' | 'signal' | 'positive' | 'caution' | 'critical'

/**
 * The icon is a quiet glyph, not a coloured chip. Six tinted squares in a metric
 * row turn the top of every page into a paint chart and drain the colour of any
 * meaning; here colour is spent only where the number itself is a warning.
 */
const TONE_ICON: Record<Tone, string> = {
  default: 'text-deck-300',
  signal: 'text-deck-300',
  positive: 'text-deck-300',
  caution: 'text-status-pending',
  critical: 'text-status-delayed',
}

/** A hairline accent along the top edge, used only by the two alert tones. */
const TONE_EDGE: Record<Tone, string> = {
  default: '',
  signal: '',
  positive: '',
  caution: 'before:bg-status-pending',
  critical: 'before:bg-status-delayed',
}

interface MetricProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: Tone
  /** Supporting line under the value, e.g. "12 awaiting pickup". */
  hint?: string
  /** Signed period-over-period change, rendered with direction and colour. */
  delta?: { value: string; direction: 'up' | 'down'; good?: boolean }
  /** Turns the whole card into a link into the matching list view. */
  to?: string
  className?: string
}

/**
 * The headline number card. One per fact, read left-to-right: what it is, how
 * many, and what changed. Replaces the old left-bar stat tile.
 */
export function Metric({ label, value, icon: Icon, tone = 'default', hint, delta, to, className }: MetricProps) {
  const DeltaIcon = delta?.direction === 'up' ? TrendingUp : TrendingDown
  const deltaGood = delta ? (delta.good ?? delta.direction === 'up') : false

  const inner = (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-deck-500">
          {label}
        </span>
        <Icon className={cn('h-4 w-4 shrink-0', TONE_ICON[tone])} aria-hidden="true" />
      </div>
      <p className="mt-2.5 font-tabular text-[26px] font-bold leading-none tracking-tight text-deck-900">{value}</p>
      <div className="mt-2 flex items-center gap-2">
        {delta && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-badge px-1.5 py-0.5 text-[11px] font-bold',
              deltaGood ? 'bg-status-delivered/10 text-status-delivered-ink' : 'bg-status-delayed/10 text-status-delayed-ink',
            )}
          >
            <DeltaIcon className="h-3 w-3" aria-hidden="true" />
            {delta.value}
          </span>
        )}
        {hint && <span className="truncate text-[12px] text-deck-500">{hint}</span>}
      </div>
    </>
  )

  const base = cn(
    'group relative overflow-hidden rounded-deck bg-panel px-4 py-3.5 shadow-deck',
    // The alert tones carry a hairline along the top edge instead of a coloured
    // badge, so an at-risk number is findable in peripheral vision without
    // adding another filled shape to the row.
    tone === 'caution' || tone === 'critical'
      ? cn('before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:content-[""]', TONE_EDGE[tone])
      : '',
    className,
  )

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          base,
          'deck-focus block transition-shadow hover:shadow-deck-raised [&_p]:transition-colors group-hover:[&_p]:text-deck-900',
        )}
      >
        {inner}
      </Link>
    )
  }
  return <div className={base}>{inner}</div>
}

/** Loading placeholder shaped exactly like `Metric`, so nothing shifts on load. */
export function MetricSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-deck bg-panel px-4 py-3.5 shadow-deck', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton-shimmer h-3 w-24 rounded" />
        <div className="skeleton-shimmer h-4 w-4 rounded" />
      </div>
      <div className="skeleton-shimmer mt-2.5 h-[26px] w-20 rounded" />
      <div className="skeleton-shimmer mt-2 h-3 w-28 rounded" />
    </div>
  )
}
