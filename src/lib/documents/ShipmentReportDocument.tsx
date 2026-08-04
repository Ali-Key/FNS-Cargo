import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { ShipmentWithCustomer } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 48, fontSize: 8, color: PDF_COLORS.steel700, fontFamily: 'Helvetica' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  title: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.navy900 },
  subtitle: { fontSize: 8, color: PDF_COLORS.steel500 },
  generated: { fontSize: 7.5, color: PDF_COLORS.steel500 },
  headRow: { flexDirection: 'row', backgroundColor: PDF_COLORS.navy700, paddingVertical: 6, paddingHorizontal: 6, marginTop: 12 },
  headCell: { fontSize: 7, fontWeight: 700, color: PDF_COLORS.white, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.steel200,
  },
  cell: { fontSize: 7.5 },
  colTracking: { width: '14%' },
  colCustomer: { width: '17%' },
  colRoute: { width: '22%' },
  colMethod: { width: '13%' },
  colStatus: { width: '13%' },
  colValue: { width: '11%', textAlign: 'right' },
  colDate: { width: '10%', textAlign: 'right' },
  summary: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.navy700,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: { fontSize: 9, color: PDF_COLORS.steel500 },
  summaryValue: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 7.5,
    color: PDF_COLORS.steel500,
  },
})

export interface ShipmentReportDocumentProps {
  shipments: ShipmentWithCustomer[]
  company: DocumentCompanyInfo
  /** Human-readable description of the active filters, e.g. "Status: In Transit · Search: nairobi". */
  filterSummary: string
}

export function ShipmentReportDocument({ shipments, company, filterSummary }: ShipmentReportDocumentProps) {
  const totalValue = shipments.reduce((sum, s) => sum + (s.total_price ?? 0), 0)

  return (
    <Document title="Shipment report">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <DocumentHeader company={company} />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Shipment report</Text>
            <Text style={styles.subtitle}>{filterSummary}</Text>
          </View>
          <Text style={styles.generated}>{shipments.length} shipment{shipments.length === 1 ? '' : 's'}</Text>
        </View>

        <View style={styles.headRow}>
          <Text style={[styles.headCell, styles.colTracking]}>Tracking #</Text>
          <Text style={[styles.headCell, styles.colCustomer]}>Customer</Text>
          <Text style={[styles.headCell, styles.colRoute]}>Route</Text>
          <Text style={[styles.headCell, styles.colMethod]}>Method</Text>
          <Text style={[styles.headCell, styles.colStatus]}>Status</Text>
          <Text style={[styles.headCell, styles.colValue]}>Value</Text>
          <Text style={[styles.headCell, styles.colDate]}>Est. delivery</Text>
        </View>

        {shipments.map((s) => (
          <View key={s.id} style={styles.row} wrap={false}>
            <Text style={[styles.cell, styles.colTracking]}>{s.tracking_number}</Text>
            <Text style={[styles.cell, styles.colCustomer]}>{s.customer_name}</Text>
            <Text style={[styles.cell, styles.colRoute]}>
              {s.origin} → {s.destination}
            </Text>
            <Text style={[styles.cell, styles.colMethod]}>{s.shipping_method}</Text>
            <Text style={[styles.cell, styles.colStatus]}>{s.status}</Text>
            <Text style={[styles.cell, styles.colValue]}>{formatCurrency(s.total_price, 2)}</Text>
            <Text style={[styles.cell, styles.colDate]}>{formatDate(s.estimated_delivery, '—')}</Text>
          </View>
        ))}

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Total shipment value</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalValue, 2)}</Text>
        </View>

        <Text style={styles.footer} fixed>
          {company.company_name} · Generated {formatDate(new Date())}
        </Text>
      </Page>
    </Document>
  )
}
