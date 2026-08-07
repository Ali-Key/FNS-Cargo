import { listShipmentsForExport, type ShipmentFilters } from '@/services/shipmentsService'
import { getSystemSettings } from '@/services/settingsService'
import { buildCsv, downloadCsv } from './csv'
import { formatDate } from '@/utils/date'

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

export async function exportShipmentsCsv(filters: ShipmentFilters = {}) {
  const rows = await listShipmentsForExport(filters)
  const csv = buildCsv(
    [
      { key: 'tracking_number', label: 'Tracking #' },
      { key: 'customer', label: 'Customer' },
      { key: 'origin', label: 'Origin' },
      { key: 'destination', label: 'Destination' },
      { key: 'status', label: 'Status' },
      { key: 'shipping_method', label: 'Method' },
      { key: 'payment_status', label: 'Payment' },
      { key: 'weight', label: 'Weight (kg)' },
      { key: 'total_price', label: 'Total price' },
      { key: 'estimated_delivery', label: 'ETA' },
      { key: 'created_at', label: 'Booked' },
    ],
    rows.map((s) => ({
      tracking_number: s.tracking_number,
      customer: s.customer?.full_name ?? '',
      origin: s.origin,
      destination: s.destination,
      status: s.status,
      shipping_method: s.shipping_method,
      payment_status: s.payment_status,
      weight: s.weight,
      total_price: s.total_price,
      estimated_delivery: formatDate(s.estimated_delivery, ''),
      created_at: formatDate(s.created_at, ''),
    })),
  )
  downloadCsv(`shipments-${new Date().toISOString().slice(0, 10)}.csv`, csv)
}
