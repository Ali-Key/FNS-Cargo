import {
  getPaymentForReceipt,
  listInvoicesForExport,
  listPaymentsForExport,
  type InvoiceListParams,
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
    <ReceiptDocument payment={receipt} company={settings ?? { company_name: 'FNS Cargo' }} />,
    `receipt-${receipt.invoice?.invoice_number ?? receipt.id}.pdf`,
  )
}

export async function exportInvoicesCsv(filters: Pick<InvoiceListParams, 'search' | 'status' | 'view'> = {}) {
  const rows = await listInvoicesForExport(filters)
  const csv = buildCsv(
    [
      { key: 'invoice_number', label: 'Invoice' },
      { key: 'customer', label: 'Customer' },
      { key: 'shipment', label: 'Tracking #' },
      { key: 'amount', label: 'Amount' },
      { key: 'amount_paid', label: 'Paid' },
      { key: 'balance', label: 'Balance' },
      { key: 'status', label: 'Status' },
      { key: 'due_date', label: 'Due' },
      { key: 'issued_at', label: 'Issued' },
    ],
    rows.map((inv) => ({
      invoice_number: inv.invoice_number,
      customer: inv.customer?.full_name ?? '',
      shipment: inv.shipment?.tracking_number ?? '',
      amount: inv.amount,
      amount_paid: inv.amount_paid,
      balance: inv.balance,
      status: inv.status,
      due_date: formatDate(inv.due_date, ''),
      issued_at: formatDate(inv.issued_at, ''),
    })),
  )
  downloadCsv(`invoices-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}

export async function exportPaymentsCsv(filters: Pick<PaymentListParams, 'search' | 'method'> = {}) {
  const rows = await listPaymentsForExport(filters)
  const csv = buildCsv(
    [
      { key: 'paid_at', label: 'Date' },
      { key: 'invoice_number', label: 'Invoice' },
      { key: 'amount', label: 'Amount' },
      { key: 'method', label: 'Method' },
      { key: 'reference', label: 'Reference' },
    ],
    rows.map((p) => ({
      paid_at: formatDate(p.paid_at, ''),
      invoice_number: p.invoice?.invoice_number ?? '',
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? '',
    })),
  )
  downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}
