import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'
import { DocumentHeader, type DocumentCompanyInfo } from './DocumentHeader'
import { PDF_COLORS } from './theme'
import type { Customer, InvoiceWithRelations, ShipmentWithCustomer } from '@/types'
import { formatCurrency } from '@/utils/format'
import { formatDate } from '@/utils/date'

const styles = StyleSheet.create({
  page: { padding: 32, paddingBottom: 48, fontSize: 8.5, color: PDF_COLORS.steel700, fontFamily: 'Helvetica' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 700, color: PDF_COLORS.navy900 },
  customerName: { fontSize: 11, fontWeight: 700, color: PDF_COLORS.navy900, marginTop: 2 },
  customerLine: { fontSize: 8.5, color: PDF_COLORS.steel500, marginTop: 1 },
  generated: { fontSize: 7.5, color: PDF_COLORS.steel500, textAlign: 'right' },
  sectionLabel: {
    fontSize: 9,
    fontWeight: 700,
    color: PDF_COLORS.navy800,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 6,
  },
  headRow: { flexDirection: 'row', backgroundColor: PDF_COLORS.steel100, paddingVertical: 5, paddingHorizontal: 6 },
  headCell: { fontSize: 7, fontWeight: 700, color: PDF_COLORS.steel700, textTransform: 'uppercase' },
  row: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: PDF_COLORS.steel200,
  },
  cell: { fontSize: 8 },
  colWide: { width: '30%' },
  colMed: { width: '20%' },
  colNum: { width: '15%', textAlign: 'right' },
  totals: {
    marginTop: 14,
    alignSelf: 'flex-end',
    width: '50%',
    borderTopWidth: 1.5,
    borderTopColor: PDF_COLORS.navy700,
    paddingTop: 8,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { fontSize: 8.5, color: PDF_COLORS.steel500 },
  totalValue: { fontSize: 8.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  balanceValue: { fontSize: 10, fontWeight: 700, color: PDF_COLORS.primary500 },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 32,
    right: 32,
    textAlign: 'center',
    fontSize: 7.5,
    color: PDF_COLORS.steel500,
  },
  empty: { fontSize: 8.5, color: PDF_COLORS.steel500, paddingVertical: 6 },
})

export interface CustomerStatementDocumentProps {
  customer: Customer
  shipments: ShipmentWithCustomer[]
  invoices: InvoiceWithRelations[]
  company: DocumentCompanyInfo
}

export function CustomerStatementDocument({
  customer,
  shipments,
  invoices,
  company,
}: CustomerStatementDocumentProps) {
  const totalInvoiced = invoices.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  const totalPaid = invoices.reduce((sum, i) => sum + (i.amount_paid ?? 0), 0)
  const totalBalance = invoices.reduce((sum, i) => sum + (i.balance ?? 0), 0)

  return (
    <Document title={`Statement — ${customer.full_name}`}>
      <Page size="A4" style={styles.page}>
        <DocumentHeader company={company} />

        <View style={styles.titleRow}>
          <View>
            <Text style={styles.title}>Customer statement</Text>
            <Text style={styles.customerName}>{customer.full_name}</Text>
            {customer.company && <Text style={styles.customerLine}>{customer.company}</Text>}
            {customer.email && <Text style={styles.customerLine}>{customer.email}</Text>}
            {customer.phone && <Text style={styles.customerLine}>{customer.phone}</Text>}
          </View>
          <Text style={styles.generated}>Generated {formatDate(new Date())}</Text>
        </View>

        <Text style={styles.sectionLabel}>Shipment history ({shipments.length})</Text>
        {shipments.length === 0 ? (
          <Text style={styles.empty}>No shipments on record.</Text>
        ) : (
          <>
            <View style={styles.headRow}>
              <Text style={[styles.headCell, styles.colMed]}>Tracking #</Text>
              <Text style={[styles.headCell, styles.colMed]}>Date</Text>
              <Text style={[styles.headCell, styles.colWide]}>Route</Text>
              <Text style={[styles.headCell, styles.colMed]}>Status</Text>
              <Text style={[styles.headCell, styles.colNum]}>Value</Text>
            </View>
            {shipments.map((s) => (
              <View key={s.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.colMed]}>{s.tracking_number}</Text>
                <Text style={[styles.cell, styles.colMed]}>{formatDate(s.created_at)}</Text>
                <Text style={[styles.cell, styles.colWide]}>
                  {s.origin} → {s.destination}
                </Text>
                <Text style={[styles.cell, styles.colMed]}>{s.status}</Text>
                <Text style={[styles.cell, styles.colNum]}>{formatCurrency(s.total_price, 2)}</Text>
              </View>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>Invoices &amp; payments ({invoices.length})</Text>
        {invoices.length === 0 ? (
          <Text style={styles.empty}>No invoices on record.</Text>
        ) : (
          <>
            <View style={styles.headRow}>
              <Text style={[styles.headCell, styles.colMed]}>Invoice #</Text>
              <Text style={[styles.headCell, styles.colMed]}>Issued</Text>
              <Text style={[styles.headCell, styles.colNum]}>Amount</Text>
              <Text style={[styles.headCell, styles.colNum]}>Paid</Text>
              <Text style={[styles.headCell, styles.colNum]}>Balance</Text>
              <Text style={[styles.headCell, styles.colMed]}>Status</Text>
            </View>
            {invoices.map((inv) => (
              <View key={inv.id} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.colMed]}>{inv.invoice_number}</Text>
                <Text style={[styles.cell, styles.colMed]}>{formatDate(inv.issued_at)}</Text>
                <Text style={[styles.cell, styles.colNum]}>{formatCurrency(inv.amount, 2)}</Text>
                <Text style={[styles.cell, styles.colNum]}>{formatCurrency(inv.amount_paid, 2)}</Text>
                <Text style={[styles.cell, styles.colNum]}>{formatCurrency(inv.balance, 2)}</Text>
                <Text style={[styles.cell, styles.colMed]}>{inv.status}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total invoiced</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalInvoiced, 2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total paid</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPaid, 2)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Balance due</Text>
            <Text style={styles.balanceValue}>{formatCurrency(totalBalance, 2)}</Text>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          {company.company_name} · This statement reflects invoiced and paid amounts, not shipment list price.
        </Text>
      </Page>
    </Document>
  )
}
