import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  Search,
  PackageX,
  AlertCircle,
  MapPin,
  Calendar,
  Weight,
  Boxes,
  Plane,
  Ship,
  Truck,
} from 'lucide-react'
import { Button, Input, Skeleton, StatusBadge } from '@/components/ui'
import { TrackingTimeline } from './TrackingTimeline'
import { RouteProgress } from './RouteProgress'
import { useToast } from '@/context/ToastContext'
import { trackShipment } from '@/services/trackingService'
import { isValidTrackingNumberInput, SHIPPING_METHOD_LABEL } from '@/utils/status'
import { formatDate } from '@/utils/date'
import { cn } from '@/utils/cn'
import type { PublicTrackingResult } from '@/types'

type WidgetState = 'idle' | 'loading' | 'found' | 'notfound' | 'error'

const METHOD_ICON = { air: Plane, sea: Ship, road: Truck }

interface TrackingWidgetProps {
  className?: string
  elevated?: boolean
}

export function TrackingWidget({ className, elevated = false }: TrackingWidgetProps) {
  const toast = useToast()
  const [value, setValue] = useState('')
  const [state, setState] = useState<WidgetState>('idle')
  const [result, setResult] = useState<PublicTrackingResult | null>(null)
  const [inputError, setInputError] = useState<string | null>(null)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    // Paste-friendly: strip stray characters and normalize case as the user types,
    // without validating (validation only happens on submit).
    const normalized = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '')
    setValue(normalized)
    if (inputError) setInputError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setInputError(null)

    if (!isValidTrackingNumberInput(value)) {
      setInputError('Please enter at least 6 characters of your tracking number.')
      return
    }

    setState('loading')
    try {
      const data = await trackShipment(value)
      if (data) {
        setResult(data)
        setState('found')
        toast.success('Found it', `Here's the latest on ${data.tracking_number}.`)
      } else {
        setResult(null)
        setState('notfound')
        toast.warning("Couldn't find that one", 'Have another look at the number and try again.')
      }
    } catch {
      setResult(null)
      setState('error')
      toast.error('Tracking is down for a moment', "We couldn't check right now. Please try again shortly.")
    }
  }

  const MethodIcon = result ? METHOD_ICON[result.shipping_method] : Boxes

  return (
    <div
      className={cn(
        'w-full rounded-card border border-steel-100 bg-white/95 p-5 backdrop-blur-xl sm:p-6',
        elevated && 'shadow-elevation-3',
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          containerClassName="flex-1"
          inputSize="lg"
          placeholder="FNS-2026-000123"
          value={value}
          onChange={handleChange}
          icon={<Search className="h-5 w-5" />}
          error={inputError ?? undefined}
          aria-label="Tracking number"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="accent" size="lg" loading={state === 'loading'} className="sm:w-auto">
          Track shipment
        </Button>
      </form>

      {state === 'loading' && (
        <div className="mt-6 space-y-4 border-t border-steel-100 pt-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="mb-2 h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      )}

      {state === 'notfound' && (
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-steel-100 pt-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-card bg-orange-50 text-orange-500">
            <PackageX className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-navy-900">We couldn't find that shipment</h3>
          <p className="max-w-sm text-sm text-steel-500">
            Have another look at the tracking number and try again. If it still doesn't show up, we're happy to
            track it down for you.
          </p>
          <Link to="/contact">
            <Button variant="secondary" size="sm">
              Ask us to help
            </Button>
          </Link>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-steel-100 pt-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-card bg-red-50 text-red-500">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-navy-900">That didn't work</h3>
          <p className="max-w-sm text-sm text-steel-500">
            We couldn't check just now. Give it another try in a moment. And if it keeps happening, get in
            touch and we'll sort it out.
          </p>
          <Link to="/contact">
            <Button variant="secondary" size="sm">
              Get in touch
            </Button>
          </Link>
        </div>
      )}

      {state === 'found' && result && (
        <div className="mt-6 animate-fade-up border-t border-steel-100 pt-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-tabular text-sm font-bold text-navy-900">{result.tracking_number}</span>
              <StatusBadge status={result.status} />
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-steel-500">
              <MethodIcon className="h-4 w-4 text-navy-500" />
              {SHIPPING_METHOD_LABEL[result.shipping_method]}
            </div>
          </div>

          <div className="mt-5">
            <RouteProgress origin={result.origin} destination={result.destination} status={result.status} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-steel-400">
                <Calendar className="h-3.5 w-3.5" /> Est. Delivery
              </p>
              <p className="mt-1 font-tabular text-sm font-bold text-navy-800">
                {formatDate(result.estimated_delivery, 'To be confirmed')}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-steel-400">
                <Weight className="h-3.5 w-3.5" /> Weight
              </p>
              <p className="mt-1 font-tabular text-sm font-bold text-navy-800">{result.weight_kg} kg</p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-steel-400">
                <Boxes className="h-3.5 w-3.5" /> Pieces
              </p>
              <p className="mt-1 font-tabular text-sm font-bold text-navy-800">{result.pieces}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-4 flex items-center gap-1.5 text-sm font-bold text-navy-900">
              <MapPin className="h-4 w-4 text-accent-500" />
              Tracking History
            </p>
            <TrackingTimeline events={result.tracking_history} />
          </div>
        </div>
      )}
    </div>
  )
}
