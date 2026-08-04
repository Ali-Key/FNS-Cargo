import { useEffect, useState } from 'react'
import { Download, Printer, Send } from 'lucide-react'
import { Button, Modal, Input, Textarea, Spinner } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import {
  getInvoiceForDocument,
  listPaymentsForInvoice,
  sendInvoiceEmail,
} from '@/services/financeService'
import { getSystemSettings } from '@/services/settingsService'
import type { InvoiceDocumentData, Payment, SystemSettings } from '@/types'
import type { DocumentCompanyInfo } from '@/lib/documents/DocumentHeader'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const DEFAULT_COMPANY: DocumentCompanyInfo = { company_name: 'FNS Cargo' }

interface InvoicePreviewModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string | null
}

export function InvoicePreviewModal({ open, onClose, invoiceId }: InvoicePreviewModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InvoiceDocumentData | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [lastPayment, setLastPayment] = useState<Payment | null>(null)

  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [sendOpen, setSendOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [sendTo, setSendTo] = useState('')
  const [sendSubject, setSendSubject] = useState('')
  const [sendMessage, setSendMessage] = useState('')

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    setSendOpen(false)
    Promise.all([getInvoiceForDocument(invoiceId), getSystemSettings(), listPaymentsForInvoice(invoiceId)])
      .then(([inv, settingsResult, payments]) => {
        setData(inv)
        setSettings(settingsResult)
        setLastPayment(payments[0] ?? null)
        const companyName = settingsResult?.company_name ?? 'FNS Cargo'
        setSendTo(inv?.customer?.email ?? '')
        setSendSubject(inv ? `Invoice ${inv.invoice_number} from ${companyName}` : '')
        setSendMessage(
          inv
            ? `Hi ${inv.customer?.full_name ?? 'there'},\n\nPlease find attached invoice ${inv.invoice_number} for ${formatCurrency(inv.amount, 2)}.\n\nThank you.`
            : '',
        )
      })
      .catch(() => toast.error('Unable to load invoice', 'Please try again.'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoiceId])

  const company: DocumentCompanyInfo = settings ?? DEFAULT_COMPANY

  async function buildDocument() {
    if (!data) throw new Error('Invoice not loaded')
    const { InvoiceDocument } = await import('@/lib/documents/InvoiceDocument')
    return (
      <InvoiceDocument invoice={data} company={company} lastPaymentMethod={lastPayment?.method ?? null} />
    )
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const doc = await buildDocument()
      const { downloadPdf } = await import('@/lib/documents/generatePdf')
      await downloadPdf(doc, `${data!.invoice_number}.pdf`)
    } catch (err) {
      toast.error('Unable to generate PDF', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      const doc = await buildDocument()
      const { printPdf } = await import('@/lib/documents/generatePdf')
      await printPdf(doc)
    } catch (err) {
      toast.error('Unable to open PDF', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setPrinting(false)
    }
  }

  async function handleSend() {
    if (!data) return
    setSending(true)
    try {
      const doc = await buildDocument()
      const { pdfToBase64 } = await import('@/lib/documents/generatePdf')
      const pdfBase64 = await pdfToBase64(doc)
      await sendInvoiceEmail({
        invoiceId: data.id,
        invoiceNumber: data.invoice_number,
        to: sendTo,
        subject: sendSubject,
        message: sendMessage,
        pdfBase64,
        filename: `${data.invoice_number}.pdf`,
        replyTo: settings?.company_email ?? null,
      })
      toast.success('Invoice sent', `${data.invoice_number} was emailed to ${sendTo}.`)
      setSendOpen(false)
    } catch (err) {
      toast.error('Unable to send invoice', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={data ? `Invoice ${data.invoice_number}` : 'Invoice'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            icon={<Send className="h-4 w-4" />}
            onClick={() => setSendOpen((v) => !v)}
            disabled={!data}
          >
            Send to customer
          </Button>
          <Button
            variant="secondary"
            icon={<Printer className="h-4 w-4" />}
            loading={printing}
            onClick={handlePrint}
            disabled={!data}
          >
            Print
          </Button>
          <Button
            variant="primary"
            icon={<Download className="h-4 w-4" />}
            loading={downloading}
            onClick={handleDownload}
            disabled={!data}
          >
            Download PDF
          </Button>
        </>
      }
    >
      {loading || !data ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <div className="space-y-6">
          {sendOpen && (
            <div className="space-y-3 rounded-lg border border-gray-300 bg-surface p-4">
              <p className="text-sm font-bold text-navy-900">Send invoice by email</p>
              <Input
                label="To"
                type="email"
                value={sendTo}
                onChange={(e) => setSendTo(e.target.value)}
                placeholder="customer@example.com"
              />
              <Input label="Subject" value={sendSubject} onChange={(e) => setSendSubject(e.target.value)} />
              <Textarea
                label="Message"
                rows={4}
                value={sendMessage}
                onChange={(e) => setSendMessage(e.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  loading={sending}
                  disabled={!sendTo.trim()}
                  onClick={handleSend}
                >
                  Send email
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between border-b border-gray-200 pb-4">
            <div>
              <p className="text-lg font-bold text-navy-900">{company.company_name}</p>
              {company.company_address && <p className="text-xs text-text-secondary">{company.company_address}</p>}
              {company.company_phone && <p className="text-xs text-text-secondary">{company.company_phone}</p>}
              {company.company_email && <p className="text-xs text-text-secondary">{company.company_email}</p>}
            </div>
            <div className="text-right text-sm">
              <p className="text-text-secondary">Invoice number</p>
              <p className="font-semibold text-navy-900">{data.invoice_number}</p>
              <p className="mt-2 text-text-secondary">Date issued</p>
              <p className="font-semibold text-navy-900">{formatDate(data.issued_at)}</p>
              {data.due_date && (
                <>
                  <p className="mt-2 text-text-secondary">Due date</p>
                  <p className="font-semibold text-navy-900">{formatDate(data.due_date)}</p>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold uppercase text-text-secondary">Bill to</p>
              <p className="mt-1 font-semibold text-navy-900">{data.customer?.full_name ?? 'Unknown customer'}</p>
              {data.customer?.company && <p className="text-sm text-steel-600">{data.customer.company}</p>}
              {data.customer?.address && <p className="text-sm text-steel-600">{data.customer.address}</p>}
              {data.customer?.phone && <p className="text-sm text-steel-600">{data.customer.phone}</p>}
              {data.customer?.email && <p className="text-sm text-steel-600">{data.customer.email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-text-secondary">Shipment</p>
              <p className="mt-1 text-sm text-steel-600">Tracking # {data.shipment?.tracking_number ?? '—'}</p>
              <p className="text-sm text-steel-600">
                {data.shipment ? `${data.shipment.origin} → ${data.shipment.destination}` : '—'}
              </p>
              <p className="text-sm text-steel-600">{data.shipment?.shipping_method ?? '—'}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-300">
            <table className="w-full text-sm">
              <thead className="bg-navy-700 text-white">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-bold uppercase">Description</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase">Weight</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase">Price / kg</th>
                  <th className="px-3 py-2 text-right text-xs font-bold uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-3 py-2.5 text-steel-700">
                    {data.shipment?.cargo_type ?? 'Cargo'} shipment — {data.shipment?.tracking_number ?? 'N/A'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-steel-700">
                    {data.shipment?.weight != null ? `${data.shipment.weight} kg` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right text-steel-700">
                    {data.shipment?.price_per_kg != null ? formatCurrency(data.shipment.price_per_kg, 2) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold text-navy-900">
                    {formatCurrency(data.amount, 2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="ml-auto w-full max-w-xs space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Amount</span>
              <span className="font-semibold text-navy-900">{formatCurrency(data.amount, 2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Paid</span>
              <span className="font-semibold text-navy-900">{formatCurrency(data.amount_paid, 2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-secondary">Status</span>
              <span className="font-semibold text-navy-900">{data.status}</span>
            </div>
            {lastPayment && (
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Payment method</span>
                <span className="font-semibold text-navy-900">{lastPayment.method}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-navy-700 pt-1.5 text-base">
              <span className="font-bold text-navy-900">Balance due</span>
              <span className="font-bold text-primary-600">{formatCurrency(data.balance, 2)}</span>
            </div>
          </div>

          {data.notes && (
            <div>
              <p className="text-xs font-bold uppercase text-text-secondary">Notes</p>
              <p className="mt-1 whitespace-pre-line text-sm text-steel-600">{data.notes}</p>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
