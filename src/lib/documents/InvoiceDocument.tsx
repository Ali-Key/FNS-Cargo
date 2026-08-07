import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { InvoiceDocumentData, InvoiceStatus, PaymentMethod } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  Draft: 'Draft',
  Issued: 'Pending Payment',
  'Partially Paid': 'Partially Paid',
  Paid: 'Paid',
  Void: 'Void',
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  Draft: PDF_COLORS.steel500,
  Issued: PDF_COLORS.statusInfo,
  'Partially Paid': PDF_COLORS.statusInfo,
  Paid: PDF_COLORS.statusDelivered,
  Void: PDF_COLORS.steel500,
}

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9, color: PDF_COLORS.steel700, fontFamily: 'Helvetica' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  title: { fontSize: 20, fontWeight: 700, color: PDF_COLORS.navy900, letterSpacing: 1 },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 3,
  },
  statusPillText: { fontSize: 7.5, fontWeight: 700, color: PDF_COLORS.white, textTransform: 'uppercase' },
  metaLabel: { fontSize: 8, color: PDF_COLORS.steel500, textAlign: 'right' },
  metaValue: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900, textAlign: 'right', marginBottom: 6 },
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  block: { width: '48%' },
  blockLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, marginBottom: 4, textTransform: 'uppercase' },
  blockLine: { fontSize: 9.5, color: PDF_COLORS.steel700, marginBottom: 2 },
  blockName: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, marginBottom: 2 },
  blockTagline: { fontSize: 8.5, color: PDF_COLORS.steel500 },
  shipmentBox: {
    borderWidth: 1,
    borderColor: PDF_COLORS.steel200,
    borderRadius: 4,
    marginBottom: 20,
  },
  shipmentBoxLabel: {
    fontSize: 8,
    fontWeight: 700,
    color: PDF_COLORS.steel500,
    textTransform: 'uppercase',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  shipmentGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, paddingTop: 6 },
  shipmentCell: { width: '33.33%', marginTop: 6 },
  shipmentCellLabel: { fontSize: 7.5, color: PDF_COLORS.steel500, marginBottom: 2 },
  shipmentCellValue: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900 },
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
  colDesc: { width: '32%' },
  colPieces: { width: '10%', textAlign: 'right' },
  colWeight: { width: '18%', textAlign: 'right' },
  colRate: { width: '18%', textAlign: 'right' },
  colAmount: { width: '22%', textAlign: 'right' },
  summary: { alignSelf: 'flex-end', width: '45%', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  summaryLabel: { fontSize: 9.5, color: PDF_COLORS.steel500 },
  summaryValue: { fontSize: 9.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.navy700,
    marginTop: 2,
  },
  balanceLabel: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 15, fontWeight: 700, color: PDF_COLORS.navy900 },
  notes: { marginTop: 4 },
  notesLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, marginBottom: 4, textTransform: 'uppercase' },
  notesText: { fontSize: 9, color: PDF_COLORS.steel700, lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 28,
    left: 32,
    right: 32,
    textAlign: 'center',
  },
  footerThanks: { fontSize: 8.5, fontWeight: 700, color: PDF_COLORS.navy800, marginBottom: 2 },
  footerContact: { fontSize: 7.5, color: PDF_COLORS.steel500 },
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, marginBottom: 12 },
  signatureBlock: { width: '45%' },
  signatureLine: { borderTopWidth: 1, borderTopColor: PDF_COLORS.steel200, paddingTop: 4 },
  signatureLabel: { fontSize: 7.5, color: PDF_COLORS.steel500, textTransform: 'uppercase' },
  signatureName: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900, marginBottom: 2 },
  paidStamp: {
    position: 'absolute',
    top: 140,
    left: 140,
    fontSize: 46,
    fontWeight: 700,
    color: PDF_COLORS.statusDelivered,
    opacity: 0.25,
    transform: 'rotate(-18deg)',
    letterSpacing: 4,
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
  const contactLine = [company.company_phone, company.company_email, company.company_website]
    .filter(Boolean)
    .join('  ·  ')

  return (
    <Document title={`Invoice ${invoice.invoice_number}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader company={company} />

        {invoice.status === 'Paid' && <Text style={styles.paidStamp}>PAID</Text>}

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>INVOICE</Text>
            <View style={[styles.statusPill, { backgroundColor: STATUS_COLOR[invoice.status] }]}>
              <Text style={styles.statusPillText}>{STATUS_LABEL[invoice.status]}</Text>
            </View>
          </View>
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
            <Text style={styles.blockLabel}>From</Text>
            <Text style={styles.blockName}>{company.company_name}</Text>
            <Text style={styles.blockTagline}>Professional cargo &amp; logistics services</Text>
          </View>
          <View style={[styles.block, { alignItems: 'flex-end' }]}>
            <Text style={styles.blockLabel}>Bill to</Text>
            <Text style={[styles.blockName, { textAlign: 'right' }]}>
              {customer?.full_name ?? 'Unknown customer'}
            </Text>
            {customer?.company && <Text style={[styles.blockLine, { textAlign: 'right' }]}>{customer.company}</Text>}
            {customer?.address && <Text style={[styles.blockLine, { textAlign: 'right' }]}>{customer.address}</Text>}
            {customer?.phone && <Text style={[styles.blockLine, { textAlign: 'right' }]}>{customer.phone}</Text>}
            {customer?.email && <Text style={[styles.blockLine, { textAlign: 'right' }]}>{customer.email}</Text>}
          </View>
        </View>

        <View style={styles.shipmentBox}>
          <Text style={styles.shipmentBoxLabel}>Shipment information</Text>
          <View style={styles.shipmentGrid}>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Way bill number</Text>
              <Text style={styles.shipmentCellValue}>{shipment?.tracking_number ?? '—'}</Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Booking contact</Text>
              <Text style={styles.shipmentCellValue}>{shipment?.booking_contact ?? '—'}</Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Origin</Text>
              <Text style={styles.shipmentCellValue}>{shipment?.origin ?? '—'}</Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Destination</Text>
              <Text style={styles.shipmentCellValue}>{shipment?.destination ?? '—'}</Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Shipping method</Text>
              <Text style={styles.shipmentCellValue}>{shipment?.shipping_method ?? '—'}</Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Weight</Text>
              <Text style={styles.shipmentCellValue}>
                {shipment?.weight != null ? `${shipment.weight} kg` : '—'}
              </Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Price per kg</Text>
              <Text style={styles.shipmentCellValue}>
                {shipment?.price_per_kg != null ? formatCurrency(shipment.price_per_kg, 2) : '—'}
              </Text>
            </View>
            <View style={styles.shipmentCell}>
              <Text style={styles.shipmentCellLabel}>Shipment date</Text>
              <Text style={styles.shipmentCellValue}>
                {shipment?.created_at ? formatDate(shipment.created_at) : '—'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.tableHeadCell, styles.colPieces]}>Pcs</Text>
            <Text style={[styles.tableHeadCell, styles.colWeight]}>Weight</Text>
            <Text style={[styles.tableHeadCell, styles.colRate]}>Price / kg</Text>
            <Text style={[styles.tableHeadCell, styles.colAmount]}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colDesc]}>
              {shipment?.cargo_type ?? 'Cargo'} shipment — {shipment?.tracking_number ?? 'N/A'}
            </Text>
            <Text style={[styles.tableCell, styles.colPieces]}>{shipment?.pieces ?? '—'}</Text>
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
            <Text style={styles.summaryLabel}>Invoice amount</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.amount, 2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>VAT</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.vat_amount, 2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount</Text>
            <Text style={styles.summaryValue}>-{formatCurrency(invoice.discount, 2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount paid</Text>
            <Text style={styles.summaryValue}>{formatCurrency(invoice.amount_paid, 2)}</Text>
          </View>
          {lastPaymentMethod && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment method</Text>
              <Text style={styles.summaryValue}>{lastPaymentMethod}</Text>
            </View>
          )}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Total due</Text>
            <Text style={styles.balanceValue}>{formatCurrency(invoice.balance, 2)}</Text>
          </View>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{invoice.issuer?.full_name ?? ''}</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Cashier signature</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}> </Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Receiver signature</Text>
            </View>
          </View>
        </View>

        {invoice.notes && (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesText}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerThanks}>Thank you for choosing {company.company_name}.</Text>
          {contactLine && <Text style={styles.footerContact}>{contactLine}</Text>}
        </View>
      </Page>
    </Document>
  )
}
