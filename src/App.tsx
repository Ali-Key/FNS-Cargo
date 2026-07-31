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
import { ScrollToTop } from "@/components/common/ScrollToTop";


// Admin/dashboard code is split into its own chunk so it never ships with the
// public bundle (keeps the public site lean and isolates Recharts to the dashboard).
const Login = lazy(() => import('@/pages/admin/Login'))
const DashboardLayout = lazy(() => import('@/layouts/DashboardLayout'))
const Overview = lazy(() => import('@/pages/admin/Overview'))
const Shipments = lazy(() => import('@/pages/admin/Shipments'))
const ShipmentDetail = lazy(() => import('@/pages/admin/ShipmentDetail'))
const TrackingUpdates = lazy(() => import('@/pages/admin/TrackingUpdates'))
const Customers = lazy(() => import('@/pages/admin/Customers'))
const Quotes = lazy(() => import('@/pages/admin/Quotes'))
const Finance = lazy(() => import('@/pages/admin/Finance'))
const Analytics = lazy(() => import('@/pages/admin/Analytics'))
const Users = lazy(() => import('@/pages/admin/Users'))
const Settings = lazy(() => import('@/pages/admin/Settings'))
const Profile = lazy(() => import('@/pages/admin/Profile'))

function RouteFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-steel-50">
      <Spinner className="h-7 w-7 text-navy-700" />
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
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Overview />} />
            <Route path="/dashboard/shipments" element={<Shipments />} />
            <Route path="/dashboard/shipments/:id" element={<ShipmentDetail />} />
            <Route path="/dashboard/tracking" element={<TrackingUpdates />} />
            <Route path="/dashboard/customers" element={<Customers />} />
            <Route path="/dashboard/quotes" element={<Quotes />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            {/* Admin-only areas. Finance and Analytics expose revenue, which the
                invoices RLS policy and analytics_report() also restrict to admins. */}
            <Route element={<ProtectedRoute allow={['Admin']} />}>
              <Route path="/dashboard/finance" element={<Finance />} />
              <Route path="/dashboard/analytics" element={<Analytics />} />
              <Route path="/dashboard/users" element={<Users />} />
              <Route path="/dashboard/settings" element={<Settings />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
