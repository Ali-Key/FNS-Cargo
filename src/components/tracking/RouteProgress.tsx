import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ShipmentStatus } from '@/types'

const PROGRESS_BY_STATUS: Record<ShipmentStatus, number> = {
  pending: 6,
  in_transit: 55,
  delivered: 100,
  delayed: 40,
  cancelled: 0,
}

const BAR_COLOR: Record<ShipmentStatus, string> = {
  pending: 'bg-status-pending',
  in_transit: 'bg-status-transit',
  delivered: 'bg-status-delivered',
  delayed: 'bg-status-delayed',
  cancelled: 'bg-status-cancelled',
}

interface RouteProgressProps {
  origin: string
  destination: string
  status: ShipmentStatus
}

export function RouteProgress({ origin, destination, status }: RouteProgressProps) {
  const [width, setWidth] = useState(0)
  const target = PROGRESS_BY_STATUS[status]

  useEffect(() => {
    const raf = requestAnimationFrame(() => setWidth(target))
    return () => cancelAnimationFrame(raf)
  }, [target])

  return (
    <div className="rounded-card bg-navy-50/60 px-4 py-4">
      <div className="flex items-center justify-between gap-3 text-sm font-bold text-navy-900">
        <span className="truncate">{origin}</span>
        <span className="truncate text-right">{destination}</span>
      </div>
      <div className="relative mt-4 h-1.5 w-full rounded-badge bg-steel-200">
        <div
          className={cn(
            'absolute inset-y-0 left-0 rounded-badge transition-[width] duration-1000 ease-out-premium',
            BAR_COLOR[status],
          )}
          style={{ width: `${width}%` }}
        />
        <MapPin
          className={cn(
            'absolute -top-[7px] h-4 w-4 -translate-x-1/2 fill-white transition-[left] duration-1000 ease-out-premium',
            status === 'cancelled' ? 'text-steel-400' : 'text-navy-800',
          )}
          style={{ left: `${width}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
