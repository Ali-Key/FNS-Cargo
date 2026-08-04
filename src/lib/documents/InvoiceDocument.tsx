import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { InvoiceDocumentData, PaymentMethod } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: PDF_COLORS.steel700, fontFamily: 'Helvetica' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: 700, color: PDF_COLORS.navy900, letterSpacing: 1 },
  metaLabel: { fontSize: 8, color: PDF_COLORS.steel500, textAlign: 'right' },
  metaValue: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900, textAlign: 'right', marginBottom: 6 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  block: { width: '48%' },
  blockLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, marginBottom: 4, textTransform: 'uppercase' },
  blockLine: { fontSize: 9.5, color: PDF_COLORS.steel700, marginBottom: 2 },
  blockName: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, marginBottom: 2 },
  table: { marginBottom: 20 },
  tableHeadRow: { flexDirection: 'row', backgroundColor: PDF_COLORS.navy700, paddingVertical: 6, paddingHorizontal: 8 },
  tableHeadCell: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.white, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.steel100,
  },
  tableCell: { fontSize: 9.5, color: PDF_COLORS.steel700 },
  colDesc: { width: '40%' },
  colWeight: { width: '20%', textAlign: 'right' },
  colRate: { width: '20%', textAlign: 'right' },
  colAmount: { width: '20%', textAlign: 'right' },
  summary: { alignSelf: 'flex-end', width: '45%', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 9.5, color: PDF_COLORS.steel500 },
  summaryValue: { fontSize: 9.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.navy700,
    marginTop: 2,
  },
  balanceLabel: { fontSize: 10.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  balanceValue: { fontSize: 10.5, fontWeight: 700, color: PDF_COLORS.primary500 },
  notes: { marginTop: 4 },
  notesLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 9, color: PDF_COLORS.steel700, lineHeight: 1.5 },
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

export interface InvoiceDocumentProps {
  invoice: InvoiceDocumentData
  company: DocumentCompanyInfo
  /** Method of the most recent payment recorded against this invoice, if any. */
  lastPaymentMethod?: PaymentMethod | null
}

export function InvoiceDocument({ invoice, company, lastPaymentMethod }: InvoiceDocumentProps) {
  const shipment = invoice.shipment
  const customer = invoice.customer

  return (
    <Document title={`Invoice ${invoice.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader company={company} />

        <View style={styles.titleRow}>
          <Text style={styles.title}>INVOICE</Text>
          <View>
            <Text style={styles.metaLabel}>Invoice number</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
            <Text style={styles.metaLabel}>Date issued</Text>
            <Text style={styles.metaValue}>{formatDate(invoice.issued_at)}</Text>
            {invoice.due_date && (
              <>
                <Text style={styles.metaLabel}>Due date</Text>
                <Text style={styles.metaValue}>{formatDate(invoice.due_date)}</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.block}>
            <Text style={styles.blockLabel}>Bill to</Text>
            <Text style={styles.blockName}>{customer?.full_name ?? 'Unknown customer'}</Text>
            {customer?.company && <Text style={styles.blockLine}>{customer.company}</Text>}
            {customer?.address && <Text style={styles.blockLine}>{customer.address}</Text>}
            {customer?.phone && <Text style={styles.blockLine}>{customer.phone}</Text>}
            {customer?.email && <Text style={styles.blockLine}>{customer.email}</Text>}
          </View>
          <View style={[styles.block, { alignItems: 'flex-end' }]}>
            <Text style={styles.blockLabel}>Shipment</Text>
            <Text style={[styles.blockLine, { textAlign: 'right' }]}>
              Tracking # {shipment?.tracking_number ?? '—'}
            </Text>
            <Text style={[styles.blockLine, { textAlign: 'right' }]}>
              {shipment ? `${shipment.origin} → ${shipment.destination}` : '—'}
            </Text>
            <Text style={[styles.blockLine, { textAlign: 'right' }]}>{shipment?.shipping_method ?? '—'}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeadCell, styles.colWeight]}>Weight</Text>
            <Text style={[styles.tableHeadCell, styles.colRate]}>Price / kg</Text>
            <Text style={[styles.tableHeadCell, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDesc]}>
              {shipment?.cargo_type ?? 'Cargo'} shipment — {shipment?.tracking_number ?? 'N/A'}
            </Text>
            <Text style={[styles.tableCell, styles.colWeight]}>
              {shipment?.weight != null ? `${shipment.weight} kg` : '—'}
            </Text>
            <Text style={[styles.tableCell, styles.colRate]}>
              {shipment?.price_per_kg != null ? formatCurrency(shipment.price_per_kg, 2) : '—'}
            </Text>
            <Text style={[styles.tableCell, styles.colAmount]}>{formatCurrency(invoice.amount, 2)}</Text>
          </View>
        </View>

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.amount, 2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.amount_paid, 2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Status</Text>
            <Text style={styles.summaryValue}>{invoice.status}</Text>
          </View>
          {lastPaymentMethod && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment method</Text>
              <Text style={styles.summaryValue}>{lastPaymentMethod}</Text>
            </View>
          )}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Balance due</Text>
            <Text style={styles.balanceValue}>{formatCurrency(invoice.balance, 2)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          {company.company_name} · Thank you for your business.
        </Text>
      </Page>
    </Document>
  )
}
