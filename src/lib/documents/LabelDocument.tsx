import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import { PDF_COLORS } from './theme'
import { generateBarcodeDataUrl } from './barcode'
import type { LabelDocumentData } from '@/types'

// 1pt = 1/72in. 100x150mm thermal label vs. A6 (105x148mm) — close but not
// identical, so both are offered as distinct physical page sizes.
const PAGE_SIZE: Record<LabelSize, [number, number]> = {
  '100x150': [283.46, 425.2],
  A6: [297.64, 419.53],
}

export type LabelSize = '100x150' | 'A6'

const styles = StyleSheet.create({
  page: { padding: 16, fontFamily: 'Helvetica' },
  companyName: { fontSize: 15, fontWeight: 700, color: PDF_COLORS.navy900, textAlign: 'center' },
  tagline: { fontSize: 8, color: PDF_COLORS.steel500, textAlign: 'center', marginTop: 2 },
  rule: { borderBottomWidth: 1.5, borderBottomColor: PDF_COLORS.navy700, marginTop: 8, marginBottom: 10 },
  waybillLabel: { fontSize: 8, fontWeight: 700, color: PDF_COLORS.steel500, textAlign: 'center', textTransform: 'uppercase' },
  barcode: { width: '100%', height: 64, marginTop: 6, marginBottom: 4 },
  waybillNumber: { fontSize: 13, fontWeight: 700, color: PDF_COLORS.navy900, textAlign: 'center', letterSpacing: 1 },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.steel200,
  },
  fieldLabel: { fontSize: 8.5, fontWeight: 700, color: PDF_COLORS.steel500, textTransform: 'uppercase' },
  fieldValue: { fontSize: 10.5, fontWeight: 700, color: PDF_COLORS.navy900 },
  footer: { marginTop: 14, textAlign: 'center' },
  footerBranch: { fontSize: 8, color: PDF_COLORS.steel500 },
  footerWebsite: { fontSize: 8, color: PDF_COLORS.steel500, marginTop: 1 },
})

export interface LabelDocumentProps {
  shipment: LabelDocumentData
  companyName: string
  companyWebsite?: string | null
  size?: LabelSize
}

/** Thermal-printer-friendly waybill label — one page per shipment. */
export function LabelDocument({ shipment, companyName, companyWebsite, size = '100x150' }: LabelDocumentProps) {
  const barcodeUrl = generateBarcodeDataUrl(shipment.tracking_number)

  return (
    <Document title={`Waybill ${shipment.tracking_number}`}>
      <Page size={PAGE_SIZE[size]} style={styles.page}>
        <Text style={styles.companyName}>{companyName}</Text>
        <Text style={styles.tagline}>Reliable shipping partner</Text>
        <View style={styles.rule} />

        <Text style={styles.waybillLabel}>Way bill no</Text>
        <Image src={barcodeUrl} style={styles.barcode} />
        <Text style={styles.waybillNumber}>{shipment.tracking_number}</Text>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Origin</Text>
          <Text style={styles.fieldValue}>{shipment.origin}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>Destination</Text>
          <Text style={styles.fieldValue}>{shipment.destination}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>CN no</Text>
          <Text style={styles.fieldValue}>{shipment.cn_number ?? '—'}</Text>
        </View>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>No of pcs</Text>
          <Text style={styles.fieldValue}>{shipment.pieces}</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerBranch}>Branch: {shipment.branch_code ?? '—'}</Text>
          {companyWebsite && <Text style={styles.footerWebsite}>{companyWebsite}</Text>}
        </View>
      </Page>
    </Document>
  )
}
