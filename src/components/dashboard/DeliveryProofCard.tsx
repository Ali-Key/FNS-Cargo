import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, ExternalLink, Trash2, Upload } from 'lucide-react'
import { Button, Spinner } from '@/components/ui'
import { ConfirmDialog } from './ConfirmDialog'
import { useToast } from '@/context/ToastContext'
import {
  uploadDeliveryProof,
  getDeliveryProofUrl,
  removeDeliveryProof,
} from '@/services/shipmentsService'

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'

interface DeliveryProofCardProps {
  shipmentId: string
  /** Storage object path, not a URL — the bucket is private. */
  proofPath: string | null
  onChange: () => void
  /** Only admins may delete a proof, matching the storage policy. */
  canDelete?: boolean
}

/**
 * Proof of delivery lives in a private bucket, so the stored value is an object
 * path and every view goes through a short-lived signed URL that is re-minted
 * on mount rather than cached.
 */
export function DeliveryProofCard({
  shipmentId,
  proofPath,
  onChange,
  canDelete,
}: DeliveryProofCardProps) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [resolving, setResolving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const [removing, setRemoving] = useState(false)

  const resolve = useCallback(async () => {
    if (!proofPath) {
      setUrl(null)
      return
    }
    setResolving(true)
    try {
      setUrl(await getDeliveryProofUrl(proofPath))
    } catch {
      setUrl(null)
    } finally {
      setResolving(false)
    }
  }, [proofPath])

  useEffect(() => {
    void resolve()
  }, [resolve])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset immediately so picking the same file twice still fires a change.
    e.target.value = ''
    if (!file) return

    if (file.size > MAX_BYTES) {
      toast.error('File too large', 'Delivery proof must be 5 MB or smaller.')
      return
    }

    setUploading(true)
    try {
      await uploadDeliveryProof(shipmentId, file)
      toast.success('Proof uploaded', 'The delivery proof is attached to this shipment.')
      onChange()
    } catch (err) {
      toast.error('Upload failed', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleRemove() {
    if (!proofPath) return
    setRemoving(true)
    try {
      await removeDeliveryProof(shipmentId, proofPath)
      toast.success('Proof removed', 'The delivery proof has been deleted.')
      setConfirmRemove(false)
      onChange()
    } catch (err) {
      toast.error('Unable to remove proof', err instanceof Error ? err.message : 'Please try again.')
    } finally {
      setRemoving(false)
    }
  }

  const isPdf = proofPath?.toLowerCase().endsWith('.pdf')

  return (
    <div className="border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary-500" />
        <h3 className="text-sm font-bold text-navy-900">Delivery proof</h3>
      </div>

      {proofPath ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border border-gray-300 bg-surface">
            {resolving ? (
              <div className="flex h-32 items-center justify-center">
                <Spinner className="h-5 w-5 text-navy-700" />
              </div>
            ) : isPdf || !url ? (
              <div className="flex h-32 items-center justify-center text-sm text-text-secondary">
                {url ? 'PDF document' : 'Preview unavailable'}
              </div>
            ) : (
              <img src={url} alt="Proof of delivery" className="h-40 w-full object-cover" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {url && (
              <Button
                variant="secondary"
                size="sm"
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
              >
                Open
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              icon={<Upload className="h-4 w-4" />}
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Replace
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="h-4 w-4" />}
                onClick={() => setConfirmRemove(true)}
              >
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-steel-400">Links expire after five minutes.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-text-secondary">
            Attach a signed receipt or photo once the shipment has been handed over.
          </p>
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload className="h-4 w-4" />}
            loading={uploading}
            onClick={() => fileRef.current?.click()}
          >
            Upload proof
          </Button>
          <p className="text-xs text-steel-400">JPG, PNG, WebP or PDF, up to 5 MB.</p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        onChange={handleFile}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
      />

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemove}
        loading={removing}
        title="Remove delivery proof?"
        confirmLabel="Remove"
        description="The file is permanently deleted from storage. This cannot be undone."
      />
    </div>
  )
}
