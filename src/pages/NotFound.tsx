import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page Not Found · FNS Cargo')

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-50 text-navy-600">
        <Compass className="h-8 w-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-navy-900">This page took a wrong turn</h1>
      <p className="max-w-sm text-steel-500">
        We couldn't find the page you were after. It may have moved, or never existed. Let's get you back on
        track.
      </p>
      <Link to="/">
        <Button variant="primary">Back to home</Button>
      </Link>
    </div>
  )
}
