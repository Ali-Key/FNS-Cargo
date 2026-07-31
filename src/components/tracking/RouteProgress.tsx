import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { ShipmentStatus } from '@/types'
import { STATUS_PROGRESS, STATUS_STYLES } from '@/utils/status'

interface RouteProgressProps {
  origin: string
  destination: string
  status: ShipmentStatus
}

export function RouteProgress({ origin, destination, status }: RouteProgressProps) {
  const [width, setWidth] = useState(0)
  const target = STATUS_PROGRESS[status]

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
            STATUS_STYLES[status].dot,
          )}
          style={{ width: `${width}%` }}
        />
        <MapPin
          className={cn(
            'absolute -top-[7px] h-4 w-4 -translate-x-1/2 fill-white text-navy-800 transition-[left] duration-1000 ease-out-premium',
          )}
          style={{ left: `${width}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}
