import { listShipmentsForExport, type ShipmentFilters } from '@/services/shipmentsService'
import { getSystemSettings } from '@/services/settingsService'
import { formatDate } from '@/utils/date'
import type { ShippingMethod } from '@/types'

/** Shared by the Shipments list page (scoped to active filters) and the Reports page (unfiltered). */
export async function exportShipmentsExcel(filters: ShipmentFilters = {}) {
  const rows = await listShipmentsForExport(filters)
  const { downloadWorkbook } = await import('@/lib/excel/generateExcel')
  await downloadWorkbook(
    [
      {
        name: 'Shipments',
        columns: [
          { header: 'Tracking #', key: 'tracking_number', width: 16 },
          { header: 'Customer', key: 'customer_name', width: 20 },
          { header: 'Origin', key: 'origin', width: 16 },
          { header: 'Destination', key: 'destination', width: 16 },
          { header: 'Method', key: 'shipping_method', width: 14 },
          { header: 'Weight (kg)', key: 'weight', width: 12 },
          { header: 'Value', key: 'total_price', width: 12 },
          { header: 'Status', key: 'status', width: 16 },
          { header: 'Payment', key: 'payment_status', width: 14 },
          { header: 'Est. delivery', key: 'estimated_delivery', width: 14 },
        ],
        rows: rows.map((s) => ({
          tracking_number: s.tracking_number,
          customer_name: s.customer_name,
          origin: s.origin,
          destination: s.destination,
          shipping_method: s.shipping_method as ShippingMethod,
          weight: s.weight,
          total_price: s.total_price,
          status: s.status,
          payment_status: s.payment_status,
          estimated_delivery: s.estimated_delivery ? formatDate(s.estimated_delivery) : '',
        })),
      },
    ],
    `shipment-report-${new Date().toISOString().slice(0, 10)}.xlsx`,
  )
}

export async function exportShipmentReportPdf(filters: ShipmentFilters = {}, filterSummary = 'All shipments') {
  const rows = await listShipmentsForExport(filters)
  const settings = await getSystemSettings()
  const [{ ShipmentReportDocument }, { downloadPdf }] = await Promise.all([
    import('@/lib/documents/ShipmentReportDocument'),
    import('@/lib/documents/generatePdf'),
  ])
  await downloadPdf(
    <ShipmentReportDocument
      shipments={rows}
      company={settings ?? { company_name: 'FNS Cargo' }}
      filterSummary={filterSummary}
    />,
    `shipment-report-${new Date().toISOString().slice(0, 10)}.pdf`,
  )
}
