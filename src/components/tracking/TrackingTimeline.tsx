import { CheckCircle2, Circle, MapPin } from 'lucide-react'
import { cn } from '@/utils/cn'
import { formatDateTime } from '@/utils/date'
import { STATUS_STYLES, STATUS_LABEL } from '@/utils/status'
import type { PublicTrackingEvent } from '@/types'

export function TrackingTimeline({ events }: { events: PublicTrackingEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-text-secondary">
        No tracking events have been recorded for this shipment yet.
      </p>
    )
  }

  return (
    <ol className="relative">
      {events.map((event, index) => {
        const style = STATUS_STYLES[event.status]
        const isLatest = index === 0
        const timestamp = `${event.date}T${event.time}`
        return (
          <li
            key={event.id}
            className="relative animate-fade-up pb-8 pl-9 last:pb-0"
            style={{ animationDelay: `${index * 40}ms` }}
          >
            {index !== events.length - 1 && (
              <span className="absolute left-[9px] top-6 h-full w-px bg-steel-200" aria-hidden="true" />
            )}
            <span
              className={cn(
                'absolute left-0 top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-4 ring-white',
                style.bg,
              )}
            >
              {isLatest ? (
                <CheckCircle2 className={cn('h-5 w-5', style.text)} />
              ) : (
                <Circle className={cn('h-2.5 w-2.5 fill-current', style.text)} />
              )}
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <span className={cn('text-sm font-bold', style.text)}>{STATUS_LABEL[event.status]}</span>
              <time dateTime={timestamp} className="text-xs font-medium text-steel-400 font-tabular">
                {formatDateTime(timestamp)}
              </time>
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-navy-700">
              <MapPin className="h-3.5 w-3.5 text-steel-400" />
              {event.location}
            </p>
            {event.description && <p className="mt-1 text-sm text-text-secondary">{event.description}</p>}
          </li>
        )
      })}
    </ol>
  )
}
