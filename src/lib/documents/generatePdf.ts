import { pdf } from '@react-pdf/renderer'
import type { ReactElement } from 'react'

async function toBlob(doc: ReactElement): Promise<Blob> {
  return pdf(doc).toBlob()
}

/** Triggers a browser download of the rendered document. */
export async function downloadPdf(doc: ReactElement, filename: string): Promise<void> {
  const blob = await toBlob(doc)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Opens the rendered document in a new tab so the user can print from the native PDF viewer. */
export async function printPdf(doc: ReactElement): Promise<void> {
  const blob = await toBlob(doc)
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank', 'noopener')
  // Intentionally not revoked immediately — the new tab needs the blob URL to stay
  // alive while it loads the PDF viewer.
}

/**
 * Renders to an object URL for on-screen preview (e.g. an <iframe>). Caller owns the
 * URL's lifetime — revoke it with `URL.revokeObjectURL` once the preview is done with it.
 */
export async function getPdfPreviewUrl(doc: ReactElement): Promise<string> {
  const blob = await toBlob(doc)
  return URL.createObjectURL(blob)
}

/** Base64-encodes the rendered document for use as an email attachment. */
export async function pdfToBase64(doc: ReactElement): Promise<string> {
  const blob = await toBlob(doc)
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
