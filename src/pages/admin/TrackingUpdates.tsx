import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Zap, MapPin, PackageSearch } from 'lucide-react'
import { Button, StatusBadge, EmptyState, Skeleton, SectionCard } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import { listRecentTrackingEvents } from '@/services/trackingHistoryService'
import type { ShipmentStatus, TrackingUpdateWithShipment } from '@/types'
import { formatDateTime } from '@/utils/date'

export default function TrackingUpdates() {
  useDocumentTitle('Tracking Updates | FNS Cargo')
  const toast = useToast()

  const [events, setEvents] = useState<TrackingUpdateWithShipment[]>([])
  const [loading, setLoading] = useState(true)

  const loadFeed = useCallback(async () => {
    setLoading(true)
    try {
      setEvents(await listRecentTrackingEvents(25))
    } catch {
      toast.error('Unable to load updates', 'Please refresh the page to try again.')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadFeed()
  }, [loadFeed])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking Updates"
        description="See the latest activity across every shipment."
        actions={
          <Button
            variant="secondary"
            icon={<Zap className="h-4 w-4 text-primary-500" />}
            onClick={() => window.dispatchEvent(new Event('fns:command'))}
          >
            Post update (⌘K)
          </Button>
        }
      />

      {/* Recent events feed */}
      <SectionCard title="Latest updates" flush>
        {loading ? (
          <ul className="divide-y divide-steel-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-6 py-3.5">
                <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-4 w-20 rounded-badge" />
                  </div>
                  <Skeleton className="h-3.5 w-2/3" />
                </div>
                <Skeleton className="h-3 w-16 shrink-0" />
              </li>
            ))}
          </ul>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-6 w-6" />}
            title="No updates yet"
            description="Updates posted to shipments will show up here."
            action={
              <Button
                variant="secondary"
                icon={<Zap className="h-4 w-4 text-primary-500" />}
                onClick={() => window.dispatchEvent(new Event('fns:command'))}
              >
                Post update (⌘K)
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-steel-100">
            {events.map((event) => (
              <li key={event.id} className="flex items-center gap-4 px-6 py-3.5">
                <MapPin className="h-4 w-4 shrink-0 text-steel-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {event.shipment && (
                      <Link
                        to={`/dashboard/shipments/${event.shipment.id}`}
                        className="font-mono text-sm font-semibold text-navy-900 hover:text-primary-600"
                      >
                        {event.shipment.tracking_number}
                      </Link>
                    )}
                    <StatusBadge status={event.status as ShipmentStatus} />
                  </div>
                  <p className="truncate text-sm text-steel-600">
                    {event.location}
                    {event.description ? `: ${event.description}` : ''}
                  </p>
                </div>
                <span className="whitespace-nowrap font-tabular text-xs text-steel-400">
                  {formatDateTime(`${event.date}T${event.time}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
