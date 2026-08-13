import { useEffect, useRef, useState } from 'react'
import { Download, Printer } from 'lucide-react'
import { Button, Modal, Spinner } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { getInvoiceForDocument, getReceiverSignatureUrl, listPaymentsForInvoice } from '@/services/financeService'
import { getSystemSettings } from '@/services/settingsService'
import type { InvoiceDocumentData, Payment, SystemSettings } from '@/types'
import type { DocumentCompanyInfo } from '@/lib/documents/DocumentHeader'

const DEFAULT_COMPANY: DocumentCompanyInfo = { company_name: 'FSN Cargo' }

interface InvoicePreviewModalProps {
  open: boolean
  onClose: () => void
  invoiceId: string | null
}

/**
 * Previews the actual PDF (not a hand-copied HTML re-implementation) so this
 * view can never drift from what Print/Download produce — it's the same
 * InvoiceDocument, rendered once and shown in an iframe.
 */
export function InvoicePreviewModal({ open, onClose, invoiceId }: InvoicePreviewModalProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<InvoiceDocumentData | null>(null)
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [lastPayment, setLastPayment] = useState<Payment | null>(null)
  const [receiverSignatureUrl, setReceiverSignatureUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [downloading, setDownloading] = useState(false)
  const [printing, setPrinting] = useState(false)
  const previewUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open || !invoiceId) return
    setLoading(true)
    Promise.all([getInvoiceForDocument(invoiceId), getSystemSettings(), listPaymentsForInvoice(invoiceId)])
      .then(async ([inv, settingsResult, payments]) => {
        setData(inv)
        setSettings(settingsResult)
        setLastPayment(payments[0] ?? null)
        setReceiverSignatureUrl(inv ? await getReceiverSignatureUrl(inv.receiver_signature_path) : null)
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
      <InvoiceDocument
        invoice={data}
        company={company}
        lastPaymentMethod={lastPayment?.method ?? null}
        receiverSignatureUrl={receiverSignatureUrl}
      />
    )
  }

  // Render the preview once the invoice data is in — same document Print/Download use.
  useEffect(() => {
    if (!data || loading) return
    let cancelled = false
    buildDocument()
      .then(async (doc) => {
        const { getPdfPreviewUrl } = await import('@/lib/documents/generatePdf')
        const url = await getPdfPreviewUrl(doc)
        if (cancelled) {
          URL.revokeObjectURL(url)
          return
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        previewUrlRef.current = url
        setPreviewUrl(url)
      })
      .catch(() => toast.error('Unable to render invoice', 'Please try again.'))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, loading])

  // Release the blob URL once the modal is done with it (close or unmount).
  useEffect(() => {
    if (open) return
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
      setPreviewUrl(null)
    }
  }, [open])

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

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
            icon={<Printer className="h-4 w-4" />}
            loading={printing}
            onClick={handlePrint}
            disabled={!data}
          >
            Print
          </Button>
          <Button
            variant="deck"
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
      {loading || !data || !previewUrl ? (
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      ) : (
        <iframe
          title={`Invoice ${data.invoice_number} preview`}
          src={previewUrl}
          className="h-[70vh] w-full rounded-deck-sm border border-deck-100"
        />
      )}
    </Modal>
  )
}
