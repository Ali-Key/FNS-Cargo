import { useState } from 'react'
import { Package, TrendingUp, Receipt, Wallet } from 'lucide-react'
import { PageHeader, ExportMenu, DateRangeFilter } from '@/components/dashboard'
import { SectionCard } from '@/components/ui'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { exportShipmentsExcel, exportShipmentReportPdf } from '@/lib/exports/shipmentsExports'
import { exportPaymentsExcel, exportOutstandingExcel, exportRevenueExcel } from '@/lib/exports/financeExports'

interface ReportRowProps {
  icon: typeof Package
  title: string
  description: string
  action: React.ReactNode
}

function ReportRow({ icon: Icon, title, description, action }: ReportRowProps) {
  return (
    <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-navy-50 text-navy-700">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold text-navy-900">{title}</p>
          <p className="mt-0.5 text-sm text-text-secondary">{description}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">{action}</div>
    </li>
  )
}

export default function Reports() {
  useDocumentTitle('Reports | FNS Cargo')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Export operational and financial reports as Excel or PDF." />

      <SectionCard title="Available reports" flush>
        <ul className="divide-y divide-steel-100">
          <ReportRow
            icon={Package}
            title="Shipment report"
            description="Every shipment with route, weight, value, status, and payment."
            action={
              <ExportMenu
                items={[
                  { label: 'Excel', onClick: exportShipmentsExcel },
                  { label: 'PDF', onClick: exportShipmentReportPdf },
                ]}
              />
            }
          />
          <ReportRow
            icon={TrendingUp}
            title="Revenue report"
            description="Monthly summary, popular routes, and top customers for the last 12 months."
            action={<ExportMenu items={[{ label: 'Excel', onClick: exportRevenueExcel }]} />}
          />
          <ReportRow
            icon={Receipt}
            title="Payment report"
            description="Every payment received, optionally scoped to a date range."
            action={
              <>
                <DateRangeFilter
                  from={paymentFrom}
                  to={paymentTo}
                  onFromChange={setPaymentFrom}
                  onToChange={setPaymentTo}
                />
                <ExportMenu
                  items={[
                    {
                      label: 'Excel',
                      onClick: () =>
                        exportPaymentsExcel({ from: paymentFrom || undefined, to: paymentTo || undefined }),
                    },
                  ]}
                />
              </>
            }
          />
          <ReportRow
            icon={Wallet}
            title="Outstanding balance report"
            description="Every issued invoice that still has a balance owing."
            action={<ExportMenu items={[{ label: 'Excel', onClick: exportOutstandingExcel }]} />}
          />
        </ul>
      </SectionCard>
    </div>
  )
}
