import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import PublicLayout from '@/layouts/PublicLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { Spinner } from '@/components/ui'
import Home from '@/pages/Home'
import Services from '@/pages/Services'
import Tracking from '@/pages/Tracking'
import About from '@/pages/About'
import Contact from '@/pages/Contact'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import NotFound from '@/pages/NotFound'
import { ScrollToTop } from '@/components/common/ScrollToTop'

// The FSN Cargo console is split into its own chunk so it never ships with the
// public bundle (keeps the marketing site lean and isolates Recharts).
const Login = lazy(() => import('@/pages/auth/Login'))
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'))
const Overview = lazy(() => import('@/pages/dashboard/Overview'))
const Shipments = lazy(() => import('@/pages/shipments/Shipments'))
const ShipmentDetail = lazy(() => import('@/pages/shipments/ShipmentDetail'))
const TrackingUpdates = lazy(() => import('@/pages/tracking/TrackingUpdates'))
const Customers = lazy(() => import('@/pages/customers/Customers'))
const Quotes = lazy(() => import('@/pages/quotes/Quotes'))
const Payments = lazy(() => import('@/pages/payments/Payments'))
const Analytics = lazy(() => import('@/pages/reports/Analytics'))
const Settings = lazy(() => import('@/pages/settings/Settings'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Spinner size={28} />
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/tracking" element={<Tracking />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Route>

        <Route path="/login" element={<Login />} />

        <Route element={<ProtectedRoute />}>
          {/* DashboardLayout carries its own Suspense boundary around the
              outlet, so loading a page chunk swaps the work area only — the
              rail, topbar and their state stay mounted. */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/shipments" element={<Shipments />} />
            <Route path="/dashboard/shipments/:id" element={<ShipmentDetail />} />
            <Route path="/dashboard/tracking" element={<TrackingUpdates />} />
            <Route path="/dashboard/customers" element={<Customers />} />
            <Route path="/dashboard/quotes" element={<Quotes />} />
            {/* Settings is every user's own account first; its admin bands
                (team, company) are gated inside the page. */}
            <Route path="/dashboard/settings" element={<Settings />} />
            {/* Admin-only areas. Finance and Reports expose revenue, which the
                payments RLS policy and analytics_report() also restrict to admins. */}
            <Route element={<ProtectedRoute allow={['Admin']} />}>
              <Route path="/dashboard/payments" element={<Payments />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
