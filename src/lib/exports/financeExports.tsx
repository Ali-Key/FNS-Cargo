import {
  listPaymentsForExport,
  listInvoicesForExport,
  getPaymentForReceipt,
  type PaymentExportFilters,
} from '@/services/financeService'
import { getAnalyticsReport } from '@/services/analyticsService'
import { getSystemSettings } from '@/services/settingsService'
import { formatDate } from '@/utils/date'

/** Shared by the Payments page (scoped to a date range) and the Reports page (unscoped). */
export async function exportPaymentsExcel(filters: PaymentExportFilters = {}) {
  const rows = await listPaymentsForExport(filters)
  const { downloadWorkbook } = await import('@/lib/excel/generateExcel')
  await downloadWorkbook(
    [
      {
        name: 'Payments',
        columns: [
          { header: 'Payment date', key: 'paid_at', width: 16 },
          { header: 'Invoice #', key: 'invoice_number', width: 16 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Method', key: 'method', width: 14 },
          { header: 'Reference', key: 'reference', width: 20 },
          { header: 'Notes', key: 'notes', width: 28 },
        ],
        rows: rows.map((p) => ({
          paid_at: formatDate(p.paid_at),
          invoice_number: p.invoice?.invoice_number ?? '—',
          amount: p.amount,
          method: p.method,
          reference: p.reference ?? '',
          notes: p.notes ?? '',
        })),
      },
    ],
    `payment-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

/** Shared by the Invoices page and the Reports page. */
export async function exportOutstandingExcel() {
  const rows = await listInvoicesForExport('outstanding')
  const { downloadWorkbook } = await import('@/lib/excel/generateExcel')
  await downloadWorkbook(
    [
      {
        name: 'Outstanding balances',
        columns: [
          { header: 'Invoice #', key: 'invoice_number', width: 16 },
          { header: 'Customer', key: 'customer', width: 22 },
          { header: 'Shipment', key: 'shipment', width: 16 },
          { header: 'Amount', key: 'amount', width: 12 },
          { header: 'Paid', key: 'amount_paid', width: 12 },
          { header: 'Balance', key: 'balance', width: 12 },
          { header: 'Due date', key: 'due_date', width: 14 },
          { header: 'Status', key: 'status', width: 14 },
        ],
        rows: rows.map((inv) => ({
          invoice_number: inv.invoice_number,
          customer: inv.customer?.full_name ?? '—',
          shipment: inv.shipment?.tracking_number ?? '—',
          amount: inv.amount,
          amount_paid: inv.amount_paid,
          balance: inv.balance,
          due_date: inv.due_date ? formatDate(inv.due_date) : '',
          status: inv.status,
        })),
      },
    ],
    `outstanding-balance-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

/** Revenue report: monthly summary, popular routes, and top customers in one workbook. */
export async function exportRevenueExcel(months = 12) {
  const report = await getAnalyticsReport(months)
  const { downloadWorkbook } = await import('@/lib/excel/generateExcel')
  await downloadWorkbook(
    [
      {
        name: 'Monthly summary',
        columns: [
          { header: 'Month', key: 'month', width: 14 },
          { header: 'Collected', key: 'collected', width: 14 },
          { header: 'Invoiced', key: 'invoiced', width: 14 },
        ],
        rows: report.revenue_trend,
      },
      {
        name: 'Popular routes',
        columns: [
          { header: 'Origin', key: 'origin', width: 16 },
          { header: 'Destination', key: 'destination', width: 16 },
          { header: 'Shipments', key: 'shipments', width: 12 },
          { header: 'Value', key: 'value', width: 14 },
          { header: 'Avg weight (kg)', key: 'avg_weight', width: 16 },
        ],
        rows: report.top_routes,
      },
      {
        name: 'Top customers',
        columns: [
          { header: 'Customer', key: 'full_name', width: 24 },
          { header: 'Email', key: 'email', width: 26 },
          { header: 'Shipments', key: 'shipments', width: 12 },
          { header: 'Value', key: 'value', width: 14 },
        ],
        rows: report.top_customers,
      },
    ],
    `revenue-report-${months}mo-${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

export async function downloadPaymentReceipt(paymentId: string) {
  const receipt = await getPaymentForReceipt(paymentId)
  if (!receipt) throw new Error('Payment not found')
  const settings = await getSystemSettings()
  const [{ ReceiptDocument }, { downloadPdf }] = await Promise.all([
    import('@/lib/documents/ReceiptDocument'),
    import('@/lib/documents/generatePdf'),
  ])
  await downloadPdf(
    <ReceiptDocument payment={receipt} company={settings ?? { company_name: 'FNS Cargo' }} />,
    `receipt-${receipt.invoice?.invoice_number ?? receipt.id}.pdf`,
  )
}
