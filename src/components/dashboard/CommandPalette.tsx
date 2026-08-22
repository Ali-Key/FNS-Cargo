import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Command, X, CornerDownLeft, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { invalidateCachedResources } from '@/hooks/useCachedResource'
import { useActiveCountries } from '@/hooks/useCountries'
import {
  findShipmentByTracking,
  createTrackingEvent,
  listRecentLocations,
} from '@/services/trackingHistoryService'
import { updateShipment } from '@/services/shipmentsService'
import type { ShipmentStatus } from '@/types'
import { SHIPMENT_STATUSES } from '@/types'
import { STATUS_LABEL, STATUS_ICON, STATUS_STYLES } from '@/utils/status'
import { cn } from '@/utils/cn'

function nowLocal(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const EMPTY = {
  tracking: '',
  status: 'In Transit' as ShipmentStatus,
  country: '',
  city: '',
  location: '',
  description: '',
  eventTime: '',
  sync: true,
}

/**
 * Global ⌘K palette that jumps straight to a compact tracking-update form —
 * the coordinator's highest-frequency action. Submits with ⌘Enter, inserts
 * optimistically, and returns focus to the tracking field for the next entry.
 */
export function CommandPalette() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [locations, setLocations] = useState<string[]>([])
  // Suggestions only: a scan can happen in a transit country that is not a
  // served market, so the field stays free text.
  const { countries } = useActiveCountries()

  const trackingRef = useRef<HTMLInputElement>(null)
  const listId = useId()
  const countryListId = `${listId}-countries`

  const openPalette = useCallback(() => {
    setForm({ ...EMPTY, eventTime: nowLocal() })
    setError(null)
    setOpen(true)
    listRecentLocations()
      .then(setLocations)
      .catch(() => setLocations([]))
  }, [])

  // Global ⌘K / Ctrl+K listener.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((prev) => {
          if (!prev) openPalette()
          return true
        })
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    function onTrigger() {
      openPalette()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('fsn:command', onTrigger)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('fsn:command', onTrigger)
    }
  }, [openPalette])

  // Focus the tracking field whenever the palette opens.
  useEffect(() => {
    if (open) requestAnimationFrame(() => trackingRef.current?.focus())
  }, [open])

  async function submit() {
    setError(null)
    const tracking = form.tracking.trim().toUpperCase()
    if (tracking.length < 6) return setError('Enter a full tracking number.')
    if (form.country.trim().length < 2) return setError('Enter a country for this update.')
    if (form.city.trim().length < 2) return setError('Enter a city for this update.')
    if (form.location.trim().length < 2) return setError('Enter a location for this update.')

    setSubmitting(true)
    try {
      const shipment = await findShipmentByTracking(tracking)
      if (!shipment) {
        setError('No shipment matches that tracking number.')
        return
      }
      const when = form.eventTime || nowLocal()
      await createTrackingEvent({
        shipment_id: shipment.id,
        status: form.status,
        date: when.slice(0, 10),
        time: when.slice(11, 16),
        country: form.country.trim(),
        city: form.city.trim(),
        location: form.location.trim(),
        description: form.description.trim() || null,
      })
      if (form.sync) await updateShipment(shipment.id, { status: form.status })

      // A tracking event is what moves a shipment's status, so every cached
      // page that shows a status is stale from this point on.
      invalidateCachedResources()
      toast.success('Update posted', `${tracking} is now ${STATUS_LABEL[form.status]}.`)
      // Reset for the next entry, keeping status/sync, and refocus tracking.
      setForm((f) => ({ ...EMPTY, status: f.status, sync: f.sync, eventTime: nowLocal() }))
      requestAnimationFrame(() => trackingRef.current?.focus())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post the update.')
    } finally {
      setSubmitting(false)
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-start sm:p-4 sm:pt-[8vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 animate-fade-in bg-deck-950/70 backdrop-blur-[2px]" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Post tracking update"
        className="deck-enter relative z-10 flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden bg-panel shadow-deck-pop sm:rounded-deck-lg"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-deck-100 bg-deck-900 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Command className="h-4 w-4 text-signal-300" aria-hidden="true" />
            <h2 className="text-[14px] font-semibold text-white">Quick tracking update</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="deck-focus-dark rounded-deck-sm p-1.5 text-deck-300 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="deck-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <Input
            ref={trackingRef}
            value={form.tracking}
            onChange={(e) => setForm((f) => ({ ...f, tracking: e.target.value.toUpperCase() }))}
            placeholder="FSN-2026-000001"
            className="font-mono tracking-wide"
            icon={<Search className="h-4 w-4" />}
            aria-label="Tracking number"
            autoComplete="off"
          />

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-deck-500">Status</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {SHIPMENT_STATUSES.map((s) => {
                const Icon = STATUS_ICON[s]
                const active = form.status === s
                const style = STATUS_STYLES[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, status: s }))}
                    aria-pressed={active}
                    title={STATUS_LABEL[s]}
                    className={cn(
                      'deck-focus flex flex-col items-center gap-1.5 rounded-deck-sm px-1 py-2.5 text-center text-[10px] font-semibold leading-tight transition-colors',
                      active
                        ? cn(style.bg, style.text, 'ring-1 ring-inset', style.ring)
                        : 'bg-deck-50 text-deck-500 hover:bg-deck-100 hover:text-deck-900',
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {STATUS_LABEL[s]}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                list={countryListId}
                placeholder="Country of this scan"
              />
              <datalist id={countryListId}>
                {countries.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Guangzhou"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Input
                label="Location"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                list={listId}
                placeholder="Guangzhou Port, China"
              />
              <datalist id={listId}>
                {locations.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            <Input
              label="Event time"
              type="datetime-local"
              value={form.eventTime}
              onChange={(e) => setForm((f) => ({ ...f, eventTime: e.target.value }))}
            />
          </div>

          <Input
            label="Description"
            note="Optional"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Visible to the customer on the public tracking page"
          />

          <label className="flex items-start gap-2.5 rounded-deck-sm bg-deck-50 px-3 py-2.5 text-[13px] text-deck-700">
            <input
              type="checkbox"
              checked={form.sync}
              onChange={(e) => setForm((f) => ({ ...f, sync: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-deck-300 text-signal-600 focus:ring-signal-500"
            />
            Set the shipment&rsquo;s current status to match this update
          </label>

          {error && (
            <p className="rounded-deck-sm bg-status-delayed/10 px-3 py-2 text-[13px] font-medium text-status-delayed-ink">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-deck-100 bg-deck-50/70 px-5 py-3">
          <span className="hidden items-center gap-1 text-[11px] text-deck-400 sm:flex">
            <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <kbd className="font-sans font-semibold">⌘</kbd>
            <kbd className="font-sans font-semibold">Enter</kbd> to post
          </span>
          <Button variant="signal" size="sm" onClick={submit} loading={submitting} className="ml-auto">
            Post update
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
