import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, AlertTriangle, Receipt, FileText } from 'lucide-react'
import { Dropdown } from '@/components/ui'
import { listShipments } from '@/services/shipmentsService'
import { listInvoices } from '@/services/financeService'
import { listQuotes } from '@/services/quotesService'
import { useAuth } from '@/context/AuthContext'
import { useCachedResource } from '@/hooks/useCachedResource'

type AlertKind = 'delayed' | 'overdue' | 'quote'

/** Serialisable on purpose: the icon is derived at render, not cached. */
interface Alert {
  key: string
  kind: AlertKind
  label: string
  to: string
}

const ALERT_ICON: Record<AlertKind, React.ReactNode> = {
  delayed: <AlertTriangle className="h-4 w-4 text-status-delayed" aria-hidden="true" />,
  overdue: <Receipt className="h-4 w-4 text-status-delayed" aria-hidden="true" />,
  quote: <FileText className="h-4 w-4 text-status-pending" aria-hidden="true" />,
}

/** Stable identity, so the fallback never re-triggers a dependent render. */
const NO_ALERTS: Alert[] = []

/**
 * Alerts derived from data that already exists (delayed shipments, overdue
 * invoices, pending quotes) — no notifications table, no read/unread state.
 */
export function NotificationsMenu() {
  const { role } = useAuth()
  const navigate = useNavigate()
  const isAdmin = role === 'Admin'

  // Three list queries back one bell. They are cached and shared like any other
  // page resource, so opening the console costs them once rather than on every
  // navigation, and a reload paints the badge before the network answers.
  const fetchAlerts = useCallback(async (): Promise<Alert[]> => {
    const [shipments, quotes, invoices] = await Promise.all([
      listShipments({ page: 1, pageSize: 5, delayedOnly: true }).catch(() => ({ rows: [], count: 0 })),
      listQuotes({ page: 1, pageSize: 5, status: 'Pending' }).catch(() => ({ rows: [], count: 0 })),
      isAdmin
        ? listInvoices({ page: 1, pageSize: 5, view: 'overdue' }).catch(() => ({ rows: [], count: 0 }))
        : Promise.resolve({ rows: [], count: 0 }),
    ])

    return [
      ...shipments.rows.map((s) => ({
        key: `shipment:${s.id}`,
        kind: 'delayed' as const,
        label: `${s.tracking_number} is delayed`,
        to: `/dashboard/shipments/${s.id}`,
      })),
      ...invoices.rows.map((inv) => ({
        key: `invoice:${inv.id}`,
        kind: 'overdue' as const,
        label: `Invoice ${inv.invoice_number} is overdue`,
        to: `/dashboard/shipments/${inv.shipment_id}`,
      })),
      ...quotes.rows.map((q) => ({
        key: `quote:${q.id}`,
        kind: 'quote' as const,
        label: `New quote request from ${q.full_name}`,
        to: '/dashboard/quotes',
      })),
    ]
  }, [isAdmin])

  const { data } = useCachedResource<Alert[]>(
    `alerts:${isAdmin ? 'admin' : 'ops'}`,
    fetchAlerts,
    { staleTime: 60_000 },
  )
  const items = data ?? NO_ALERTS

  const count = items.length
  const dropdownItems =
    count > 0
      ? items.map((item) => ({
          label: item.label,
          icon: ALERT_ICON[item.kind],
          onClick: () => navigate(item.to),
        }))
      : [{ label: 'No alerts right now', onClick: () => {} }]

  return (
    <Dropdown
      align="right"
      items={dropdownItems}
      trigger={
        <button
          type="button"
          className="deck-focus relative inline-flex h-9 w-9 items-center justify-center rounded-deck-sm text-deck-500 transition-colors hover:bg-deck-100 hover:text-deck-900"
          aria-label={count > 0 ? `${count} operational alerts` : 'Notifications'}
        >
          <Bell className="h-[18px] w-[18px]" aria-hidden="true" />
          {count > 0 && (
            <span className="absolute right-0.5 top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-status-delayed px-1 text-[10px] font-bold text-white ring-2 ring-panel">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      }
    />
  )
}
