import { getShipment } from '@/services/shipmentsService'
import { getSystemSettings } from '@/services/settingsService'
import type { LabelSize } from '@/lib/documents/LabelDocument'

async function buildLabel(shipmentId: string, size: LabelSize) {
  const [shipment, settings] = await Promise.all([getShipment(shipmentId), getSystemSettings()])
  if (!shipment) throw new Error('Shipment not found')
  const { LabelDocument } = await import('@/lib/documents/LabelDocument')
  return {
    doc: (
      <LabelDocument
        shipment={shipment}
        companyName={settings?.company_name ?? 'FNS Cargo'}
        companyWebsite={settings?.company_website}
        size={size}
      />
    ),
    filename: `waybill-${shipment.tracking_number}.pdf`,
  }
}

export async function downloadWaybillLabel(shipmentId: string, size: LabelSize = '100x150') {
  const { doc, filename } = await buildLabel(shipmentId, size)
  const { downloadPdf } = await import('@/lib/documents/generatePdf')
  await downloadPdf(doc, filename)
}

export async function printWaybillLabel(shipmentId: string, size: LabelSize = '100x150') {
  const { doc } = await buildLabel(shipmentId, size)
  const { printPdf } = await import('@/lib/documents/generatePdf')
  await printPdf(doc)
}
