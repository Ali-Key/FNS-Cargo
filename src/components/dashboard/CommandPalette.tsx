import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Zap, X, CornerDownLeft, Search } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
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

  const trackingRef = useRef<HTMLInputElement>(null)
  const listId = useId()

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
    window.addEventListener('fns:command', onTrigger)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('fns:command', onTrigger)
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
    <div className="fixed inset-0 z-[95] flex items-start justify-center p-4 pt-[10vh]" onKeyDown={onKeyDown}>
      <div className="absolute inset-0 animate-fade-in bg-navy-950/60" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Post tracking update"
        className="relative z-10 w-full max-w-lg animate-fade-up overflow-hidden rounded-card bg-white shadow-elevation-3"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary-500" />
            <h2 className="text-sm font-bold text-navy-900">Quick tracking update</h2>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1 text-steel-400 hover:bg-steel-100 hover:text-navy-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {/* Tracking number */}
          <Input
            ref={trackingRef}
            value={form.tracking}
            onChange={(e) => setForm((f) => ({ ...f, tracking: e.target.value.toUpperCase() }))}
            placeholder="FNS-2026-000123"
            className="font-mono"
            icon={<Search className="h-4 w-4" />}
            aria-label="Tracking number"
            autoComplete="off"
          />

          {/* Status segmented control */}
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-steel-400">Status</p>
            <div className="grid grid-cols-5 gap-1.5">
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
                      'flex flex-col items-center gap-1 rounded-control border px-1 py-2 text-[11px] font-semibold transition-colors duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500',
                      active
                        ? cn(style.bg, style.text, 'border-transparent ring-1', style.ring)
                        : 'border-gray-300 text-text-secondary hover:border-navy-300 hover:text-navy-700',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {STATUS_LABEL[s]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Country + city */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Country"
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              placeholder="China"
            />
            <Input
              label="City"
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
              placeholder="Guangzhou"
            />
          </div>

          {/* Location + time */}
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
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Description (optional): visible to the customer"
            aria-label="Description"
          />

          <label className="flex items-center gap-2.5 text-sm text-steel-600">
            <input
              type="checkbox"
              checked={form.sync}
              onChange={(e) => setForm((f) => ({ ...f, sync: e.target.checked }))}
              className="h-4 w-4 rounded border-steel-300 text-navy-700 focus:ring-navy-500"
            />
            Set the shipment’s current status to match this update
          </label>

          {error && <p className="text-sm font-medium text-status-delayed">{error}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 bg-surface/60 px-5 py-3">
          <span className="flex items-center gap-1 text-xs text-steel-400">
            <CornerDownLeft className="h-3.5 w-3.5" />
            <kbd className="font-sans font-semibold">⌘</kbd>
            <kbd className="font-sans font-semibold">Enter</kbd> to post
          </span>
          <Button variant="primary" size="sm" onClick={submit} loading={submitting}>
            Post update
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
