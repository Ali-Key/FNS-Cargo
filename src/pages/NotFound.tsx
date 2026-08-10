import { Compass } from 'lucide-react'
import { ButtonLink } from '@/components/site'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page Not Found | FNS Cargo')

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-card bg-navy-50 text-navy-600">
        <Compass className="h-7 w-7" aria-hidden />
      </span>
      <h1 className="text-3xl font-extrabold text-navy-900">This page took a wrong turn</h1>
      <p className="max-w-sm text-pretty text-text-secondary">
        We couldn't find the page you were after. It may have moved, or never existed. Let's get you
        back on track.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-3">
        <ButtonLink to="/">Back to home</ButtonLink>
        <ButtonLink to="/tracking" variant="secondary">
          Track a shipment
        </ButtonLink>
      </div>
    </div>
  )
}
