import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Receipt, FileText } from 'lucide-react'
import { Dropdown } from '@/components/ui'
import { listShipments } from '@/services/shipmentsService'
import { listInvoices } from '@/services/financeService'
import { listQuotes } from '@/services/quotesService'
import { useAuth } from '@/context/AuthContext'

interface NotificationItem {
  key: string
  label: string
  icon: React.ReactNode
  to: string
}

/**
 * Alerts derived from data that already exists (delayed shipments, overdue
 * invoices, pending quotes) — no notifications table, no read/unread state.
 */
export function NotificationsMenu() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<NotificationItem[]>([])

  useEffect(() => {
    let cancelled = false
    const isAdmin = role === 'Admin'

    Promise.all([
      listShipments({ page: 1, pageSize: 5, delayedOnly: true }).catch(() => ({ rows: [], count: 0 })),
      listQuotes({ page: 1, pageSize: 5, status: 'Pending' }).catch(() => ({ rows: [], count: 0 })),
      isAdmin
        ? listInvoices({ page: 1, pageSize: 5, view: 'overdue' }).catch(() => ({ rows: [], count: 0 }))
        : Promise.resolve({ rows: [], count: 0 }),
    ]).then(([shipments, quotes, invoices]) => {
      if (cancelled) return
      setItems([
        ...shipments.rows.map((s) => ({
          key: `shipment:${s.id}`,
          label: `${s.tracking_number} is delayed`,
          icon: <AlertTriangle className="h-4 w-4 text-status-delayed" aria-hidden="true" />,
          to: `/dashboard/shipments/${s.id}`,
        })),
        ...invoices.rows.map((inv) => ({
          key: `invoice:${inv.id}`,
          label: `Invoice ${inv.invoice_number} is overdue`,
          icon: <Receipt className="h-4 w-4 text-status-delayed" aria-hidden="true" />,
          to: '/dashboard/invoices',
        })),
        ...quotes.rows.map((q) => ({
          key: `quote:${q.id}`,
          label: `New quote request from ${q.full_name}`,
          icon: <FileText className="h-4 w-4 text-status-pending" aria-hidden="true" />,
          to: '/dashboard/quotes',
        })),
      ])
    })

    return () => {
      cancelled = true
    }
  }, [role])

  const count = items.length
  const dropdownItems =
    count > 0
      ? items.map((item) => ({ label: item.label, icon: item.icon, onClick: () => navigate(item.to) }))
      : [{ label: 'No alerts right now', onClick: () => {} }]

  return (
    <Dropdown
      align="right"
      items={dropdownItems}
      trigger={
        <button
          type="button"
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-control text-steel-600 transition-colors duration-180 hover:bg-steel-100 hover:text-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-500"
          aria-label={count > 0 ? `${count} alerts` : 'Notifications'}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-delayed px-1 text-[10px] font-bold text-white">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      }
    />
  )
}
