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

const METHOD_ICON: Record<string, typeof Plane> = {
  'Air Express': Plane,
  'Air Freight': Plane,
  'Sea Freight': Ship,
  'Road Freight': Truck,
  'Door to Door': Truck,
}

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
        toast.success('Shipment found', `Showing the latest status for ${data.tracking_number}.`)
      } else {
        setResult(null)
        setState('notfound')
        toast.warning('Tracking number not found', 'Check the number and try again.')
      }
    } catch {
      setResult(null)
      setState('error')
      toast.error(
        'Tracking temporarily unavailable',
        "We're unable to connect to the tracking service right now. Please try again shortly.",
      )
    }
  }

  const MethodIcon = (result && METHOD_ICON[result.shipping_method]) || Boxes

  return (
    <div
      className={cn(
        'w-full rounded-card border border-gray-200 bg-white/95 p-5 backdrop-blur-xl sm:p-6',
        elevated && 'shadow-elevation-3',
        className,
      )}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
        <Input
          containerClassName="flex-1"
          inputSize="lg"
          placeholder="FSN-YEAR-CN"
          value={value}
          onChange={handleChange}
          icon={<Search className="h-5 w-5" />}
          error={inputError ?? undefined}
          aria-label="Tracking number"
          autoComplete="off"
          spellCheck={false}
        />
        <Button type="submit" variant="primary" size="lg" loading={state === 'loading'} className="sm:w-auto text-white">
          Track shipment
        </Button>
      </form>

      {state === 'loading' && (
        <div className="mt-6 space-y-4 border-t border-gray-200 pt-6">
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
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-gray-200 pt-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-card bg-primary-50 text-primary-600">
            <PackageX className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-navy-900">Tracking number not found</h3>
          <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
            We could not find a shipment with this tracking number. Check it against your booking
            confirmation and try again, or contact our team and we will locate the consignment for you.
          </p>
          <Link to="/contact">
            <Button variant="secondary" size="sm">
              Contact support
            </Button>
          </Link>
        </div>
      )}

      {state === 'error' && (
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-gray-200 pt-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-card bg-status-delayed/10 text-status-delayed">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-navy-900">Tracking temporarily unavailable</h3>
          <p className="max-w-sm text-sm leading-relaxed text-text-secondary">
            We are unable to connect to the tracking service right now. Please try again shortly. If
            the problem continues, contact our operations team.
          </p>
          <Link to="/contact">
            <Button variant="secondary" size="sm">
              Contact support
            </Button>
          </Link>
        </div>
      )}

      {state === 'found' && result && (
        <div className="mt-6 animate-fade-up border-t border-gray-200 pt-6" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="font-mono font-tabular text-sm font-bold text-navy-900">{result.tracking_number}</span>
              <StatusBadge status={result.status} />
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
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
              <p className="mt-1 font-tabular text-sm font-bold text-navy-800">
                {result.weight != null ? `${result.weight} kg` : 'To be confirmed'}
              </p>
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-steel-400">
                <Boxes className="h-3.5 w-3.5" /> Cargo
              </p>
              <p className="mt-1 text-sm font-bold text-navy-800">{result.cargo_type}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-4 flex items-center gap-1.5 text-sm font-bold text-navy-900">
              <MapPin className="h-4 w-4 text-primary-500" />
              Tracking History
            </p>
            <TrackingTimeline events={result.events} />
          </div>
        </div>
      )}
    </div>
  )
}
