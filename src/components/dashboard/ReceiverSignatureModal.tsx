import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button, Modal, Spinner } from '@/components/ui'
import { useToast } from '@/context/ToastContext'
import { uploadReceiverSignature, getReceiverSignatureUrl } from '@/services/financeService'
import type { Invoice } from '@/types'

interface ReceiverSignatureModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  invoice: Invoice | null
}

/**
 * Captures the receiver's signature on a touch/mouse canvas at the counter and
 * uploads it as a PNG — the counter-workflow replacement for the paper
 * invoice's blank "Receiver sign" line.
 */
export function ReceiverSignatureModal({ open, onClose, onSaved, invoice }: ReceiverSignatureModalProps) {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [existingUrl, setExistingUrl] = useState<string | null>(null)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open || !invoice) return
    hasStrokeRef.current = false
    if (invoice.receiver_signature_path) {
      setLoadingExisting(true)
      getReceiverSignatureUrl(invoice.receiver_signature_path)
        .then(setExistingUrl)
        .catch(() => setExistingUrl(null))
        .finally(() => setLoadingExisting(false))
    } else {
      setExistingUrl(null)
    }
  }, [open, invoice])

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx?.clearRect(0, 0, canvas.width, canvas.height)
    hasStrokeRef.current = false
    setExistingUrl(null)
  }

  function pointFromEvent(canvas: HTMLCanvasElement, e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    }
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setPointerCapture(e.pointerId)
    drawingRef.current = true
    const ctx = canvas.getContext('2d')
    const { x, y } = pointFromEvent(canvas, e)
    ctx?.beginPath()
    ctx?.moveTo(x, y)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0b1f3a'
    const { x, y } = pointFromEvent(canvas, e)
    ctx.lineTo(x, y)
    ctx.stroke()
    hasStrokeRef.current = true
  }

  function handlePointerUp() {
    drawingRef.current = false
  }

  async function handleSave() {
    const canvas = canvasRef.current
    if (!invoice || !canvas || !hasStrokeRef.current) {
      toast.error('Nothing to save', 'Ask the receiver to sign in the box first.')
      return
    }
    setSaving(true)
    try {
      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (!blob) throw new Error('Could not capture the signature')
      await uploadReceiverSignature(invoice.id, blob)
      toast.success('Signature captured', 'It will appear on the printed invoice.')
      onSaved()
      onClose()
    } catch (err) {
      toast.error('Unable to save signature', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Receiver signature"
      description={invoice?.invoice_number}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="secondary" icon={<Eraser className="h-4 w-4" />} onClick={clearCanvas} disabled={saving}>
            Clear
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save signature
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-text-secondary">Have the receiver sign below to confirm delivery.</p>
        <div className="relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-white">
          {loadingExisting ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner className="h-5 w-5 text-navy-700" />
            </div>
          ) : existingUrl ? (
            <div className="flex h-48 flex-col items-center justify-center gap-2 bg-surface">
              <img src={existingUrl} alt="Captured receiver signature" className="max-h-32 object-contain" />
              <p className="text-xs text-text-secondary">Already signed. Clear to re-sign.</p>
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              width={480}
              height={192}
              className="h-48 w-full touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
