import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { PaymentReceiptData } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: PDF_COLORS.steel700, fontFamily: 'Helvetica' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: PDF_COLORS.navy900, letterSpacing: 1 },
  metaLabel: { fontSize: 8, color: PDF_COLORS.steel500, textAlign: 'right' },
  metaValue: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900, textAlign: 'right', marginBottom: 6 },
  amountBlock: {
    alignItems: 'center',
    backgroundColor: PDF_COLORS.steel50,
    borderRadius: 8,
    paddingVertical: 24,
    marginBottom: 20,
  },
  amountLabel: { fontSize: 9, color: PDF_COLORS.steel500, textTransform: 'uppercase', marginBottom: 4 },
  amountValue: { fontSize: 28, fontWeight: 700, color: PDF_COLORS.statusDelivered },
  rows: { marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.steel100,
  },
  rowLabel: { fontSize: 9.5, color: PDF_COLORS.steel500 },
  rowValue: { fontSize: 9.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 8,
    color: PDF_COLORS.steel500,
  },
})

export interface ReceiptDocumentProps {
  payment: PaymentReceiptData
  company: DocumentCompanyInfo
}

export function ReceiptDocument({ payment, company }: ReceiptDocumentProps) {
  const invoice = payment.invoice

  return (
    <Document title={`Receipt ${payment.id}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader company={company} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>PAYMENT RECEIPT</Text>
          <View>
            <Text style={styles.metaLabel}>Receipt date</Text>
            <Text style={styles.metaValue}>{formatDate(payment.paid_at)}</Text>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={styles.metaValue}>{invoice?.invoice_number ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.amountBlock}>
          <Text style={styles.amountLabel}>Amount received</Text>
          <Text style={styles.amountValue}>{formatCurrency(payment.amount, 2)}</Text>
        </View>

        <View style={styles.rows}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Received from</Text>
            <Text style={styles.rowValue}>{invoice?.customer?.full_name ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Shipment</Text>
            <Text style={styles.rowValue}>{invoice?.shipment?.tracking_number ?? '—'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Payment method</Text>
            <Text style={styles.rowValue}>{payment.method}</Text>
          </View>
          {payment.reference && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Reference</Text>
              <Text style={styles.rowValue}>{payment.reference}</Text>
            </View>
          )}
          {payment.notes && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Notes</Text>
              <Text style={styles.rowValue}>{payment.notes}</Text>
            </View>
          )}
        </View>

        <Text style={styles.footer}>{company.company_name} · This receipt confirms funds received.</Text>
      </Page>
    </Document>
  )
}
