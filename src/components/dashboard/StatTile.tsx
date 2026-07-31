import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

type Tone = 'navy' | 'delivered' | 'transit' | 'pending' | 'delayed'

const TONE_STYLES: Record<Tone, { icon: string; ring: string }> = {
  navy: { icon: 'bg-navy-50 text-navy-700', ring: '' },
  delivered: { icon: 'bg-status-delivered/10 text-status-delivered', ring: '' },
  transit: { icon: 'bg-status-transit/10 text-status-transit', ring: '' },
  pending: { icon: 'bg-status-pending/10 text-status-pending', ring: '' },
  delayed: { icon: 'bg-status-delayed/10 text-status-delayed', ring: 'ring-1 ring-status-delayed/30' },
}

interface StatTileProps {
  label: string
  value: string | number
  icon: LucideIcon
  tone?: Tone
  hint?: string
}

export function StatTile({ label, value, icon: Icon, tone = 'navy', hint }: StatTileProps) {
  const style = TONE_STYLES[tone]
  return (
    <div className={cn('rounded-card border border-steel-100 bg-white p-5 shadow-elevation-1', style.ring)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-steel-500">{label}</span>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', style.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 font-tabular text-3xl font-bold text-navy-900">{value}</p>
      {hint && <p className="mt-1 text-xs font-medium text-steel-400">{hint}</p>}
    </div>
  )
}
