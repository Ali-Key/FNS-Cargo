import {
  getPaymentForReceipt,
  listPaymentsForExport,
  type PaymentListParams,
} from '@/services/financeService'
import { getSystemSettings } from '@/services/settingsService'
import { buildCsv, downloadCsv } from './csv'
import { formatDate } from '@/utils/date'

export async function downloadPaymentReceipt(paymentId: string) {
  const receipt = await getPaymentForReceipt(paymentId)
  if (!receipt) throw new Error('Payment not found')
  const settings = await getSystemSettings()
  const [{ ReceiptDocument }, { downloadPdf }] = await Promise.all([
    import('@/lib/documents/ReceiptDocument'),
    import('@/lib/documents/generatePdf'),
  ])
  await downloadPdf(
    <ReceiptDocument payment={receipt} company={settings ?? { company_name: 'FSN Cargo' }} />,
    `receipt-${receipt.invoice?.invoice_number ?? receipt.id}.pdf`,
  )
}

export async function exportPaymentsCsv(filters: Pick<PaymentListParams, 'search' | 'method'> = {}) {
  const rows = await listPaymentsForExport(filters)
  const csv = buildCsv(
    [
      { key: 'paid_at', label: 'Date' },
      { key: 'shipment', label: 'Shipment' },
      { key: 'customer', label: 'Customer' },
      { key: 'amount', label: 'Amount' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
      { key: 'recorded_by', label: 'Recorded by' },
    ],
    rows.map((p) => ({
      paid_at: formatDate(p.paid_at, ''),
      shipment: p.invoice?.shipment?.tracking_number ?? '',
      customer: p.invoice?.shipment?.customer_name ?? '',
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? '',
      recorded_by: p.recorder?.full_name ?? '',
    })),
  )
  downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}
