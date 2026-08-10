import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, MapPin, Plus, PackageSearch } from 'lucide-react'
import { Button, Input, StatusBadge, EmptyState, Skeleton, SectionCard, PageHeader } from '@/components/dash'
import { TrackingEventFormModal } from '@/components/dashboard/TrackingEventFormModal'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useToast } from '@/context/ToastContext'
import {
  listRecentTrackingEvents,
  findShipmentByTracking,
} from '@/services/trackingHistoryService'
import type { ShipmentStatus, TrackingUpdateWithShipment } from '@/types'
import { formatDateTime } from '@/utils/date'

interface FoundShipment {
  id: string
  tracking_number: string
  status: string
  origin: string
  destination: string
}

export default function TrackingUpdates() {
  useDocumentTitle('Tracking Updates | FNS Cargo')
  const toast = useToast()

  const [events, setEvents] = useState<TrackingUpdateWithShipment[]>([])
  const [loading, setLoading] = useState(true)

  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [found, setFound] = useState<FoundShipment | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [eventOpen, setEventOpen] = useState(false)

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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim().length < 3) return
    setSearching(true)
    setNotFound(false)
    setFound(null)
    try {
      const shipment = await findShipmentByTracking(query)
      if (shipment) setFound(shipment)
      else setNotFound(true)
    } catch {
      toast.error('Search failed', 'We couldn’t complete that search. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracking Updates"
        description="Post updates to shipments and see the latest activity."
      />

      {/* Quick add by tracking number */}
      <SectionCard
        title="Post an update"
        description="Find a shipment by its tracking number to add a new event."
      >
        <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="FNS-2026-000123"
            className="font-mono"
            containerClassName="sm:flex-1"
            icon={<Search className="h-4 w-4" />}
            aria-label="Tracking number"
          />
          <Button type="submit" variant="secondary" loading={searching}>
            Find shipment
          </Button>
        </form>

        {notFound && (
          <div className="mt-4 rounded-control border border-gray-300 bg-surface px-4 py-3 text-sm text-steel-600">
            No shipment matches that tracking number.
          </div>
        )}

        {found && (
          <div className="mt-4 flex flex-col gap-3 rounded-control border border-navy-100 bg-navy-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                to={`/dashboard/shipments/${found.id}`}
                className="font-mono text-sm font-bold text-navy-900 hover:text-primary-600"
              >
                {found.tracking_number}
              </Link>
              <p className="text-xs text-text-secondary">
                {found.origin} → {found.destination}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={found.status as ShipmentStatus} />
              <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEventOpen(true)}>
                Add event
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

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
            description="Updates you post to shipments will show up here."
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

      {found && (
        <TrackingEventFormModal
          open={eventOpen}
          onClose={() => setEventOpen(false)}
          onSaved={() => {
            loadFeed()
            // Refresh the found shipment's status chip after a sync.
            findShipmentByTracking(found.tracking_number).then((s) => s && setFound(s))
          }}
          shipmentId={found.id}
          currentStatus={found.status as ShipmentStatus}
        />
      )}
    </div>
  )
}
