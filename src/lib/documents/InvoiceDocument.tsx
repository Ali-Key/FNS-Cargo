import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { InvoiceDocumentData, InvoiceStatus, PaymentMethod } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate, formatTime } from '@/utils/date'
import { deriveVatRatePercent, invoiceSubtotal } from '@/utils/vat'

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
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
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
  twoCol: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  block: { width: '48%' },
  blockLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, marginBottom: 4, textTransform: 'uppercase' },
  blockLine: { fontSize: 9.5, color: PDF_COLORS.steel700, marginBottom: 2 },
  blockName: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, marginBottom: 2 },
  blockTagline: { fontSize: 8.5, color: PDF_COLORS.steel500 },

  // Dense grid table — mirrors the printed waybill/invoice's flat 3-column layout
  // (FLT / Way Bill No / Name, Date / Booking Contact / Pcs, ...) rather than the
  // airy card+sidebar layout a generic SaaS invoice would use.
  grid: {
    borderWidth: 1,
    borderColor: PDF_COLORS.navy700,
    marginBottom: 4,
  },
  gridRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: PDF_COLORS.steel200 },
  gridRowLast: { borderBottomWidth: 0 },
  gridCell: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: PDF_COLORS.steel200,
  },
  gridCellLast: { borderRightWidth: 0 },
  gridCellWide: { flex: 2 },
  gridLabel: { fontSize: 6.5, fontWeight: 700, color: PDF_COLORS.steel500, textTransform: 'uppercase', letterSpacing: 0.3 },
  gridValue: { fontSize: 10, fontWeight: 700, color: PDF_COLORS.navy900, marginTop: 2 },
  gridValueLg: { fontSize: 13, fontWeight: 700, color: PDF_COLORS.navy900, marginTop: 2 },

  totalsHead: { backgroundColor: PDF_COLORS.navy700 },
  totalsHeadLabel: { fontSize: 6.5, fontWeight: 700, color: PDF_COLORS.white, textTransform: 'uppercase', letterSpacing: 0.3 },
  totalsHeadValue: { fontSize: 10, fontWeight: 700, color: PDF_COLORS.white, marginTop: 2 },

  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: PDF_COLORS.steel50,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: PDF_COLORS.navy700,
    marginBottom: 18,
  },
  balanceLabel: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceValue: { fontSize: 16, fontWeight: 700, color: PDF_COLORS.navy900 },

  notes: { marginTop: 4, marginBottom: 12 },
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
  signatureRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, marginBottom: 12 },
  signatureBlock: { width: '45%' },
  signatureImage: { height: 34, marginBottom: 2, objectFit: 'contain' },
  signatureLine: { borderTopWidth: 1, borderTopColor: PDF_COLORS.steel200, paddingTop: 4 },
  signatureLabel: { fontSize: 7.5, color: PDF_COLORS.steel500, textTransform: 'uppercase' },
  signatureName: { fontSize: 9, fontWeight: 700, color: PDF_COLORS.navy900, marginBottom: 2 },
  signatureTimestamp: { fontSize: 7, color: PDF_COLORS.steel500, marginTop: 1 },
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
  /** Signed URL for the captured receiver signature image, if the invoice has been signed. */
  receiverSignatureUrl?: string | null
}

export function InvoiceDocument({ invoice, company, lastPaymentMethod, receiverSignatureUrl }: InvoiceDocumentProps) {
  const shipment = invoice.shipment
  const customer = invoice.customer
  const contactLine = [company.company_phone, company.company_email, company.company_website]
    .filter(Boolean)
    .join('  ·  ')
  // `amount` is already the net payable total; the pre-VAT charge is derived back out of it.
  const subtotal = invoiceSubtotal(invoice)
  const vatRatePercent = deriveVatRatePercent(invoice)

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
            <Text style={styles.metaLabel}>Invoice no #</Text>
            <Text style={styles.metaValue}>{invoice.invoice_number}</Text>
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

        {/* Row 1: FLT / Way Bill No / Name */}
        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>FLT</Text>
              <Text style={styles.gridValue}>{shipment?.flight_number ?? '—'}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Way Bill No</Text>
              <Text style={styles.gridValueLg}>{shipment?.tracking_number ?? '—'}</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellLast, styles.gridCellWide]}>
              <Text style={styles.gridLabel}>Name</Text>
              <Text style={styles.gridValue}>{customer?.full_name ?? 'Unknown customer'}</Text>
            </View>
          </View>

          {/* Row 2: Date / Booking Contact No / Pcs */}
          <View style={styles.gridRow}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Date</Text>
              <Text style={styles.gridValue}>{formatDate(invoice.issued_at)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Booking Contact No</Text>
              <Text style={styles.gridValue}>{shipment?.booking_contact ?? '—'}</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellLast, styles.gridCellWide]}>
              <Text style={styles.gridLabel}>Pcs</Text>
              <Text style={styles.gridValue}>{shipment?.pieces ?? '—'}</Text>
            </View>
          </View>

          {/* Row 3: Time / Rate / Kg */}
          <View style={[styles.gridRow, styles.gridRowLast]}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Time</Text>
              <Text style={styles.gridValue}>{formatTime(shipment?.created_at)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Rate</Text>
              <Text style={styles.gridValue}>
                {shipment?.price_per_kg != null ? formatCurrency(shipment.price_per_kg, 2) : '—'}
              </Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellLast, styles.gridCellWide]}>
              <Text style={styles.gridLabel}>Kg</Text>
              <Text style={styles.gridValue}>{shipment?.weight != null ? `${shipment.weight}` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Totals grid: Total USD / VAT / Discount, then VAT $ / Total amount / Paid */}
        <View style={styles.grid}>
          <View style={[styles.gridRow, styles.totalsHead]}>
            <View style={styles.gridCell}>
              <Text style={styles.totalsHeadLabel}>Total USD</Text>
              <Text style={styles.totalsHeadValue}>{formatCurrency(subtotal, 2)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.totalsHeadLabel}>VAT ({vatRatePercent}%)</Text>
              <Text style={styles.totalsHeadValue}>{formatCurrency(invoice.vat_amount, 2)}</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellLast]}>
              <Text style={styles.totalsHeadLabel}>Discount</Text>
              <Text style={styles.totalsHeadValue}>-{formatCurrency(invoice.discount, 2)}</Text>
            </View>
          </View>
          <View style={[styles.gridRow, styles.gridRowLast]}>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Total Amount USD</Text>
              <Text style={styles.gridValue}>{formatCurrency(invoice.amount, 2)}</Text>
            </View>
            <View style={styles.gridCell}>
              <Text style={styles.gridLabel}>Paid USD</Text>
              <Text style={styles.gridValue}>{formatCurrency(invoice.amount_paid, 2)}</Text>
            </View>
            <View style={[styles.gridCell, styles.gridCellLast]}>
              <Text style={styles.gridLabel}>Payment method</Text>
              <Text style={styles.gridValue}>{lastPaymentMethod ?? '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Balance due</Text>
          <Text style={styles.balanceValue}>{formatCurrency(invoice.balance, 2)}</Text>
        </View>

        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <Text style={styles.signatureName}>{invoice.issuer?.full_name ?? ''}</Text>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Cashier sign</Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            {receiverSignatureUrl && <Image src={receiverSignatureUrl} style={styles.signatureImage} />}
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>Receiver sign</Text>
              {invoice.receiver_signed_at && (
                <Text style={styles.signatureTimestamp}>Signed {formatDate(invoice.receiver_signed_at)}</Text>
              )}
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
