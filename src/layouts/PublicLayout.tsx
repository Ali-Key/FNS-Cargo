import { Outlet } from 'react-router-dom'
import { Header } from '@/components/common/Header'
import { Footer } from '@/components/common/Footer'

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
