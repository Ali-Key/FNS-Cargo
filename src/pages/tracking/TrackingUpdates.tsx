import { useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Command, PackageSearch, RefreshCw } from 'lucide-react'
import { Alert, Button, EmptyState, Panel, PanelHeader, Skeleton, StatusBadge } from '@/components/ui'
import { PageHeader } from '@/components/dashboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useCachedResource } from '@/hooks/useCachedResource'
import { listRecentTrackingEvents } from '@/services/trackingHistoryService'
import type { ShipmentStatus, TrackingUpdateWithShipment } from '@/types'
import { STATUS_ICON, STATUS_STYLES } from '@/utils/status'
import { formatDateTime } from '@/utils/date'

/** Groups the feed by calendar day so a shift reads as a sequence, not a wall. */
function groupByDay(events: TrackingUpdateWithShipment[]) {
  const groups = new Map<string, TrackingUpdateWithShipment[]>()
  for (const event of events) {
    const list = groups.get(event.date)
    if (list) list.push(event)
    else groups.set(event.date, [event])
  }
  return [...groups.entries()]
}

function dayLabel(date: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
  if (date === today) return 'Today'
  if (date === yesterday) return 'Yesterday'
  return new Date(`${date}T00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })
}

/** Stable identity, so the day grouping below is not recomputed every render. */
const NO_EVENTS: TrackingUpdateWithShipment[] = []

export default function TrackingUpdates() {
  useDocumentTitle('Tracking | FSN Cargo')

  const fetchFeed = useCallback(() => listRecentTrackingEvents(25), [])
  const {
    data,
    loading,
    error,
    reload: loadFeed,
  } = useCachedResource<TrackingUpdateWithShipment[]>('tracking:feed', fetchFeed)

  const events = data ?? NO_EVENTS
  // A failed refresh keeps the feed that is already on screen; only a cold
  // failure has nothing to fall back to.
  const feedError = error && events.length === 0 ? error : null

  const days = useMemo(() => groupByDay(events), [events])

  const postButton = (
    <Button
      variant="deck"
      size="sm"
      icon={<Command className="h-4 w-4 text-signal-300" />}
      onClick={() => window.dispatchEvent(new Event('fsn:command'))}
    >
      Post update
    </Button>
  )

  return (
    <div>
      <PageHeader
        title="Tracking"
        description="Every scan and status change, newest first."
        crumbs={[{ label: 'Operate' }, { label: 'Tracking' }]}
        actions={
          <>
            <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={loadFeed}>
              Refresh
            </Button>
            {postButton}
          </>
        }
      />

      {feedError && (
        <Alert
          variant="error"
          title="Could not load updates"
          className="mb-4"
          action={
            <Button variant="secondary" size="sm" onClick={loadFeed}>
              Retry
            </Button>
          }
        >
          {feedError}
        </Alert>
      )}

      <Panel>
        <PanelHeader
          title="Activity feed"
          description="The 25 most recent tracking events. Status changes here drive every shipment's state."
          icon={PackageSearch}
        />

        {loading && events.length === 0 ? (
          <ul className="divide-y divide-deck-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-4 px-5 py-3.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-4 w-20 rounded-badge" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                </div>
                <Skeleton className="hidden h-3 w-16 shrink-0 sm:block" />
              </li>
            ))}
          </ul>
        ) : events.length === 0 ? (
          <EmptyState
            icon={<PackageSearch className="h-5 w-5" />}
            title="No tracking activity yet"
            description="Updates posted against any shipment appear here within seconds. Press ⌘K anywhere to post one."
            action={postButton}
          />
        ) : (
          days.map(([date, dayEvents]) => (
            <section key={date}>
              <h3 className="border-y border-deck-100 bg-deck-50 px-5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-deck-500">
                {dayLabel(date)}
              </h3>
              <ul className="divide-y divide-deck-100">
                {dayEvents.map((event) => {
                  const status = event.status as ShipmentStatus
                  const Icon = STATUS_ICON[status]
                  const style = STATUS_STYLES[status]
                  return (
                    <li key={event.id} className="flex items-start gap-3.5 px-5 py-3.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg} ${style.text}`}
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {event.shipment && (
                            <Link
                              to={`/dashboard/shipments/${event.shipment.id}`}
                              className="deck-focus rounded-chip font-mono text-[13px] font-semibold text-deck-900 underline-offset-2 hover:text-signal-600 hover:underline"
                            >
                              {event.shipment.tracking_number}
                            </Link>
                          )}
                          <StatusBadge status={status} />
                        </div>
                        <p className="mt-1 text-[13px] leading-relaxed text-deck-600">
                          <span className="font-medium text-deck-800">{event.location}</span>
                          {event.description ? ` — ${event.description}` : ''}
                        </p>
                      </div>
                      <span className="font-tabular shrink-0 whitespace-nowrap text-[11px] text-deck-400">
                        {formatDateTime(`${event.date}T${event.time}`)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))
        )}
      </Panel>
    </div>
  )
}
